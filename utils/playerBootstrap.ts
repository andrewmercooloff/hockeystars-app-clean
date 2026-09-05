/**
 * Web SPA bootstrap: early public player payload from PHP
 * (started in +html.tsx before React bundle).
 */

import type { PastTeam, Player } from './playerStorage';
import {
  convertSupabaseRowToPlayer,
  seedPlayerBootstrapCache,
  seedPlayerTeamsBootstrapCache,
} from './playerStorage';
import { cacheSlugResolve } from './playerSeoPath';

export type PlayerBootstrapTeam = {
  teamId: string;
  teamName: string;
  teamNameRu?: string | null;
  teamType?: string | null;
  teamCountry?: string | null;
  teamCity?: string | null;
  isPrimary?: boolean;
  joinedDate?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  teamOrder?: number;
};

export type PlayerBootstrapPayload = {
  ok: boolean;
  slug?: string;
  playerId?: string;
  player?: Record<string, unknown>;
  teams?: PlayerBootstrapTeam[];
  error?: string;
};

declare global {
  interface Window {
    __HS_PLAYER_BOOTSTRAP__?: Promise<PlayerBootstrapPayload | null> | PlayerBootstrapPayload | null;
    __HS_PLAYER_BOOTSTRAP_SLUG__?: string;
  }
}

function teamsToPastTeams(teams: PlayerBootstrapTeam[]): PastTeam[] {
  return teams
    .filter((t) => t.teamId && t.teamName)
    .map((t) => ({
      id: t.teamId,
      teamName: t.teamName,
      teamNameRu: t.teamNameRu || undefined,
      teamType: t.teamType || undefined,
      teamCountry: t.teamCountry || undefined,
      teamCity: t.teamCity || undefined,
      startYear: t.startYear || new Date().getFullYear(),
      endYear: t.endYear ?? undefined,
      isCurrent: !!t.isPrimary,
    }));
}

export function bootstrapTeamsToPastTeams(teams: PlayerBootstrapTeam[] | undefined): PastTeam[] {
  if (!teams?.length) return [];
  return teamsToPastTeams(teams);
}

/** Read early-fetch promise/result started in HTML head. */
export async function consumePlayerBootstrap(
  routeSlug: string
): Promise<{ player: Player; teams: PastTeam[]; playerId: string } | null> {
  if (typeof window === 'undefined') return null;

  const expected = decodeURIComponent(routeSlug).trim().toLowerCase();
  const earlySlug = (window.__HS_PLAYER_BOOTSTRAP_SLUG__ || '').trim().toLowerCase();
  if (earlySlug && earlySlug !== expected) {
    return null;
  }

  let raw: PlayerBootstrapPayload | null = null;
  try {
    const pending = window.__HS_PLAYER_BOOTSTRAP__;
    if (pending && typeof (pending as Promise<unknown>).then === 'function') {
      raw = await (pending as Promise<PlayerBootstrapPayload | null>);
    } else if (pending && typeof pending === 'object') {
      raw = pending as PlayerBootstrapPayload;
    }
  } catch {
    raw = null;
  }

  if (!raw?.ok || !raw.player || !raw.playerId) {
    // Fallback fetch if early script missed this route
    try {
      const res = await fetch(
        `/player-bootstrap.php?id=${encodeURIComponent(routeSlug)}`,
        { credentials: 'omit' }
      );
      if (!res.ok) return null;
      raw = (await res.json()) as PlayerBootstrapPayload;
    } catch {
      return null;
    }
  }

  if (!raw?.ok || !raw.player || !raw.playerId) return null;

  const player = convertSupabaseRowToPlayer(raw.player as any);
  if (!player?.id) return null;

  const teams = bootstrapTeamsToPastTeams(raw.teams);
  seedPlayerBootstrapCache(player);
  seedPlayerTeamsBootstrapCache(player.id, raw.teams || []);
  if (raw.slug) {
    cacheSlugResolve(String(raw.slug), player.id);
  } else {
    cacheSlugResolve(routeSlug, player.id);
  }

  return { player, teams, playerId: player.id };
}
