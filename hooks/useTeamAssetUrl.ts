import { useEffect, useState } from 'react';
import {
  getPlayerCoverUrl,
  getTeamLogoUrl,
  teamAssetsReady,
} from '../utils/teamAssets';

/** Cover URL — immediate best guess, then stable ?v= after cache hydration. */
export function usePlayerCoverUrl(playerId: string, refreshKey = 0): string {
  const [url, setUrl] = useState(() => getPlayerCoverUrl(playerId));

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
  const [url, setUrl] = useState<string | null>(() => (teamId ? getTeamLogoUrl(teamId) : null));

  useEffect(() => {
    if (!teamId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setUrl(getTeamLogoUrl(teamId));
    void teamAssetsReady().then(() => {
      if (!cancelled) setUrl(getTeamLogoUrl(teamId));
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, refreshKey]);

  return url;
}
