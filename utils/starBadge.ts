import type { Player } from './playerStorage';
import { isGoalkeeperPosition } from './playerStorage';
import {
  getAllTimeGoalieBlock,
  getAllTimePoints,
  getSeasonSavePercentage,
} from './seasonStats';

export type StarBadgePlayer = Pick<
  Player,
  'position' | 'goals' | 'assists' | 'games' | 'minutes' | 'shots' | 'saves' | 'seasonStats'
>;

/** Text next to the star: career points (skaters) or SV% (goalies). */
export function getStarBadgeText(player: StarBadgePlayer): string {
  if (isGoalkeeperPosition(player.position)) {
    const block = getAllTimeGoalieBlock(player);
    if (block && (block.shots ?? 0) > 0) {
      const pct = getSeasonSavePercentage(block);
      return pct.startsWith('0.') ? pct.slice(1) : pct;
    }
    return '0';
  }
  return String(getAllTimePoints(player));
}

export function shouldShowStarBadge(
  player: StarBadgePlayer,
  opts?: { hideZero?: boolean }
): boolean {
  if (isGoalkeeperPosition(player.position)) {
    const block = getAllTimeGoalieBlock(player);
    return !!(block && (block.shots ?? 0) > 0);
  }
  const pts = getAllTimePoints(player);
  return opts?.hideZero ? pts > 0 : true;
}
