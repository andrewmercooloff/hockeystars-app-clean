import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import { getStoragePublicUrl, supabase } from './supabase';

/**
 * Team logos and profile covers are convention-addressed files in the public
 * `avatars` bucket — no DB columns, so the feature ships over OTA and admins
 * can fill logos in gradually (in-app or via scripts/upload-team-logos.mjs).
 *
 *   team_logo_{teamId}.png   — transparent PNG, ~512px
 *   cover_{playerId}.jpg     — custom profile cover, ~1200px wide
 */

const BUCKET = 'avatars';
const VERSIONS_KEY = 'hs_asset_versions_v1';

export const teamLogoFileName = (teamId: string) => `team_logo_${teamId}.png`;
export const playerCoverFileName = (playerId: string) => `cover_${playerId}.jpg`;

// ---- cache-busting versions (uploads overwrite the same path) -----------------

let versions: Record<string, number> = {};
let versionsLoaded: Promise<void> | null = null;

const loadVersions = () => {
  if (!versionsLoaded) {
    versionsLoaded = AsyncStorage.getItem(VERSIONS_KEY)
      .then((raw) => {
        if (raw) versions = { ...JSON.parse(raw), ...versions };
      })
      .catch(() => {});
  }
  return versionsLoaded;
};
void loadVersions();

const bumpVersion = (fileName: string) => {
  versions[fileName] = Date.now();
  forgetMissing(fileName);
  AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(versions)).catch(() => {});
};

/**
 * Files we already know are absent (404). Persisted with a TTL so a profile
 * without a cover renders its wallpaper instantly on the next launch too,
 * instead of waiting for a network round-trip to fail.
 */
const MISSING_KEY = 'hs_asset_missing_v1';
const MISSING_TTL_MS = 6 * 60 * 60 * 1000;
let missingAt: Record<string, number> = {};
const missing = new Set<string>();
let missingLoaded: Promise<void> | null = null;
const loadMissing = () => {
  if (!missingLoaded) {
    missingLoaded = AsyncStorage.getItem(MISSING_KEY)
      .then((raw) => {
        if (!raw) return;
        const now = Date.now();
        for (const [name, ts] of Object.entries(JSON.parse(raw) as Record<string, number>)) {
          if (now - ts < MISSING_TTL_MS) {
            missingAt[name] = ts;
            missing.add(name);
          }
        }
      })
      .catch(() => {});
  }
  return missingLoaded;
};
void loadMissing();
const persistMissing = () => {
  AsyncStorage.setItem(MISSING_KEY, JSON.stringify(missingAt)).catch(() => {});
};
const fileNameOf = (url: string) => url.split('?')[0].split('/').pop();

export const markAssetMissing = (url: string) => {
  const name = fileNameOf(url);
  if (!name) return;
  missing.add(name);
  missingAt[name] = Date.now();
  persistMissing();
};
export const isAssetKnownMissing = (url: string) => {
  const name = fileNameOf(url);
  return !!name && missing.has(name);
};
const forgetMissing = (name: string) => {
  missing.delete(name);
  delete missingAt[name];
  persistMissing();
};

/** Resolve whether both caches are hydrated (call before first cover render if you can). */
export const teamAssetsReady = () => Promise.all([loadVersions(), loadMissing()]).then(() => undefined);

/**
 * Warm the disk cache for a cover / logo while the profile data is still loading.
 * A miss is remembered, so the wallpaper fallback shows without waiting.
 */
const warm = async (url: string): Promise<boolean> => {
  if (isAssetKnownMissing(url)) return false;
  try {
    const ok = await Image.prefetch(url, { cachePolicy: 'memory-disk' });
    if (!ok) markAssetMissing(url);
    return ok;
  } catch {
    markAssetMissing(url);
    return false;
  }
};
export const prefetchPlayerCover = (playerId: string) => warm(getPlayerCoverUrl(playerId));
export const prefetchTeamLogo = (teamId: string) => warm(getTeamLogoUrl(teamId));

const publicUrl = (fileName: string) => {
  const base = getStoragePublicUrl(BUCKET, fileName);
  const v = versions[fileName];
  return v ? `${base}?v=${v}` : base;
};

export const getTeamLogoUrl = (teamId: string) => publicUrl(teamLogoFileName(teamId));
export const getPlayerCoverUrl = (playerId: string) => publicUrl(playerCoverFileName(playerId));

// ---- uploads -----------------------------------------------------------------

type Format = 'png' | 'jpeg';

const uploadProcessed = async (
  uri: string,
  fileName: string,
  width: number,
  format: Format
): Promise<string | null> => {
  const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
  let processed = uri;
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width } }], {
      compress: format === 'png' ? 1 : 0.85,
      format: format === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG,
    });
    processed = result.uri;
  } catch (e) {
    console.warn('teamAssets: manipulate failed, uploading original', e);
  }

  let body: FormData | ArrayBuffer;
  if (processed.startsWith('file://') || processed.startsWith('content://')) {
    const form = new FormData();
    form.append('file', { uri: processed, type: contentType, name: fileName } as any);
    body = form;
  } else {
    const res = await fetch(processed);
    if (!res.ok) return null;
    body = await res.arrayBuffer();
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    // URL всегда с ?v=<ts> после загрузки — можно кэшировать на CDN/устройстве надолго
    .upload(fileName, body, { contentType, upsert: true, cacheControl: '31536000' });
  if (error || !data) {
    console.error('teamAssets: upload failed', error);
    return null;
  }
  bumpVersion(fileName);
  return publicUrl(fileName);
};

/** Admin: upload a team emblem (keeps transparency). */
export const uploadTeamLogo = (uri: string, teamId: string) =>
  uploadProcessed(uri, teamLogoFileName(teamId), 512, 'png');

/** Player: upload a custom profile cover. */
export const uploadPlayerCover = (uri: string, playerId: string) =>
  uploadProcessed(uri, playerCoverFileName(playerId), 1200, 'jpeg');

export const removePlayerCover = async (playerId: string): Promise<boolean> => {
  const name = playerCoverFileName(playerId);
  const { error } = await supabase.storage.from(BUCKET).remove([name]);
  if (error) {
    console.error('teamAssets: remove failed', error);
    return false;
  }
  delete versions[name];
  missing.add(name);
  missingAt[name] = Date.now();
  persistMissing();
  AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(versions)).catch(() => {});
  return true;
};

export const removeTeamLogo = async (teamId: string): Promise<boolean> => {
  const name = teamLogoFileName(teamId);
  const { error } = await supabase.storage.from(BUCKET).remove([name]);
  if (error) return false;
  delete versions[name];
  missing.add(name);
  missingAt[name] = Date.now();
  persistMissing();
  AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(versions)).catch(() => {});
  return true;
};
