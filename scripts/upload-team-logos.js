#!/usr/bin/env node
/**
 * Bulk-upload team emblems for profile covers.
 *
 * Put PNG files into a folder and name each one after the team as it is stored
 * in the `teams` table (case/punctuation-insensitive), e.g.
 *   logos/Динамо Москва.png
 *   logos/ska.png
 * or address a team directly by id:
 *   logos/id_3f2c…-uuid.png
 *
 * Usage:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/upload-team-logos.js ./logos
 *   node scripts/upload-team-logos.js ./logos --list      # only print teams without a logo
 *   node scripts/upload-team-logos.js ./logos --dry-run
 *
 * Files go to the public `avatars` bucket as team_logo_{teamId}.png — the same
 * path the app reads (utils/teamAssets.ts), so covers update without a release.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const listOnly = args.includes('--list');
const dryRun = args.includes('--dry-run');

const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '');

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: teams, error } = await supabase.from('teams').select('id, name, name_ru, city, country');
  if (error) throw error;

  const { data: existing } = await supabase.storage.from('avatars').list('', { limit: 5000, search: 'team_logo_' });
  const haveLogo = new Set((existing || []).map((f) => f.name.replace(/^team_logo_/, '').replace(/\.png$/, '')));

  if (listOnly || !dir) {
    const missing = teams.filter((t) => !haveLogo.has(t.id));
    console.log(`${teams.length} teams, ${haveLogo.size} with logo, ${missing.length} without:\n`);
    for (const t of missing) {
      console.log(`  ${t.name}${t.name_ru && t.name_ru !== t.name ? ` / ${t.name_ru}` : ''}  (${[t.city, t.country].filter(Boolean).join(', ')})  id=${t.id}`);
    }
    return;
  }

  const byName = new Map();
  for (const t of teams) {
    byName.set(norm(t.name), t);
    if (t.name_ru) byName.set(norm(t.name_ru), t);
  }

  const files = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f));
  let ok = 0;
  const unmatched = [];
  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    let team = null;
    if (base.startsWith('id_')) {
      team = teams.find((t) => t.id === base.slice(3));
    } else {
      team = byName.get(norm(base)) || null;
    }
    if (!team) {
      unmatched.push(file);
      continue;
    }
    const target = `team_logo_${team.id}.png`;
    if (dryRun) {
      console.log(`[dry] ${file} -> ${target} (${team.name})`);
      continue;
    }
    const body = fs.readFileSync(path.join(dir, file));
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(target, body, { contentType: 'image/png', upsert: true, cacheControl: '3600' });
    if (upErr) {
      console.error(`FAIL ${file}: ${upErr.message}`);
    } else {
      ok += 1;
      console.log(`OK   ${file} -> ${team.name}`);
    }
  }
  console.log(`\nUploaded ${ok}/${files.length}.`);
  if (unmatched.length) {
    console.log('\nNo team matched for:');
    unmatched.forEach((f) => console.log(`  ${f}`));
    console.log('\nRun with --list to see exact team names, or rename the file to id_<teamId>.png');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
