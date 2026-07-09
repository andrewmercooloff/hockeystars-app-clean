// Ежедневный push дайджест: пользователи с profile_views_today > 0, окно 18:00–21:00 по их notification_timezone,
// псевдослучайная минута внутри окна от хэша user id. Cron: вызывать каждые 5–10 минут (Supabase Scheduler / внешний cron).
// Секрет: установите CRON_SECRET и передавайте Authorization: Bearer <CRON_SECRET>. Для вызова из Dashboard JWT — отключите verify JWT для этой функции.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// JSON включается в бандл при deploy (readTextFile для соседнего файла не подхватывался).
import STRINGS_FILE from './strings.json' with { type: 'json' }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

type StringsFile = Record<
  string,
  { title: string; body: Record<string, string> }
>

const STRINGS = STRINGS_FILE as StringsFile

const SUPPORTED_LANGS = new Set([
  'ru',
  'en',
  'lt',
  'lv',
  'pl',
  'sv',
  'cs',
  'sk',
  'fi',
  'it',
  'de',
  'fr',
])

const WINDOW_START_MIN = 18 * 60
const WINDOW_END_MIN = 21 * 60
const SLOT_SPAN = WINDOW_END_MIN - WINDOW_START_MIN

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function hashUserIdToSlotOffset(userId: string): number {
  let h = 0
  for (let i = 0; i < userId.length; i++) {
    h = (Math.imul(31, h) + userId.charCodeAt(i)) | 0
  }
  return Math.abs(h) % SLOT_SPAN
}

function getLocalDateAndMinutes(
  timeZone: string,
  now: Date,
): { ymd: string; minutesFromMidnight: number } {
  const tz = timeZone || 'UTC'
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = dtf.formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00'
  const y = get('year')
  const m = get('month')
  const day = get('day')
  const hour = parseInt(get('hour'), 10)
  const minute = parseInt(get('minute'), 10)
  return {
    ymd: `${y}-${m}-${day}`,
    minutesFromMidnight: hour * 60 + minute,
  }
}

function normalizeLang(raw: string | null | undefined): string {
  const code = (raw || 'en').split('-')[0].toLowerCase()
  return SUPPORTED_LANGS.has(code) ? code : 'en'
}

function resolveBodyTemplate(lang: string, count: number): { title: string; body: string } {
  const pack = STRINGS[lang] || STRINGS.en
  let rule: string = 'other'
  try {
    rule = new Intl.PluralRules(lang).select(count)
  } catch {
    try {
      rule = new Intl.PluralRules('en').select(count)
    } catch {
      rule = 'other'
    }
  }
  const bodyMap = pack.body
  const tpl =
    bodyMap[rule] ??
    bodyMap.other ??
    bodyMap.many ??
    bodyMap.few ??
    bodyMap.one ??
    Object.values(bodyMap)[0]
  const body = tpl.replace(/\{\{count\}\}/g, String(count))
  return { title: pack.title, body }
}

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data: Record<string, unknown>
  sound?: string
  priority?: string
}

async function sendExpoBatch(messages: ExpoPushMessage[]): Promise<void> {
  const chunkSize = 99
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize)
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Expo push HTTP error', res.status, text)
    }
  }
}

serve(async (req) => {
  const headers = corsHeaders()
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const now = new Date()

    // Сбрасываем profile_views_today для всех у кого дата сброса не сегодня (UTC).
    // Это гарантирует, что старые счётчики не "зависают" и дайджест не повторяет одно значение.
    await supabase
      .from('players')
      .update({ profile_views_today: 0, profile_views_reset_at: now.toISOString().slice(0, 10) })
      .lt('profile_views_reset_at', now.toISOString().slice(0, 10))

    const { data: players, error: pErr } = await supabase
      .from('players')
      .select(
        'id, profile_views_today, language, notification_timezone, profile_views_digest_sent_on',
      )
      .gt('profile_views_today', 0)

    if (pErr) {
      console.error('players select', pErr)
      return new Response(JSON.stringify({ success: false, error: pErr.message }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const list = players || []
    if (list.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, candidates: 0 }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const ids = list.map((p) => p.id)
    const { data: tokenRows, error: tErr } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', ids)

    if (tErr) {
      console.error('push_tokens', tErr)
      return new Response(JSON.stringify({ success: false, error: tErr.message }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const tokensByUser = new Map<string, string[]>()
    for (const row of tokenRows || []) {
      if (!row.token || !row.user_id) continue
      const arr = tokensByUser.get(row.user_id) || []
      arr.push(row.token)
      tokensByUser.set(row.user_id, arr)
    }

    const messages: ExpoPushMessage[] = []
    const sentUserIds: string[] = []
    const localDatesToSet = new Map<string, string>()

    for (const p of list) {
      const uid = p.id
      const tokens = tokensByUser.get(uid)
      if (!tokens?.length) continue

      const tz = (p.notification_timezone as string) || 'UTC'
      const { ymd, minutesFromMidnight } = getLocalDateAndMinutes(tz, now)

      const sentRaw = p.profile_views_digest_sent_on as string | null
      if (sentRaw && sentRaw === ymd) continue

      if (minutesFromMidnight < WINDOW_START_MIN || minutesFromMidnight >= WINDOW_END_MIN) {
        continue
      }

      const slotStart = WINDOW_START_MIN + hashUserIdToSlotOffset(uid)
      if (minutesFromMidnight < slotStart) continue

      const lang = normalizeLang(p.language as string | null)
      const count = Number(p.profile_views_today) || 0
      if (count <= 0) continue

      const { title, body } = resolveBodyTemplate(lang, count)

      for (const to of [...new Set(tokens)]) {
        messages.push({
          to,
          title,
          body,
          sound: 'default',
          priority: 'high',
          data: {
            type: 'profile_views_digest',
            profileViewsToday: count,
          },
        })
      }
      sentUserIds.push(uid)
      localDatesToSet.set(uid, ymd)
    }

    if (messages.length > 0) {
      await sendExpoBatch(messages)
    }

    for (const uid of sentUserIds) {
      const ymd = localDatesToSet.get(uid)
      if (!ymd) continue
      const { error: uErr } = await supabase
        .from('players')
        .update({ profile_views_digest_sent_on: ymd })
        .eq('id', uid)
      if (uErr) console.error('update digest sent', uid, uErr)
    }

    return new Response(
      JSON.stringify({
        success: true,
        candidates: list.length,
        usersNotified: sentUserIds.length,
        pushMessages: messages.length,
      }),
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error(e)
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } },
    )
  }
})
