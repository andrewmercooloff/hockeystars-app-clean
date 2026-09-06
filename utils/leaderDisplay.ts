import { Dimensions, Platform } from 'react-native';
import { getPlayerSeasonPoints, type Player } from './playerStorage';
import { getAllTimeGAA, getAllTimeGoalieBlock, getAllTimePoints } from './seasonStats';
import { getPerformanceLevel } from './devicePerformance';

export type LeaderRank = 1 | 2 | 3;
export type LeaderPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const MAX_SEARCH_LEADERS = 10;

/** Медальная обводка снаружи (не жёлтая). */
export const LEADER_BORDER_COLORS: Record<LeaderRank, string> = {
  1: '#D4AF37',
  2: '#A8A9AD',
  /** Сияющая бронза (не «какашечный» коричневый). */
  3: '#E8B86D',
};

export const LEADER_MEDAL_BORDER_WIDTH = 2;

export const LEADER_RANK_BADGE_COLOR = '#2C2C2C';

export const isMedalLeaderPosition = (rank: number): rank is LeaderRank =>
  rank === 1 || rank === 2 || rank === 3;

export const getMedalLeaderRank = (position: number): LeaderRank | undefined =>
  isMedalLeaderPosition(position) ? position : undefined;

export const LEADER_AVATAR_SCALE = 1.2;
export const SEARCH_AVATAR_BASE_SIZE = 60;
export const PUCK_BASE_SIZE = 70;
/** Эталонная ширина экрана (logical px) для пропорционального масштаба шайб. */
export const PUCK_SIZE_REF_MIN_DIM = 390;
/** На главном экране топ-3 шайбы чуть крупнее обычных (+10 %). */
export const PUCK_LEADER_SCALE = 1.1;
/** На слабых Android (Redmi 9 и аналоги) — чуть меньше; +10 % к прежнему low-end масштабу. */
export const PUCK_LOW_END_ANDROID_SCALE = 0.935;
/** Главный экран: все шайбы на 5 % меньше (на всех устройствах). */
export const PUCK_HOME_SCREEN_SCALE = 0.95;

/** Базовый диаметр шайбы пропорционально экрану; на low-end Android ещё −15 %. */
export const getScaledPuckBaseSize = (
  screenWidth?: number,
  screenHeight?: number,
  opts?: { homeScreen?: boolean }
): number => {
  const dims = Dimensions.get('window');
  const w = screenWidth ?? dims.width;
  const h = screenHeight ?? dims.height;
  const minDim = Math.min(w, h);
  const scale = Math.min(Math.max(minDim / PUCK_SIZE_REF_MIN_DIM, 0.78), 1.1);
  let size = Math.round(PUCK_BASE_SIZE * scale);
  if (Platform.OS === 'android' && getPerformanceLevel() === 'low') {
    size = Math.round(size * PUCK_LOW_END_ANDROID_SCALE);
  }
  if (opts?.homeScreen) {
    size = Math.round(size * PUCK_HOME_SCREEN_SCALE);
  }
  return size;
};

export type PuckSpawnParams = {
  spawnX: number;
  spawnY: number;
  vx: number;
  vy: number;
};

/** Точка и скорость «вылета» шайбы снизу по центру (ниже нижней границы поля). */
export const getPuckSpawnFromBottom = (
  boundaries: { left: number; right: number; bottom: number },
  puckSize: number,
  androidSoft = 1
): PuckSpawnParams => {
  const spawnX = (boundaries.left + boundaries.right) / 2;
  const spawnY = boundaries.bottom + puckSize * 0.55;
  const base = 0.49 * androidSoft;
  return {
    spawnX,
    spawnY,
    vx: (Math.random() - 0.5) * base * 0.75,
    // Мягкий вылет снизу (как раньше); позиция уже ниже экрана — не нужна «ракетная» vy.
    vy: -Math.abs((Math.random() * 0.45 + 0.25) * base),
  };
};

export const getPuckSizeForLeader = (baseSize: number, leaderRank?: LeaderRank): number =>
  leaderRank != null ? Math.round(baseSize * PUCK_LEADER_SCALE) : baseSize;

/** Минимальное расстояние между центрами двух шайб (диаметры size — полный размер). */
export const puckCollisionMinDistance = (sizeA: number, sizeB: number): number =>
  (sizeA + sizeB) / 2;

export const computeSavePercentage = (player: Player): number => {
  const shots = parseInt(String(player.shots ?? '0'), 10) || 0;
  const saves = parseInt(String(player.saves ?? '0'), 10) || 0;
  if (shots <= 0) return -1;
  return saves / shots;
};

/**
 * Сравнение для рейтинга в поиске — по суммарным показателям за все сезоны:
 * полевые — гол+пас, вратари — GAA (меньше лучше).
 */
export const compareLeaderPlayers = (
  a: Player,
  b: Player,
  goalieMode: boolean
): number => {
  if (goalieMode) {
    const gaaA = getAllTimeGAA(a);
    const gaaB = getAllTimeGAA(b);
    if (gaaA < 0 && gaaB < 0) return 0;
    if (gaaA < 0) return 1;
    if (gaaB < 0) return -1;
    return gaaA - gaaB;
  }
  return getAllTimePoints(b) - getAllTimePoints(a);
};

/** Скаут: новички → топ-10 лидеров → остальные по тем же очкам. */
export const sortPlayersForSearchList = (
  players: Player[],
  goalieMode: boolean,
  newcomerMaxMs: number
): { sorted: Player[]; leaderPositions: Map<string, number> } => {
  const now = Date.now();
  const newcomers: Player[] = [];
  const others: Player[] = [];

  for (const player of players) {
    if (player.createdAt) {
      const createdTime = new Date(player.createdAt).getTime();
      if (!isNaN(createdTime) && now - createdTime < newcomerMaxMs) {
        newcomers.push(player);
        continue;
      }
    }
    others.push(player);
  }

  newcomers.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  others.sort((a, b) => compareLeaderPlayers(a, b, goalieMode));

  const leaderPool = goalieMode
    ? others.filter((p) => getAllTimeGoalieBlock(p) != null)
    : others;
  const leaders = leaderPool.slice(0, MAX_SEARCH_LEADERS);
  const leaderIds = new Set(leaders.map((p) => p.id));
  const rest = others.filter((p) => !leaderIds.has(p.id));

  const leaderPositions = new Map<string, number>();
  leaders.forEach((p, index) => {
    leaderPositions.set(p.id, index + 1);
  });

  return { sorted: [...newcomers, ...leaders, ...rest], leaderPositions };
};

export const getTopSeasonLeaders = (players: Player[], count: number): Player[] =>
  [...players].sort((a, b) => getPlayerSeasonPoints(b) - getPlayerSeasonPoints(a)).slice(0, count);

export const getTopSeasonLeaderRanks = (players: Player[]): Map<string, LeaderRank> => {
  const ranks = new Map<string, LeaderRank>();
  getTopSeasonLeaders(players, 3).forEach((p, index) => {
    ranks.set(p.id, (index + 1) as LeaderRank);
  });
  return ranks;
};

export const getSearchAvatarSize = (leaderPosition?: number): number => {
  const medal = leaderPosition != null ? getMedalLeaderRank(leaderPosition) : undefined;
  return medal
    ? Math.round(SEARCH_AVATAR_BASE_SIZE * LEADER_AVATAR_SCALE)
    : SEARCH_AVATAR_BASE_SIZE;
};
