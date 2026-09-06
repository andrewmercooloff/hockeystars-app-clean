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

/** IP VPS (Timeweb). Запрос по IP минует DNS: если хост не открывается, а IP — да, проблема в резолвере. */
const VPS_IP = '5.42.123.84';

const timedFetch = async (
  url: string,
  timeoutMs = 6000,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number | null; ms: number; err?: string }> => {
  const t0 = Date.now();
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' as any });
    return { ok: true, status: res.status, ms: Date.now() - t0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      status: null,
      ms: Date.now() - t0,
      err: /abort/i.test(msg) ? `таймаут ${timeoutMs} мс` : msg,
    };
  } finally {
    clearTimeout(tid);
  }
};

export default function DebugConnectionScreen() {
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);

  const push = useCallback((ok: boolean, text: string) => {
    setLines((prev) => [...prev, { ok, text }]);
  }, []);

  const runTests = useCallback(async () => {
    setRunning(true);
    setLines([]);

    push(true, `Время: ${new Date().toLocaleTimeString()}`);
    push(true, `Вероятно РФ (locale/tz): ${isLikelyRussia() ? 'да' : 'нет'}`);
    push(true, `Direct: ${SUPABASE_DIRECT_URL}`);
    push(true, `Proxy (Москва): ${SUPABASE_PROXY_URL}`);

    // --- Слой 1: интернет вообще есть? (независимые хосты) ---
    const ya = await timedFetch('https://ya.ru/', 6000, { method: 'HEAD' });
    push(ya.ok, `Интернет (ya.ru): ${ya.ok ? `OK ${ya.status}` : `FAIL ${ya.err}`} (${ya.ms} ms)`);
    const g = await timedFetch('https://www.gstatic.com/generate_204', 6000);
    push(g.ok, `Зарубежный хост (gstatic): ${g.ok ? `OK ${g.status}` : `FAIL ${g.err}`} (${g.ms} ms)`);

    // --- Слой 2: наш VPS — по имени и по IP ---
    const site = await timedFetch('https://hockey-stars.com/', 6000, { method: 'HEAD' });
    push(site.ok, `VPS по имени (hockey-stars.com): ${site.ok ? `OK ${site.status}` : `FAIL ${site.err}`} (${site.ms} ms)`);
    let byIp = await timedFetch(`http://${VPS_IP}/`, 6000, { method: 'HEAD' });
    if (!byIp.ok && /cleartext|not permitted/i.test(byIp.err ?? '')) {
      // Android release запрещает http — идём по https: ошибка сертификата = TCP/TLS до сервера дошли.
      const tls = await timedFetch(`https://${VPS_IP}/`, 6000, { method: 'HEAD' });
      const certError = /certificate|cert|hostname|verified|ssl|trust/i.test(tls.err ?? '');
      byIp = tls.ok || certError ? { ok: true, status: tls.status, ms: tls.ms } : tls;
    }
    push(byIp.ok, `VPS по IP (${VPS_IP}): ${byIp.ok ? `OK ${byIp.status ?? 'TLS'}` : `FAIL ${byIp.err}`} (${byIp.ms} ms)`);
    if (!site.ok && byIp.ok) {
      push(false, '→ Имя не резолвится, IP отвечает: проблема в DNS этого устройства (профиль DNS / Private Relay / кеш).');
    }
    if (!site.ok && !byIp.ok && ya.ok) {
      push(false, '→ Интернет есть, VPS недоступен и по имени, и по IP: фильтр по IP на пути (оператор/TSPU или защита хостинга).');
    }

    // --- Слой 3: внешний IP (с какого адреса нас видит сервер) ---
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(tid);
      const j = (await res.json()) as { ip?: string };
      push(true, `Внешний IP: ${j.ip ?? '?'}`);
    } catch {
      push(false, 'Внешний IP: не удалось определить');
    }

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
      <Text style={styles.title}>Диагностика сети</Text>
      <Text style={styles.hint}>
        Запусти во время сбоя и пришли скриншот. Красные строки покажут, на каком слое обрыв:
        интернет → DNS → VPS → Supabase.
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
  btnSecondary: { backgroundColor: '#2a2430' },
  btnText: { color: '#fff', fontWeight: '600' },
});
