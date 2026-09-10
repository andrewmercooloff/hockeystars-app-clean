#!/usr/bin/env node
/**
 * Blocks incomplete OTA bundles from reaching production.
 * Run via: npm run ota:production -- --message "..."
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

/** Branches known to be incomplete if published alone (missing merged agent fixes). */
const BLOCKED_BRANCHES = new Set(['cursor/profile-preview-contain-51f6']);

if (BLOCKED_BRANCHES.has(branch)) {
  die(
    `Branch "${branch}" must not be published alone — it lacks video/SMS/splash fixes.\n` +
      'Merge into cursor/video-upload-fix-51f6 or main, then publish from there.'
  );
}

/** Files/markers that must exist in any production OTA after Sep 2026 agent work. */
const REQUIRED_MARKERS = [
  { file: 'utils/pickVideoFromLibrary.ts', needle: 'export async function pickVideoFromLibrary' },
  { file: 'utils/homeSceneSignal.ts', needle: 'markHomeSceneReady' },
  { file: 'app/register.tsx', needle: 'proceedAfterContactVerified' },
  { file: 'components/FriendshipNotification.tsx', needle: "t('common.and')" },
  { file: 'utils/mediaTileSize.ts', needle: 'widthForAspectHeight' },
  { file: 'components/VideoPlayer.tsx', needle: "layoutMode?: 'default' | 'modal'" },
  { file: 'scripts/ota-production-guard.js', needle: 'BLOCKED_BRANCHES' },
];

for (const { file, needle } of REQUIRED_MARKERS) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) {
    die(`Missing required file: ${file}\nPublish from a branch that includes all recent fixes.`);
  }
  const text = fs.readFileSync(abs, 'utf8');
  if (!text.includes(needle)) {
    die(`File ${file} is missing expected marker "${needle}".\nYour branch looks incomplete for production OTA.`);
  }
}

/** Warn when not on main or the consolidated release branch (still allow with env override). */
const PREFERRED_BRANCHES = new Set(['main', 'cursor/video-upload-fix-51f6']);
if (!PREFERRED_BRANCHES.has(branch) && process.env.OTA_ALLOW_ANY_BRANCH !== '1') {
  console.warn(
    `\n⚠️  OTA guard: branch "${branch}" is not main or cursor/video-upload-fix-51f6.\n` +
      '    Markers passed, but prefer merging to main before OTA.\n' +
      '    Set OTA_ALLOW_ANY_BRANCH=1 to silence this warning.\n'
  );
}

if (sh('git status --porcelain')) {
  die('Working tree has uncommitted changes. Commit and push before OTA.');
}

console.log(`✅ OTA guard OK (branch: ${branch}, markers: ${REQUIRED_MARKERS.length})`);
