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
  hockey_start_date?: string;
  city?: string;
  number?: string;
  achievements?: string; // JSON array of Achievement objects
  game_videos?: string;  // JSON array of YouTube URLs
  // resolved after extra query:
  teamsList?: { name: string; startYear?: number; endYear?: number; isCurrent?: boolean }[];
}

const LANG_NAMES: Record<string, string> = {
  en: "English", ru: "Russian", de: "German", fr: "French", it: "Italian",
  pl: "Polish", sv: "Swedish", cs: "Czech", sk: "Slovak", fi: "Finnish",
  lv: "Latvian", lt: "Lithuanian",
};

function buildTextPrompt(player: PlayerData, videoUrls: string[], language = "en"): string {
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

  // Season stats — use Number() to avoid string concatenation
  const goals = Number(player.goals ?? 0);
  const assists = Number(player.assists ?? 0);
  const games = Number(player.games ?? 0);
  const shots = Number(player.shots ?? 0);
  const saves = Number(player.saves ?? 0);
  const minutes = Number(player.minutes ?? 0);

  lines.push("\nSeason statistics:");
  if (isGoalie) {
    if (games) lines.push(`- Games: ${games}`);
    if (minutes) lines.push(`- Minutes: ${minutes}`);
    if (shots) lines.push(`- Shots against: ${shots}`);
    if (saves) lines.push(`- Saves: ${saves}`);
    if (shots && saves) {
      lines.push(`- Save%: ${((saves / shots) * 100).toFixed(1)}%`);
    }
  } else {
    if (games) lines.push(`- Games: ${games}`);
    lines.push(`- Goals: ${goals}`);
    lines.push(`- Assists: ${assists}`);
    lines.push(`- Points: ${goals + assists}`);
    if (games) lines.push(`- Goals/game: ${(goals / games).toFixed(2)}`);
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

  return `### ROLE
You are a Senior Player Development Scout & Biomechanics Expert. Your specialization is detailed technical audits of hockey players based on video materials and metrics. Your task: go beyond dry statistics and give the player a "roadmap" for physical and technical progress.

### CONTEXT
You are analyzing a player profile in the HockeyStars social network.
You are provided with:
1. Profile data (position, height, weight, age, grip).
2. Statistics (if available).
3. ${hasVideos ? `Game video links (YouTube) — IMPORTANT: open and watch these videos via the provided URLs. The player wears Jersey #${player.number || '?'}. Analyze their movements, technique, and positioning.` : 'No game videos provided.'}
Use Google Search: search for "${player.name}" hockey and their team(s). Include any real findings you discover online.${hasVideos ? ' Also use Google Search to access and analyze the YouTube video links listed in PLAYER DATA.' : ''}

### ANALYTICAL PROTOCOL (Video Analysis Algorithm)
${hasVideos ? 'WATCH the YouTube videos provided in PLAYER DATA. Ignore the outcome of episodes (goal/pass). Focus on the following markers:' : 'If no video is available, base your biomechanical assessment on the statistical data, position, and anthropometrics. Focus on the following markers:'}
1. SKATING KINEMATICS: Knee bend depth, recovery leg amplitude, ankle work (on edges), body position (upright vs aerodynamic).
2. EXPLOSIVE POWER: First-step speed, loading phase before acceleration, stride frequency in the start zone.
3. STICK HANDLING TECHNIQUE: Top-hand position on the stick, dribbling amplitude, puck control while maintaining speed.
4. HOCKEY IQ: Head scanning before receiving the puck, positioning relative to the net/opponent.

PLAYER DATA:
${lines.join("\n")}

### CONSTRAINTS
- Write the ENTIRE report in ${langName}.
- Do NOT include any intro/preface lines like "I present to you", "Here is your report", "Представляю вашему вниманию", "Рад представить". Start immediately with the first required section header: "## Technical Passport".
- Do NOT use generic phrases like "you need to train more".
- BE SPECIFIC: when discussing speed, specify "starting power" or "top-end speed".
- TONE: Professional, constructive, inspiring hard work.
- Do NOT invent facts not present in the data. No filler.
- Keep the report concise: aim for roughly 1-page length in the app export (avoid overly long paragraphs).
- Write in ${langName} using markdown (## headers, **bold**, - bullets). Do NOT use emojis in section headers.

### STRUCTURE OF THE REPORT

## Technical Passport
Brief summary of anthropometrics and position. Role on the ice (based on data/video).

## Biomechanical Analysis
- **Strengths:** Describe 2-3 specific technical elements that stand out for this player, backed by data.
- **Growth Zones:** Describe 2-3 critical technical deficiencies (e.g. "insufficient hip drive", "high center of gravity on turns", "weak absorption phase on puck reception"). Be honest and constructive.

## Training Vector
- **On-Ice:** Specific on-ice drills to correct the identified issues.
- **Off-Ice (GPP/SPP):** A mini-program of 3 exercises. Include plyometrics (jumps, explosive work) or joint mobility work based on analysis. Example: "Box jumps 60cm with hold at bottom" if weak starting speed is identified.

## Hockey IQ & Vision
Advice on improving game reading and situational awareness.

## Scout's Verdict
2-3 sentences. Overall level, potential ceiling, and the single most important thing to work on.`;
}

async function callGemini(parts: object[], model: string, useGoogleSearch = false, maxOutputTokens = 2000): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const requestBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens,
      topK: 40,
      topP: 0.95,
    },
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
  // With grounding, response may have multiple parts — find the text part
  const candidate = data.candidates?.[0];
  const textPart = candidate?.content?.parts?.find((p: any) => typeof p.text === "string");
  const text = textPart?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
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

  return await callGemini([{ text: prompt }], GEMINI_MODEL, false, 8192);
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
    const { player_id, action, target_lang, language, game_videos: gameVideosFromRequest } = body;

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

      const cachedTranslation = playerRow.ai_analysis.translations?.[target_lang];
      if (cachedTranslation) {
        return new Response(
          JSON.stringify({ translation: cachedTranslation, cached: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const translation = await translateAnalysis(playerRow.ai_analysis.text, target_lang);

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
    const promptText = buildTextPrompt(playerWithTeams, validVideos, generationLang);

    console.log(`🤖 Generating analysis for ${player.name} | lang: ${generationLang} | teams: ${teamsList.length} | videos: ${validVideos.length}`);

    // Shorter output to fit export cards better
    const analysisText = await callGemini([{ text: promptText }], GEMINI_MODEL, true, 4600);

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
