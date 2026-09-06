import AsyncStorage from '@react-native-async-storage/async-storage';
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
  missing.delete(fileName);
  AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(versions)).catch(() => {});
};

/** Files we already know are absent (404) — skip re-requesting them this session. */
const missing = new Set<string>();
export const markAssetMissing = (url: string) => {
  const name = url.split('?')[0].split('/').pop();
  if (name) missing.add(name);
};
export const isAssetKnownMissing = (url: string) => {
  const name = url.split('?')[0].split('/').pop();
  return !!name && missing.has(name);
};

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
    .upload(fileName, body, { contentType, upsert: true, cacheControl: '3600' });
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
  AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(versions)).catch(() => {});
  return true;
};

export const removeTeamLogo = async (teamId: string): Promise<boolean> => {
  const name = teamLogoFileName(teamId);
  const { error } = await supabase.storage.from(BUCKET).remove([name]);
  if (error) return false;
  delete versions[name];
  missing.add(name);
  AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(versions)).catch(() => {});
  return true;
};
