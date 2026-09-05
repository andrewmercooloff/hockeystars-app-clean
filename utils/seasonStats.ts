import type { Player } from './playerStorage';
import { PREVIOUS_SEASON_KEY } from './seasonConfig';

export type SeasonStatBlock = {
  goals?: number;
  assists?: number;
  games?: number;
  minutes?: number;
  shots?: number;
  saves?: number;
};

export type SeasonStatsMap = Record<string, SeasonStatBlock>;

const STAT_KEYS: (keyof SeasonStatBlock)[] = [
  'goals',
  'assists',
  'games',
  'minutes',
  'shots',
  'saves',
];

const toInt = (value: unknown): number => {
  const n = parseInt(String(value ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
};

export const parseSeasonStats = (raw: unknown): SeasonStatsMap | undefined => {
  if (!raw) return undefined;
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const result: SeasonStatsMap = {};
  for (const [seasonKey, block] of Object.entries(parsed as Record<string, unknown>)) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
    const entry: SeasonStatBlock = {};
    for (const key of STAT_KEYS) {
      const v = (block as SeasonStatBlock)[key];
      if (v !== undefined && v !== null && String(v) !== '') {
        entry[key] = toInt(v);
      }
    }
    if (hasSeasonStatData(entry)) {
      result[seasonKey] = entry;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export const hasSeasonStatData = (block?: SeasonStatBlock | null): boolean => {
  if (!block) return false;
  return STAT_KEYS.some((key) => toInt(block[key]) > 0);
};

export const getArchivedSeasonStats = (
  player: Pick<Player, 'seasonStats'>,
  seasonKey: string = PREVIOUS_SEASON_KEY,
): SeasonStatBlock | null => {
  const block = player.seasonStats?.[seasonKey];
  return hasSeasonStatData(block) ? block! : null;
};

export const currentSeasonBlockFromPlayer = (
  player: Pick<Player, 'goals' | 'assists' | 'games' | 'minutes' | 'shots' | 'saves'>,
): SeasonStatBlock => ({
  goals: toInt(player.goals),
  assists: toInt(player.assists),
  games: toInt(player.games),
  minutes: toInt(player.minutes),
  shots: toInt(player.shots),
  saves: toInt(player.saves),
});

export const playerHasCurrentSeasonStats = (
  player: Pick<Player, 'goals' | 'assists' | 'games' | 'minutes' | 'shots' | 'saves'>,
): boolean => hasSeasonStatData(currentSeasonBlockFromPlayer(player));

export const playerHasArchivedSeasonStats = (
  player: Pick<Player, 'seasonStats'>,
  seasonKey: string = PREVIOUS_SEASON_KEY,
): boolean => getArchivedSeasonStats(player, seasonKey) != null;

/** Очки на льду/в рейтинге: текущий сезон, иначе архив прошлого. */
export const getDisplaySeasonPoints = (
  player: Pick<Player, 'goals' | 'assists' | 'games' | 'seasonStats'>,
): number => {
  if (playerHasCurrentSeasonStats(player)) {
    return getSeasonPoints(currentSeasonBlockFromPlayer(player));
  }
  const archived = getArchivedSeasonStats(player);
  return archived ? getSeasonPoints(archived) : 0;
};

export const getDisplayGoalieBlock = (
  player: Pick<Player, 'goals' | 'assists' | 'games' | 'minutes' | 'shots' | 'saves' | 'seasonStats'>,
): SeasonStatBlock | null => {
  const current = currentSeasonBlockFromPlayer(player);
  const minutes = toInt(current.minutes);
  const shots = toInt(current.shots);
  const saves = toInt(current.saves);
  if (minutes > 0 && shots > 0 && saves >= 0 && saves <= shots) {
    return current;
  }
  const archived = getArchivedSeasonStats(player);
  if (!archived) return null;
  const aMin = toInt(archived.minutes);
  const aShots = toInt(archived.shots);
  const aSaves = toInt(archived.saves);
  if (aMin > 0 && aShots > 0 && aSaves >= 0 && aSaves <= aShots) {
    return archived;
  }
  return null;
};

export const seasonBlockToPlayerFields = (block: SeasonStatBlock): Pick<
  Player,
  'goals' | 'assists' | 'games' | 'minutes' | 'shots' | 'saves'
> => ({
  goals: String(block.goals ?? 0),
  assists: String(block.assists ?? 0),
  games: String(block.games ?? 0),
  minutes: String(block.minutes ?? 0),
  shots: String(block.shots ?? 0),
  saves: String(block.saves ?? 0),
});

export const getSeasonPoints = (block: SeasonStatBlock): number =>
  toInt(block.goals) + toInt(block.assists);

export const getSeasonSavePercentage = (block: SeasonStatBlock): string => {
  const shots = toInt(block.shots);
  const saves = toInt(block.saves);
  if (shots <= 0) return '0.000';
  return (saves / shots).toFixed(3);
};

export const getSeasonGAA = (block: SeasonStatBlock): string => {
  const minutes = toInt(block.minutes);
  const shots = toInt(block.shots);
  const saves = toInt(block.saves);
  if (minutes <= 0 || shots <= 0) return '0.00';
  const goalsAgainst = shots - saves;
  return ((goalsAgainst * 60) / minutes).toFixed(2);
};

export const getSeasonBlockForEdit = (
  player: Player,
  editData: Partial<Player>,
  seasonKey: string,
): SeasonStatBlock => {
  const edited = editData.seasonStats?.[seasonKey];
  if (edited) return edited;
  return player.seasonStats?.[seasonKey] ?? {};
};

export const getSeasonFieldEditValue = (
  block: SeasonStatBlock,
  field: keyof SeasonStatBlock,
): string => {
  const n = toInt(block[field]);
  return n > 0 ? String(n) : '';
};

export const patchSeasonEdit = (
  editData: Partial<Player>,
  seasonKey: string,
  field: keyof SeasonStatBlock,
  value: string,
): Partial<Player> => {
  const map = { ...(editData.seasonStats ?? {}) };
  const block = { ...(map[seasonKey] ?? {}) };
  block[field] = value === '' ? 0 : toInt(value);
  map[seasonKey] = block;
  return { ...editData, seasonStats: map };
};

export const buildSeasonStatsForSave = (
  player: Player,
  editData: Partial<Player>,
): SeasonStatsMap | undefined => {
  const block =
    editData.seasonStats?.[PREVIOUS_SEASON_KEY] ??
    player.seasonStats?.[PREVIOUS_SEASON_KEY];
  const normalized: SeasonStatBlock = {};
  for (const key of STAT_KEYS) {
    normalized[key] = toInt(block?.[key]);
  }

  const map: SeasonStatsMap = {
    ...(player.seasonStats ?? {}),
    ...(editData.seasonStats ?? {}),
  };

  if (hasSeasonStatData(normalized)) {
    map[PREVIOUS_SEASON_KEY] = normalized;
  } else {
    delete map[PREVIOUS_SEASON_KEY];
  }

  return Object.keys(map).length > 0 ? map : undefined;
};

export const FIELD_PLAYER_SEASON_FIELDS: (keyof SeasonStatBlock)[] = ['games', 'goals', 'assists'];
export const GOALIE_SEASON_FIELDS: (keyof SeasonStatBlock)[] = ['games', 'minutes', 'shots', 'saves'];
