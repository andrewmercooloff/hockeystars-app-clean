import type { Language } from '../../contexts/LanguageContext';
import type { LocalizedQuizQuestion, LocalizedText, QuizDifficulty, QuizQuestion } from './types';
import { DIFFICULTY_BY_LEVEL, PRIZE_LADDER, QUIZ_TOTAL_LEVELS } from './types';
import { HOCKEY_QUIZ_QUESTIONS } from './questions';
import { getQuizI18nForLang } from './i18n';

/** Mix question sources within a session (not only iq_youth). */
type QuizSourceGroup = 'youth' | 'tactics' | 'players' | 'rules' | 'history' | 'general';

const MAX_YOUTH_PER_SESSION = 4;
const SESSION_GROUP_TARGETS: Record<QuizSourceGroup, number> = {
  youth: 3,
  tactics: 3,
  players: 3,
  rules: 2,
  history: 2,
  general: 2,
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function localizeText(text: LocalizedText, lang: Language): string {
  const value = text[lang] ?? text.ru ?? text.en;
  return typeof value === 'string' && value.length > 0 ? value : '';
}

/** Лучший результат каждого игрока, отсортированный по убыванию score. */
export function aggregateQuizLeaderboard<T extends { player_id: string; score: number }>(
  rows: T[]
): T[] {
  const bestByPlayer = new Map<string, T>();
  for (const row of rows) {
    const prev = bestByPlayer.get(row.player_id);
    if (!prev || normalizeRankingScore(row.score) > normalizeRankingScore(prev.score)) {
      bestByPlayer.set(row.player_id, row);
    }
  }
  return [...bestByPlayer.values()].sort(
    (a, b) => normalizeRankingScore(b.score) - normalizeRankingScore(a.score)
  );
}

function localizeQuestion(q: QuizQuestion, lang: Language): LocalizedQuizQuestion | null {
  const i18nEntry = getQuizI18nForLang(lang)[q.id];

  let question: string;
  let options: string[];

  if (i18nEntry?.question && i18nEntry.options?.length === 4) {
    question = i18nEntry.question;
    options = [...i18nEntry.options];
  } else {
    question = localizeText(q.question, lang);
    options = q.options.map((opt) => {
      if (typeof opt === 'string') return opt;
      return localizeText(opt, lang);
    });
  }

  if (options.length < 4 || options.some((o) => !o.length) || !question.length) {
    return null;
  }

  return {
    options: options as [string, string, string, string],
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    correctIndex: q.correctIndex,
    question,
  };
}

export function getLocalizedQuestionPool(lang: Language): LocalizedQuizQuestion[] {
  const pool: LocalizedQuizQuestion[] = [];
  for (const q of HOCKEY_QUIZ_QUESTIONS) {
    const localized = localizeQuestion(q, lang);
    if (localized) pool.push(localized);
  }
  return pool;
}

function shuffleQuestionOptions(question: LocalizedQuizQuestion): LocalizedQuizQuestion {
  const order = shuffle([0, 1, 2, 3]);
  const options = order.map((i) => question.options[i]) as [string, string, string, string];
  const correctIndex = order.indexOf(question.correctIndex);
  return { ...question, options, correctIndex };
}

/** Prefer target difficulty; never drop to easy questions on late levels. */
const DIFFICULTY_FALLBACKS: Record<QuizDifficulty, QuizDifficulty[]> = {
  1: [1],
  2: [2, 3],
  3: [3, 4, 2],
  4: [4, 3],
};

function sourceGroup(q: LocalizedQuizQuestion): QuizSourceGroup {
  if (q.id.startsWith('iq_youth')) return 'youth';
  if (q.id.startsWith('theory_')) return 'tactics';
  if (q.id.startsWith('pl_') || q.category === 'players') return 'players';
  if (q.category === 'rules' || q.id.startsWith('ref_')) return 'rules';
  if (q.category === 'history') return 'history';
  return 'general';
}

function groupCountMap(sessionUsed: LocalizedQuizQuestion[]): Record<QuizSourceGroup, number> {
  const counts: Record<QuizSourceGroup, number> = {
    youth: 0,
    tactics: 0,
    players: 0,
    rules: 0,
    history: 0,
    general: 0,
  };
  for (const q of sessionUsed) {
    counts[sourceGroup(q)]++;
  }
  return counts;
}

function scoreCandidate(
  q: LocalizedQuizQuestion,
  groupCounts: Record<QuizSourceGroup, number>
): number {
  const group = sourceGroup(q);
  let score = SESSION_GROUP_TARGETS[group] - groupCounts[group];

  if (group === 'youth' && groupCounts.youth >= MAX_YOUTH_PER_SESSION) {
    score -= 100;
  }

  score += Math.random() * 0.05;
  return score;
}

function pickBestFromCandidates(
  candidates: LocalizedQuizQuestion[],
  pickedSoFar: LocalizedQuizQuestion[]
): LocalizedQuizQuestion {
  const groupCounts = groupCountMap(pickedSoFar);
  const scored = candidates
    .map((q) => ({ q, score: scoreCandidate(q, groupCounts) }))
    .sort((a, b) => b.score - a.score);
  const topScore = scored[0]?.score ?? -999;
  const topTier = scored.filter((s) => s.score >= topScore - 0.05);
  return shuffle(topTier)[0].q;
}

function pickBalancedQuestion(
  pool: LocalizedQuizQuestion[],
  difficulty: QuizDifficulty,
  sessionUsedIds: Set<string>,
  pickedSoFar: LocalizedQuizQuestion[]
): LocalizedQuizQuestion | null {
  for (const diff of DIFFICULTY_FALLBACKS[difficulty]) {
    let candidates = pool.filter((q) => q.difficulty === diff && !sessionUsedIds.has(q.id));
    if (candidates.length === 0) {
      candidates = pool.filter((q) => q.difficulty === diff);
    }
    if (candidates.length === 0) continue;

    return pickBestFromCandidates(candidates, pickedSoFar);
  }

  return null;
}

export async function pickQuizSessionQuestions(lang: Language): Promise<LocalizedQuizQuestion[]> {
  const pool = getLocalizedQuestionPool(lang);
  const sessionUsedIds = new Set<string>();
  const picked: LocalizedQuizQuestion[] = [];

  for (let level = 0; level < QUIZ_TOTAL_LEVELS; level++) {
    const difficulty = DIFFICULTY_BY_LEVEL[level];
    let question = pickBalancedQuestion(pool, difficulty, sessionUsedIds, picked);

    if (!question) {
      const allowed = new Set(DIFFICULTY_FALLBACKS[difficulty]);
      const candidates = pool.filter((q) => allowed.has(q.difficulty) && !sessionUsedIds.has(q.id));
      if (candidates.length > 0) {
        question = pickBestFromCandidates(candidates, picked);
      }
    }

    if (question) {
      picked.push(shuffleQuestionOptions(question));
      sessionUsedIds.add(question.id);
    }
  }

  return picked;
}

export function formatPrize(value: number, lang: Language): string {
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return `${Math.max(0, Math.floor(value)).toLocaleString(locale)} ★`;
}

export const QUESTION_TIME_SEC = 60;
const LEGACY_RANKING_PRIZE_MULT = 1_000_000_000;
const MAX_SPEED_BONUS_SEC = QUESTION_TIME_SEC * QUIZ_TOTAL_LEVELS;

/** Старый формат: prize × 1e9 + ms. Новый: prize + сумма оставшихся секунд. */
export function normalizeRankingScore(rankingScore: number): number {
  if (rankingScore >= LEGACY_RANKING_PRIZE_MULT) {
    const prize = Math.floor(rankingScore / LEGACY_RANKING_PRIZE_MULT);
    const speedBonusSec = Math.floor((rankingScore % LEGACY_RANKING_PRIZE_MULT) / 1000);
    return prize + speedBonusSec;
  }
  return rankingScore;
}

/** Итог для таблицы лидеров: приз + бонус секунд (напр. 5000 + 50 = 5050). */
export function buildRankingScore(prizeAmount: number, speedBonusSeconds: number): number {
  const bonus = Math.min(MAX_SPEED_BONUS_SEC, Math.max(0, Math.floor(speedBonusSeconds)));
  return prizeAmount + bonus;
}

export function prizeFromRankingScore(rankingScore: number): number {
  const normalized = normalizeRankingScore(rankingScore);
  let prize = 0;
  for (const step of PRIZE_LADDER) {
    if (normalized >= step) prize = step;
  }
  return prize;
}

export function speedBonusFromRankingScore(rankingScore: number): number {
  return normalizeRankingScore(rankingScore) - prizeFromRankingScore(rankingScore);
}

export function formatLeaderboardScore(rankingScore: number, lang: Language): string {
  return formatPrize(normalizeRankingScore(rankingScore), lang);
}

/** Секунды, оставшиеся на таймере в момент правильного ответа (0–60). */
export function speedBonusForResponse(secondsRemaining: number): number {
  return Math.max(0, Math.min(QUESTION_TIME_SEC, Math.floor(secondsRemaining)));
}

export function scoreForLevel(level: number): number {
  if (level <= 0) return 0;
  return PRIZE_LADDER[Math.min(level, PRIZE_LADDER.length) - 1] ?? 0;
}

export function apply5050(
  options: [string, string, string, string],
  correctIndex: number
): { hidden: boolean[] } {
  const wrongIndices = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  const keepWrong = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
  const hidden = [0, 1, 2, 3].map((i) => i !== correctIndex && i !== keepWrong);
  return { hidden };
}

/** Audience poll — correct answer gets highest share */
export function applyAudiencePoll(correctIndex: number): number[] {
  const weights = [0.08, 0.12, 0.15, 0.65];
  const percents = [0, 0, 0, 0];
  percents[correctIndex] = 40 + Math.floor(Math.random() * 25);
  let remaining = 100 - percents[correctIndex];
  const others = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  others.forEach((idx, i) => {
    if (i === others.length - 1) {
      percents[idx] = remaining;
    } else {
      const share = Math.max(5, Math.floor(remaining * weights[i]));
      percents[idx] = share;
      remaining -= share;
    }
  });
  return percents;
}

/** Coach hint — 75% correct */
export function applyCoachHint(correctIndex: number): number {
  if (Math.random() < 0.75) return correctIndex;
  const wrong = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  return wrong[Math.floor(Math.random() * wrong.length)];
}
