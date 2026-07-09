export interface GameScoreRow {
  player_id: string;
  player_name: string;
  player_avatar?: string | null;
  score: number;
  created_at: string;
}

export interface DualLeaderboardResult<T extends GameScoreRow> {
  monthly: T[];
  allTime: T[];
  monthlyChampion: T | null;
  allTimeChampion: T | null;
}

/** UTC month window — new month = fresh monthly leaderboard automatically. */
export function getMonthRangeUTC(ref = new Date()): { start: string; end: string } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  return {
    start: new Date(Date.UTC(y, m, 1)).toISOString(),
    end: new Date(Date.UTC(y, m + 1, 1)).toISOString(),
  };
}

export function filterRowsInCurrentMonth<T extends { created_at: string }>(
  rows: T[],
  ref = new Date()
): T[] {
  const { start, end } = getMonthRangeUTC(ref);
  return rows.filter((row) => row.created_at >= start && row.created_at < end);
}

export function numericScore(score: number | string | null | undefined): number {
  const n = Number(score);
  return Number.isFinite(n) ? n : 0;
}

/** compareScores(a, b) > 0 означает, что a лучше b. По умолчанию — больше число = лучше. */
export function aggregateBestPerPlayer<T extends { player_id: string; score: number }>(
  rows: T[],
  compareScores: (a: number, b: number) => number = (a, b) => a - b
): T[] {
  const bestByPlayer = new Map<string, T>();
  for (const row of rows) {
    const prev = bestByPlayer.get(row.player_id);
    const rowScore = numericScore(row.score);
    if (!prev || compareScores(rowScore, numericScore(prev.score)) > 0) {
      bestByPlayer.set(row.player_id, row);
    }
  }
  return [...bestByPlayer.values()].sort((a, b) =>
    compareScores(numericScore(b.score), numericScore(a.score))
  );
}

export function buildDualLeaderboards<T extends GameScoreRow>(
  rows: T[],
  compareScores: (a: number, b: number) => number = (a, b) => a - b,
  limit = 10
): DualLeaderboardResult<T> {
  const monthly = aggregateBestPerPlayer(filterRowsInCurrentMonth(rows), compareScores).slice(0, limit);
  const allTime = aggregateBestPerPlayer(rows, compareScores).slice(0, limit);
  return {
    monthly,
    allTime,
    monthlyChampion: monthly[0] ?? null,
    allTimeChampion: allTime[0] ?? null,
  };
}

export function bestScoreForPlayer<T extends { player_id: string; score: number; created_at: string }>(
  rows: T[],
  playerId: string,
  scope: 'month' | 'all',
  compareScores: (a: number, b: number) => number = (a, b) => a - b
): number {
  const pool = scope === 'month' ? filterRowsInCurrentMonth(rows) : rows;
  const mine = pool.filter((r) => r.player_id === playerId);
  if (mine.length === 0) return 0;
  return numericScore(aggregateBestPerPlayer(mine, compareScores)[0]?.score);
}
