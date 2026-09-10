import { useEffect, useState } from 'react';
import {
  getPlayerCoverUrl,
  getTeamLogoUrl,
  teamAssetsReady,
} from '../utils/teamAssets';

/** Cover/logo URL after version + missing caches are hydrated (stable ?v= for prefetch/render). */
export function usePlayerCoverUrl(playerId: string, refreshKey = 0): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void teamAssetsReady().then(() => {
      if (!cancelled) setUrl(getPlayerCoverUrl(playerId));
    });
    return () => {
      cancelled = true;
    };
  }, [playerId, refreshKey]);

  return url;
}

export function useTeamLogoUrl(teamId: string | null | undefined, refreshKey = 0): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void teamAssetsReady().then(() => {
      if (!cancelled) setUrl(getTeamLogoUrl(teamId));
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, refreshKey]);

  return url;
}
