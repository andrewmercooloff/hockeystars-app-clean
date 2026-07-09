/**
 * Скрытый маршрут (префикс _). Для dev: router.push('/_debug-connection')
 * или web: /_debug-connection
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ensureSupabaseRouting,
  getActiveSupabaseUrl,
  getSupabaseRouteKind,
  isLikelyRussia,
  resetSupabaseEndpointPreference,
  supabase,
  supabaseAnonKey,
  SUPABASE_DIRECT_URL,
  SUPABASE_PROXY_URL,
} from '../utils/supabase';
import { probeSupabaseOrigin } from '../utils/supabaseRouting';
import { lastLoadPlayersError, loadPlayers } from '../utils/playerStorage';

type Line = { ok: boolean; text: string };

export default function DebugConnectionScreen() {
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);

  const push = useCallback((ok: boolean, text: string) => {
    setLines((prev) => [...prev, { ok, text }]);
  }, []);

  const runTests = useCallback(async () => {
    setRunning(true);
    setLines([]);

    push(true, `Вероятно РФ (locale/tz): ${isLikelyRussia() ? 'да' : 'нет'}`);
    push(true, `Direct: ${SUPABASE_DIRECT_URL}`);
    push(true, `Proxy (Москва): ${SUPABASE_PROXY_URL}`);

    await resetSupabaseEndpointPreference();
    const activeUrl = await ensureSupabaseRouting();
    const routeKind = getSupabaseRouteKind(activeUrl);
    push(true, `Активный маршрут: ${routeKind} → ${getActiveSupabaseUrl()}`);

    const directProbe = await probeSupabaseOrigin(SUPABASE_DIRECT_URL, supabaseAnonKey, 4000);
    push(directProbe.ok, `Probe direct: ${directProbe.ok ? 'OK' : 'FAIL'} (${directProbe.ms} ms)`);

    const proxyProbe = await probeSupabaseOrigin(SUPABASE_PROXY_URL, supabaseAnonKey, 4000);
    push(proxyProbe.ok, `Probe proxy: ${proxyProbe.ok ? 'OK' : 'FAIL'} (${proxyProbe.ms} ms)`);

    const t1 = Date.now();
    try {
      const { error } = await supabase.from('players').select('id').limit(1);
      const ms = Date.now() - t1;
      if (error) {
        push(false, `Supabase client (players): ${error.message} (${ms} ms)`);
      } else {
        push(true, `Supabase client (players): OK (${ms} ms)`);
      }
    } catch (e) {
      push(false, `Supabase client: ${e instanceof Error ? e.message : String(e)}`);
    }

    const tCount = Date.now();
    try {
      const { count, error: countErr } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true });
      const msCount = Date.now() - tCount;
      if (countErr) {
        push(false, `COUNT players: ${countErr.message} (${msCount} ms)`);
      } else {
        push(true, `COUNT players: ${count ?? '?'} (${msCount} ms)`);
      }
    } catch (e) {
      push(false, `COUNT players: ${e instanceof Error ? e.message : String(e)}`);
    }

    const t2 = Date.now();
    try {
      const players = await loadPlayers(true);
      const ms = Date.now() - t2;
      const errHint = lastLoadPlayersError ? ` | ${lastLoadPlayersError}` : '';
      push(
        players.length > 0,
        `loadPlayers(force): ${players.length} игроков (${ms} ms)${errHint}`,
      );
    } catch (e) {
      push(false, `loadPlayers: ${e instanceof Error ? e.message : String(e)}`);
    }

    setRunning(false);
  }, [push]);

  useEffect(() => {
    void runTests();
  }, [runTests]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Диагностика Supabase</Text>
      <Text style={styles.hint}>
        За пределами РФ — direct; в РФ при блокировке — Moscow proxy.
      </Text>
      {lines.map((line, i) => (
        <Text key={i} style={[styles.line, line.ok ? styles.ok : styles.fail]}>
          {line.ok ? '✓' : '✗'} {line.text}
        </Text>
      ))}
      {running && <ActivityIndicator style={{ marginTop: 16 }} />}
      <Pressable style={styles.btn} onPress={() => void runTests()} disabled={running}>
        <Text style={styles.btnText}>Повторить тест</Text>
      </Pressable>
      <Pressable
        style={[styles.btn, styles.btnSecondary]}
        onPress={async () => {
          await resetSupabaseEndpointPreference();
          push(true, 'Сброшен кеш маршрута — перезапустите тест');
        }}
      >
        <Text style={styles.btnText}>Сбросить кеш маршрута</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#050008', flexGrow: 1 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  hint: { color: '#aaa', marginBottom: 20, fontSize: 14 },
  line: { fontSize: 13, marginBottom: 8, fontFamily: 'monospace' },
  ok: { color: '#6f6' },
  fail: { color: '#f88' },
  btn: {
    marginTop: 16,
    backgroundColor: '#c41e3a',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondary: { backgroundColor: '#333' },
  btnText: { color: '#fff', fontWeight: '600' },
});
