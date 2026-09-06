// Supabase Edge Function: generate-ai-analysis
// Model: gemini-2.5-flash
// Features:
//   - NHL Scout scouting report: stats, height/weight, teams, achievements, videos
//   - Google Search grounding for real external info
//   - Rate limit: 5 times per player per calendar month
//   - Translation caching

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_MONTHLY_USES = 5;
// Comma-separated player IDs that bypass the monthly limit (for testing/admin)
const BYPASS_LIMIT_IDS = (Deno.env.get("BYPASS_LIMIT_PLAYER_IDS") || "").split(",").map(s => s.trim()).filter(Boolean);
// gemini-2.5-flash: stable quota, supports Video + Search Grounding
const GEMINI_MODEL = "gemini-2.5-flash";

const LANG_NAMES: Record<string, string> = {
  en: "English", ru: "Russian", de: "German", fr: "French", it: "Italian",
  pl: "Polish", sv: "Swedish", cs: "Czech", sk: "Slovak", fi: "Finnish",
  lv: "Latvian", lt: "Lithuanian",
};

interface PlayerData {
  id: string;
  name: string;
  position?: string;
  status?: string;
  country?: string;
  birth_date?: string;
  height?: number;
  weight?: number;
  grip?: string;
  team?: string;
  goals?: number;
  assists?: number;
  games?: number;
  minutes?: number;
  shots?: number;
  saves?: number;
  /** Archived seasons: { "25/26": { goals, assists, games, minutes, shots, saves } } */
  season_stats?: string | Record<string, Record<string, unknown>> | null;
  hockey_start_date?: string;
  city?: string;
  number?: string;
  achievements?: string;
  game_videos?: string;
  pull_ups?: number;
  push_ups?: number;
  plank_time?: number;
  sprint_100m?: number;
  long_jump?: number;
  jump_rope?: number;
  puck_speed_data?: string;
  exercise_stats?: string | Record<string, unknown>;
  teamsList?: { name: string; startYear?: number; endYear?: number; isCurrent?: boolean }[];
}

interface CompletedExercise {
  id: string;
  name: string;
  count: number;
}

function isValidNormValue(value: unknown): value is number {
  if (value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function parseExerciseCompletions(raw?: string | Record<string, unknown>): { id: string; count: number }[] {
  if (!raw) return [];
  try {
    const stats = typeof raw === "string" ? JSON.parse(raw) : raw;
    const completions = stats?.completions;
    if (!completions) return [];
    if (Array.isArray(completions)) {
      return completions
        .map((c: { exerciseId?: string; count?: number }) => ({
          id: String(c?.exerciseId || ""),
          count: Number(c?.count) || 1,
        }))
        .filter((c) => c.id);
    }
    if (typeof completions === "object") {
      return Object.entries(completions as Record<string, number>)
        .map(([id, count]) => ({ id, count: Number(count) || 1 }))
        .filter((c) => c.id);
    }
    return [];
  } catch {
    return [];
  }
}

async function resolveCompletedExercises(
  supabase: ReturnType<typeof createClient>,
  raw?: string | Record<string, unknown>,
  language = "en"
): Promise<CompletedExercise[]> {
  const parsed = parseExerciseCompletions(raw);
  if (parsed.length === 0) return [];

  const ids = parsed.map((p) => p.id);
  const { data } = await supabase
    .from("exercises")
    .select("exercise_id, title_en, title_ru")
    .in("exercise_id", ids);

  const titleById = new Map<string, string>();
  for (const row of data || []) {
    const title = language === "ru" ? row.title_ru || row.title_en : row.title_en || row.title_ru;
    titleById.set(row.exercise_id, title || row.exercise_id);
  }

  return parsed
    .map((p) => ({
      id: p.id,
      name: titleById.get(p.id) || p.id,
      count: p.count,
    }))
    .sort((a, b) => b.count - a.count);
}

function positionLabel(position?: string): string {
  const positionMap: Record<string, string> = {
    goalie: "Goaltender",
    center: "Center",
    winger: "Winger / Forward",
    defender: "Defenseman",
  };
  return positionMap[position || ""] || position || "Unknown";
}

function positionAnalysisFocus(position?: string): string {
  switch (position) {
    case "goalie":
      return `POSITION FOCUS (Goaltender — prioritize these over skating clichés):
- Stance, depth, angle cuts, post-to-post movement, puck tracking through traffic
- Rebound control direction, freeze vs play decisions, handling behind the net / trapezoid
- Breakaway reads, screen traffic management, communication on odd-man rushes
- Do NOT recommend generic forward/defense skating drills unless tied to goalie-specific movement`;
    case "defender":
      return `POSITION FOCUS (Defenseman):
- Gap control, angling on rushes, 1-on-1 / 2-on-1 decisions, slot and net-front coverage
- Breakouts under forecheck, first pass quality, rim vs up-the-middle choices
- Point shooting/lane usage on PP, PK box structure, shot blocking timing
- Do NOT default to "more knee bend" unless video shows upright posture or stats imply poor agility`;
    case "center":
      return `POSITION FOCUS (Center):
- Faceoffs, low support, cycle/link play, defensive responsibility through the middle
- Transition passing, backcheck routes, slot timing on PP, PK center reads
- Link between wings — give specific route/positioning fixes from video`;
    case "winger":
      return `POSITION FOCUS (Winger):
- Wide entries, cut-backs, net-front timing, board battles, off-puck routes
- Shot release on the move, forecheck pressure angles, backcheck to weak side
- Do NOT copy center/defense advice unless observed in video for this player`;
    default:
      return `POSITION FOCUS: Tailor every technical point to the player's listed position and what appears in video/stats.`;
  }
}

function buildTextPrompt(
  player: PlayerData,
  videoUrls: string[],
  language = "en",
  completedExercises: CompletedExercise[] = []
): string {
  const now = new Date();
  const age = player.birth_date
    ? Math.floor((now.getTime() - new Date(player.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null;

  const experienceYears = player.hockey_start_date
    ? Math.floor((now.getTime() - new Date(player.hockey_start_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null;

  const positionMap: Record<string, string> = {
    goalie: "Goaltender",
    center: "Center",
    winger: "Winger / Forward",
    defender: "Defenseman",
  };

  const isGoalie = player.position === "goalie";
  const langName = LANG_NAMES[language] || "English";
  const posLabel = positionMap[player.position || ""] || player.position || "Unknown";

  // --- Build player data block ---
  const lines: string[] = [];
  lines.push(`Name: ${player.name}`);
  if (age) lines.push(`Age: ${age}`);
  if (player.position) lines.push(`Position: ${positionMap[player.position] || player.position}`);
  if (player.country) lines.push(`Country: ${player.country}`);
  if (player.city) lines.push(`City: ${player.city}`);
  if (player.number) lines.push(`Jersey #${player.number}`);
  if (player.height) lines.push(`Height: ${player.height} cm`);
  if (player.weight) lines.push(`Weight: ${player.weight} kg`);
  if (player.grip) lines.push(`Grip: ${player.grip}`);
  if (experienceYears !== null) lines.push(`Hockey experience: ${experienceYears} years`);

  const normativeLines: string[] = [];
  if (isValidNormValue(player.pull_ups)) normativeLines.push(`Pull-ups: ${player.pull_ups} reps`);
  if (isValidNormValue(player.push_ups)) normativeLines.push(`Push-ups: ${player.push_ups} reps`);
  if (isValidNormValue(player.plank_time)) normativeLines.push(`Plank hold: ${player.plank_time} sec`);
  if (isValidNormValue(player.sprint_100m)) normativeLines.push(`100m sprint: ${player.sprint_100m} sec`);
  if (isValidNormValue(player.long_jump)) normativeLines.push(`Standing long jump: ${player.long_jump} cm`);
  if (isValidNormValue(player.jump_rope)) normativeLines.push(`Jump rope: ${player.jump_rope} jumps`);
  if (normativeLines.length > 0) {
    lines.push("\nProfile normatives (completed physical tests):");
    for (const line of normativeLines) lines.push(`- ${line}`);
  }

  // Puck speed from the in-app radar mini-game is entertainment, not a measured
  // normative — deliberately excluded from the scouting report.

  if (completedExercises.length > 0) {
    lines.push("\nCompleted training exercises in app (normatives / drills):");
    for (const ex of completedExercises.slice(0, 25)) {
      lines.push(`- ${ex.name}${ex.count > 1 ? ` (×${ex.count})` : ""}`);
    }
    if (completedExercises.length > 25) {
      lines.push(`- …and ${completedExercises.length - 25} more`);
    }
  }

  // Teams — clearly separated current vs past
  if (player.teamsList && player.teamsList.length > 0) {
    const currentTeams = player.teamsList.filter(t => t.isCurrent);
    const pastTeams = player.teamsList.filter(t => !t.isCurrent);
    if (currentTeams.length > 0) {
      lines.push(`\nCurrent team(s): ${currentTeams.map(t => t.name).join(", ")}`);
    }
    if (pastTeams.length > 0) {
      lines.push("Past teams:");
      for (const t of pastTeams) {
        const years = (t.startYear && t.endYear) ? ` (${t.startYear}–${t.endYear})` : t.startYear ? ` (from ${t.startYear})` : "";
        lines.push(`- ${t.name}${years}`);
      }
    }
  } else if (player.team) {
    lines.push(`\nCurrent team: ${player.team}`);
  }

  // Statistics: current season (player columns) + every archived season + career totals.
  // The app ranks players by career totals, so the report must reason about them too.
  type Block = { goals: number; assists: number; games: number; minutes: number; shots: number; saves: number };
  const toBlock = (src: Record<string, unknown> | null | undefined): Block => ({
    goals: Number(src?.goals ?? 0) || 0,
    assists: Number(src?.assists ?? 0) || 0,
    games: Number(src?.games ?? 0) || 0,
    minutes: Number(src?.minutes ?? 0) || 0,
    shots: Number(src?.shots ?? 0) || 0,
    saves: Number(src?.saves ?? 0) || 0,
  });
  const hasData = (b: Block) => Object.values(b).some((v) => v > 0);
  const CURRENT_SEASON = "26/27";
  const current = toBlock(player as unknown as Record<string, unknown>);
  let archived: Record<string, Block> = {};
  try {
    const raw = typeof player.season_stats === "string" ? JSON.parse(player.season_stats) : player.season_stats;
    if (raw && typeof raw === "object") {
      for (const [key, block] of Object.entries(raw as Record<string, Record<string, unknown>>)) {
        if (key === CURRENT_SEASON) continue;
        const b = toBlock(block);
        if (hasData(b)) archived[key] = b;
      }
    }
  } catch { archived = {}; }
  const seasonKeys = Object.keys(archived).sort();
  const total: Block = [current, ...seasonKeys.map((k) => archived[k])].reduce(
    (acc, b) => ({
      goals: acc.goals + b.goals, assists: acc.assists + b.assists, games: acc.games + b.games,
      minutes: acc.minutes + b.minutes, shots: acc.shots + b.shots, saves: acc.saves + b.saves,
    }),
    toBlock(null),
  );
  const describe = (b: Block): string[] => {
    const out: string[] = [];
    if (isGoalie) {
      if (b.games) out.push(`games ${b.games}`);
      if (b.minutes) out.push(`minutes ${b.minutes}`);
      if (b.shots) out.push(`shots against ${b.shots}`);
      if (b.saves) out.push(`saves ${b.saves}`);
      if (b.shots && b.saves) out.push(`SV% ${((b.saves / b.shots) * 100).toFixed(1)}%`);
      if (b.minutes && b.shots) out.push(`GAA ${(((b.shots - b.saves) * 60) / b.minutes).toFixed(2)}`);
    } else {
      if (b.games) out.push(`games ${b.games}`);
      out.push(`goals ${b.goals}`, `assists ${b.assists}`, `points ${b.goals + b.assists}`);
      if (b.games) out.push(`points/game ${((b.goals + b.assists) / b.games).toFixed(2)}`);
    }
    return out;
  };

  lines.push("\nStatistics by season:");
  lines.push(`- Current season ${CURRENT_SEASON}: ${hasData(current) ? describe(current).join(", ") : "no data yet (season just started)"}`);
  for (const key of seasonKeys) {
    lines.push(`- Season ${key}: ${describe(archived[key]).join(", ")}`);
  }
  if (seasonKeys.length > 0) {
    lines.push(`- CAREER TOTAL (${seasonKeys.length + (hasData(current) ? 1 : 0)} seasons): ${describe(total).join(", ")}`);
    lines.push("Base the assessment on the career totals and the trend between seasons; do not treat an empty current season as a lack of experience.");
  }

  // Achievements
  if (player.achievements) {
    try {
      const achList: { competition?: string; year?: number; place?: number; description?: string }[] =
        JSON.parse(player.achievements);
      if (achList.length > 0) {
        lines.push("\nAchievements:");
        for (const a of achList) {
          const place = a.place === 1 ? "🥇 1st" : a.place === 2 ? "🥈 2nd" : a.place === 3 ? "🥉 3rd" : `${a.place}th`;
          lines.push(`- ${place} place — ${a.competition || ""}${a.year ? ` (${a.year})` : ""}${a.description ? `: ${a.description}` : ""}`);
        }
      }
    } catch {}
  }

  // Game video links
  if (videoUrls.length > 0) {
    lines.push("\nGame video links (YouTube):");
    for (const url of videoUrls) {
      lines.push(`- ${url}`);
    }
  }

  const hasVideos = videoUrls.length > 0;
  const hasNormatives = normativeLines.length > 0 || completedExercises.length > 0;
  const positionFocus = positionAnalysisFocus(player.position);

  return `### ROLE
You are a Senior Player Development Scout & Biomechanics Expert for ${posLabel} players. Write a UNIQUE report for THIS player only — never a template.

### CONTEXT
HockeyStars player profile + ${hasVideos ? "game video(s) you MUST watch" : "NO video — rely on stats/normatives only"}.
Player position: ${posLabel}. Every recommendation must fit this position.

${positionFocus}

### EXTERNAL RESEARCH (use Google Search)
Search for "${player.name}"${player.birth_date ? ` (born ${player.birth_date})` : ""}${player.team ? ` "${player.team}"` : ""} hockey. Prioritise scouting-grade sources: Eliteprospects, league/federation statistics portals, tournament protocols and rosters, club pages, hockey media and scouting blogs. Extract only verified facts: past clubs, tournaments, awards, all-star selections, published stats, coach/scout quotes. Cite each such fact as (web: source name). If nothing reliable is found, write one line "No external records found" and do not speculate.${hasVideos ? ` Watch each YouTube link in PLAYER DATA. Track jersey #${player.number || "?"} only.` : ""}

### EVIDENCE RULES (CRITICAL — prevents generic reports)
1. Every strength and every growth zone MUST cite its source in parentheses: (video ~MM:SS), (season stats), (normative: …), or (exercise history: …).
2. FORBIDDEN generic filler unless you observed it in THIS player's video or it follows directly from THEIR stats/normatives:
   - "deeper knee bend", "work on edges", "improve hockey IQ", "train harder", "better positioning" without specifics
3. If NO video: explicitly state "Video not provided" in Biomechanical Analysis and base conclusions on position + season stats + normatives only. Do NOT invent video moments.
4. If video IS provided: include at least 3 concrete observations with approximate timestamps (e.g. 0:42, 1:15).
5. Training Vector drills MUST each address ONE specific growth zone you listed above for THIS player — not a generic youth hockey list.
6. Off-ice exercises must connect to identified weaknesses OR build on strong normatives (e.g. low pull-ups → upper-body; slow sprint → acceleration work; high plank → maintain core).

### ANALYTICAL LENS
${hasVideos
    ? "From video, analyze ONLY what you see for this position: relevant skating (if skater), puck battles, decisions, technique errors in real clips — not a checklist applied to everyone."
    : "Without video, infer likely focus areas from position + production stats + physical normatives — label them as data-based hypotheses, not video facts."}

PLAYER DATA:
${lines.join("\n")}

### CONSTRAINTS
- Write the ENTIRE report in ${langName}.
- No intro fluff ("I present…", "Here is your report…"). Start with ## Technical Passport.
- Professional, constructive tone. No emojis in headers.
- ~1 page. Markdown: ##, **bold**, bullets.
- Do NOT invent facts.${hasNormatives ? " Use normative values to justify off-ice recommendations." : ""}

### STRUCTURE

## Technical Passport
Role on ice for a ${posLabel}; link body metrics${hasNormatives ? ", normatives," : ""} and season production to expected playing style.

## Biomechanical Analysis
- **Strengths:** 2–3 items, each with evidence tag (video/stats/normative).
- **Growth Zones:** 2–3 items, each with evidence tag. Be honest; avoid repeating the same advice you give every player.

## Training Vector
- **On-Ice:** 2–3 drills tied to YOUR growth zones above (position-specific).
- **Off-Ice (GPP/SPP):** 3 exercises chosen from THIS player's normative gaps or strengths${hasNormatives ? " (reference their actual pull-ups/sprint/plank/etc.)" : ""}.

## Hockey IQ & Vision
1–2 situational reads relevant to ${posLabel} and what you saw in video or stats.

## Scout's Verdict
2–3 sentences: level, ceiling, single highest-priority focus unique to this player.`;
}

function extractGeminiText(data: Record<string, unknown>): string {
  const candidate = (data.candidates as Record<string, unknown>[] | undefined)?.[0];
  const partsOut = (candidate?.content as { parts?: Record<string, unknown>[] } | undefined)?.parts || [];
  const text = partsOut
    .filter((p) => typeof p.text === "string" && p.thought !== true)
    .map((p) => p.text as string)
    .join("");
  return text.trim();
}

async function callGemini(
  parts: object[],
  model: string,
  useGoogleSearch = false,
  maxOutputTokens = 2000,
  thinkingBudget = 0,
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const generationConfig: Record<string, unknown> = {
    temperature: 0.35,
    maxOutputTokens,
    topK: 40,
    topP: 0.95,
    // Gemini 2.5 counts thinking tokens against maxOutputTokens — disable for translation
    thinkingConfig: { thinkingBudget },
  };

  const requestBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig,
  };

  // Google Search grounding: Gemini searches the web for real info about the player/team
  if (useGoogleSearch) {
    requestBody.tools = [{ google_search: {} }];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const candidate = (data.candidates as Record<string, unknown>[] | undefined)?.[0];
  const finishReason = candidate?.finishReason as string | undefined;
  const text = extractGeminiText(data);
  if (!text) throw new Error("Gemini returned empty response");
  if (finishReason === "MAX_TOKENS") {
    throw new Error("Response truncated by token limit — try again or shorten the source text");
  }
  return text;
}

function looksLikeCompleteTranslation(sourceText: string, translation: string): boolean {
  if (!sourceText || !translation) return false;
  // Truncated outputs are usually much shorter than the source
  return translation.length >= sourceText.length * 0.75;
}

function parseGameVideos(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v: any) => typeof v === "string" && v.trim());
    return [];
  } catch {
    return [];
  }
}

function isValidYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/.test(url);
}

async function translateAnalysis(text: string, targetLang: string): Promise<string> {
  const langNames: Record<string, string> = {
    en: "English", ru: "Russian", de: "German", fr: "French", it: "Italian",
    es: "Spanish", lt: "Lithuanian", lv: "Latvian", pl: "Polish",
    sv: "Swedish", cs: "Czech", sk: "Slovak", fi: "Finnish",
  };
  const langName = langNames[targetLang] || targetLang;

  const prompt = `Translate the following hockey player scouting report from its original language to ${langName}.
Preserve all markdown formatting (##, **, -, bullets). Keep hockey and biomechanics terminology accurate and natural.
Keep the same professional, constructive, inspiring tone. Do NOT add or remove content.

Text to translate:
${text}`;

  return await callGemini([{ text: prompt }], GEMINI_MODEL, false, 16384, 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body = await req.json();
    const {
      player_id,
      action,
      target_lang,
      language,
      game_videos: gameVideosFromRequest,
      force_retranslate,
    } = body;

    if (!player_id) {
      return new Response(
        JSON.stringify({ error: "player_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current monthly usage
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data: usageRow } = await supabase
      .from("ai_analysis_usage")
      .select("count")
      .eq("player_id", player_id)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    const currentCount = usageRow?.count || 0;

    // ACTION: get_usage
    if (action === "get_usage") {
      return new Response(
        JSON.stringify({ count: currentCount, remaining: MAX_MONTHLY_USES - currentCount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: translate
    if (action === "translate" && target_lang) {
      if (target_lang !== "ru" && target_lang !== "en") {
        return new Response(
          JSON.stringify({ error: "Invalid target_lang (use ru or en)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: playerRow } = await supabase
        .from("players")
        .select("ai_analysis")
        .eq("id", player_id)
        .single();

      if (!playerRow?.ai_analysis?.text) {
        return new Response(
          JSON.stringify({ error: "No analysis to translate" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sourceText = String(playerRow.ai_analysis.text || "");
      const cachedTranslation = playerRow.ai_analysis.translations?.[target_lang];
      if (
        cachedTranslation &&
        typeof cachedTranslation === "string" &&
        !force_retranslate &&
        looksLikeCompleteTranslation(sourceText, cachedTranslation)
      ) {
        return new Response(
          JSON.stringify({ translation: cachedTranslation, cached: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const translation = await translateAnalysis(sourceText, target_lang);

      const updatedAnalysis = {
        ...playerRow.ai_analysis,
        translations: { ...(playerRow.ai_analysis.translations || {}), [target_lang]: translation },
      };
      await supabase.from("players").update({ ai_analysis: updatedAnalysis }).eq("id", player_id);

      return new Response(
        JSON.stringify({ translation }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: generate (default)
    const isLimitBypassed = BYPASS_LIMIT_IDS.includes(player_id);
    if (!isLimitBypassed && currentCount >= MAX_MONTHLY_USES) {
      return new Response(
        JSON.stringify({
          error: "LIMIT_REACHED",
          count: currentCount,
          remaining: 0,
          message: `You have used all ${MAX_MONTHLY_USES} analyses for this month. Resets on the 1st of next month.`,
          // legacy compat
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch full player data
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("id", player_id)
      .single();

    if (playerError || !player) {
      return new Response(
        JSON.stringify({ error: "Player not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch player teams from player_teams table
    const { data: teamsData } = await supabase
      .from("player_teams")
      .select(`
        is_primary, start_year, end_year,
        teams!inner(name, name_ru, type)
      `)
      .eq("player_id", player_id)
      .order("start_year", { ascending: true });

    const teamsList = (teamsData || []).map((row: any) => ({
      name: row.teams?.name || "",
      startYear: row.start_year,
      endYear: row.end_year,
      isCurrent: !row.end_year,
    })).filter(t => t.name && t.name.trim() !== "");

    // Collect video URLs: prefer fresh ones from request, fall back to DB
    const videosFromRequest = (gameVideosFromRequest || []).filter((v: string) => typeof v === "string" && v.trim());
    const videosFromDB = parseGameVideos(player.game_videos);
    const videoUrls = videosFromRequest.length > 0 ? videosFromRequest : videosFromDB;
    const validVideos = videoUrls.filter(isValidYouTubeUrl);

    const playerWithTeams = { ...(player as PlayerData), teamsList };
    const generationLang = language || "en";
    const completedExercises = await resolveCompletedExercises(
      supabase,
      player.exercise_stats,
      generationLang
    );
    const promptText = buildTextPrompt(
      playerWithTeams,
      validVideos,
      generationLang,
      completedExercises
    );

    console.log(
      `🤖 Generating analysis for ${player.name} | lang: ${generationLang} | teams: ${teamsList.length} | videos: ${validVideos.length} | normatives: ${[
        player.pull_ups,
        player.push_ups,
        player.plank_time,
        player.sprint_100m,
        player.long_jump,
        player.jump_rope,
      ].filter(isValidNormValue).length} | exercises: ${completedExercises.length}`
    );

    const analysisText = await callGemini([{ text: promptText }], GEMINI_MODEL, true, 8192, 1024);

    // Save analysis to player
    const existingAnalysis = player.ai_analysis || {};
    const newAnalysis = {
      text: analysisText,
      generated_at: new Date().toISOString(),
      is_public: existingAnalysis.is_public ?? true,
      translations: {},
      has_video_analysis: validVideos.length > 0,
      generation_language: generationLang,
    };

    await supabase.from("players").update({ ai_analysis: newAnalysis }).eq("id", player_id);

    // Increment usage counter
    await supabase
      .from("ai_analysis_usage")
      .upsert({ player_id, year, month, count: currentCount + 1 }, { onConflict: "player_id,year,month" });

    return new Response(
      JSON.stringify({
        analysis: analysisText,
        count: currentCount + 1,
        remaining: MAX_MONTHLY_USES - currentCount - 1,
        has_video_analysis: validVideos.length > 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-ai-analysis error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
