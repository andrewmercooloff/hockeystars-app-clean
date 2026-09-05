/**
 * One-time rollover to season 26/27:
 * - Archive 25/26 stats into players.season_stats
 * - Reset current stat columns to 0
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env
 * Run SQL migration first: supabase/migrations/20260902_season_stats.sql
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const PREVIOUS_SEASON = '25/26';
const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

function hasStats(row) {
  return ['goals', 'assists', 'games', 'minutes', 'shots', 'saves'].some(
    (k) => (parseInt(row[k], 10) || 0) > 0,
  );
}

function buildArchive(row) {
  return {
    goals: parseInt(row.goals, 10) || 0,
    assists: parseInt(row.assists, 10) || 0,
    games: parseInt(row.games, 10) || 0,
    minutes: parseInt(row.minutes, 10) || 0,
    shots: parseInt(row.shots, 10) || 0,
    saves: parseInt(row.saves, 10) || 0,
  };
}

async function main() {
  const probe = await supabase.from('players').select('id, season_stats').limit(1);
  if (probe.error && /season_stats/i.test(probe.error.message || '')) {
    console.error('Column season_stats missing. Run supabase/migrations/20260902_season_stats.sql first.');
    process.exit(1);
  }

  let from = 0;
  const pageSize = 200;
  let archived = 0;
  let skipped = 0;

  while (true) {
    const { data, error } = await supabase
      .from('players')
      .select('id, goals, assists, games, minutes, shots, saves, season_stats')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const existing = row.season_stats && typeof row.season_stats === 'object' ? row.season_stats : {};
      if (existing[PREVIOUS_SEASON]) {
        skipped++;
        continue;
      }
      if (!hasStats(row)) {
        skipped++;
        continue;
      }

      const seasonStats = {
        ...existing,
        [PREVIOUS_SEASON]: buildArchive(row),
      };

      const { error: updErr } = await supabase
        .from('players')
        .update({
          season_stats: seasonStats,
          goals: 0,
          assists: 0,
          games: 0,
          minutes: 0,
          shots: 0,
          saves: 0,
        })
        .eq('id', row.id);

      if (updErr) {
        console.error('Failed for', row.id, updErr.message);
        process.exit(1);
      }
      archived++;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Season rollover done. Archived: ${archived}, skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
