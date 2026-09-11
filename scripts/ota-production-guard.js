#!/usr/bin/env node
/**
 * Blocks incomplete or stale OTA bundles from reaching production.
 * Run via: npm run ota:production -- --message "..."
 *
 * Why: feature work lives on many cursor/* branches. Publishing OTA from main
 * (design refresh only) or an old branch rolls back notifications, reactions,
 * scout cache, maps, OTA fixes, etc.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function die(msg) {
  console.error('\n❌ OTA guard blocked publish:\n' + msg + '\n');
  process.exit(1);
}

const branch = sh('git branch --show-current');

/** Only these branches may publish production OTA without override. */
const ALLOWED_BRANCHES = new Set(['main', 'cursor/consolidated-release-51f6']);

if (!ALLOWED_BRANCHES.has(branch) && process.env.OTA_ALLOW_ANY_BRANCH !== '1') {
  die(
    `Branch "${branch}" cannot publish production OTA.\n` +
      'Merge into main (or cursor/consolidated-release-51f6), then publish.\n' +
      'Emergency override: OTA_ALLOW_ANY_BRANCH=1 npm run ota:production'
  );
}

/** Files/markers that must exist — catches partial merges and stale main-only publishes. */
const REQUIRED_MARKERS = [
  { file: 'utils/pickVideoFromLibrary.ts', needle: 'export async function pickVideoFromLibrary' },
  { file: 'utils/homeSceneSignal.ts', needle: 'markHomeSceneReady' },
  { file: 'utils/otaLaunch.ts', needle: 'shouldSkipSplashAfterOta' },
  { file: 'hooks/useOtaUpdates.ts', needle: 'reloadAsync' },
  { file: 'utils/playerStorage.ts', needle: 'peekCachedPlayersList' },
  { file: 'app/search.tsx', needle: 'scoutListSessionCache' },
  { file: 'components/ShopLocationMap.tsx', needle: 'EXPO_PUBLIC_CARTO_API_KEY' },
  { file: 'components/CompactReactionBar.tsx', needle: 'NOTIFICATION_FEED_REACTIONS' },
  { file: 'components/MessageReactionsBar.tsx', needle: 'inline' },
  { file: 'utils/reactions.ts', needle: 'PROFILE_REACTIONS' },
  { file: 'app/index.tsx', needle: 'MIN_COUNTRY_PLAYERS_FOR_DEFAULT_FILTER' },
  { file: 'components/ReactionReceivedNotification.tsx', needle: 'ReactionReceivedNotification' },
  { file: 'eas.json', needle: 'EXPO_PUBLIC_CARTO_API_KEY' },
  { file: 'scripts/ota-production-guard.js', needle: 'ALLOWED_BRANCHES' },
];

for (const { file, needle } of REQUIRED_MARKERS) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) {
    die(`Missing required file: ${file}\nPublish from consolidated-release after merging all agent fixes.`);
  }
  const text = fs.readFileSync(abs, 'utf8');
  if (!text.includes(needle)) {
    die(`File ${file} is missing expected marker "${needle}".\nYour branch looks incomplete for production OTA.`);
  }
}

if (sh('git status --porcelain')) {
  die('Working tree has uncommitted changes. Commit and push before OTA.');
}

console.log(`✅ OTA guard OK (branch: ${branch}, markers: ${REQUIRED_MARKERS.length})`);
