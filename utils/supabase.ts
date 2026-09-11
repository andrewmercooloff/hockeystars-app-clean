import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  clearCachedSupabaseOrigin,
  preferSupabaseProxyOrigin,
  revalidateSupabaseOriginInBackground,
  resolveSupabaseOrigin,
  SUPABASE_DIRECT_URL,
  SUPABASE_KNOWN_ORIGINS,
  SUPABASE_PROXY_URL,
} from './supabaseRouting';

export {
  clearCachedSupabaseOrigin,
  getSupabaseRouteKind,
  isLikelyRussia,
  SUPABASE_DIRECT_URL,
  SUPABASE_KNOWN_ORIGINS,
  SUPABASE_PROXY_URL,
} from './supabaseRouting';

/** Прямой Supabase (legacy alias). */
export const supabaseLegacyUrl = SUPABASE_DIRECT_URL;

const ENV_LOCKED_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();

export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

let activeSupabaseUrl = ENV_LOCKED_URL || SUPABASE_PROXY_URL;

export function getActiveSupabaseUrl(): string {
  return activeSupabaseUrl;
}

/** Компоненты с уже отрендеренными URL (аватары, обложки) перезапрашивают их после failover. */
const originListeners = new Set<(url: string) => void>();
export const subscribeSupabaseOrigin = (listener: (url: string) => void): (() => void) => {
  originListeners.add(listener);
  return () => {
    originListeners.delete(listener);
  };
};
let originVersion = 0;
export const getSupabaseOriginVersion = () => originVersion;

/** Активный URL API (меняется после probe: direct vs Moscow proxy). */
export function getSupabaseUrl(): string {
  return getActiveSupabaseUrl();
}

/** @deprecated Используйте getActiveSupabaseUrl() — значение может меняться после старта. */
export const supabaseUrl = activeSupabaseUrl;

const rewriteToActiveOrigin = (url: string): string => {
  let next = url;
  for (const origin of SUPABASE_KNOWN_ORIGINS) {
    if (origin !== activeSupabaseUrl) {
      next = next.replace(new RegExp(origin.replace(/\./g, '\\.'), 'gi'), activeSupabaseUrl);
    }
  }
  return next;
};

/** Заменяет любой известный origin Supabase на текущий активный маршрут. */
export const rewriteSupabasePublicUrl = <T extends string | null | undefined>(url: T): T => {
  if (!url || typeof url !== 'string') {
    return url;
  }
  if (!url.includes('.supabase.co') && !url.includes('api.hockey-stars.com')) {
    return url;
  }
  return rewriteToActiveOrigin(url) as T;
};

export const rewriteSupabaseUrlsDeep = <T,>(value: T): T => {
  if (typeof value === 'string') {
    return rewriteSupabasePublicUrl(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteSupabaseUrlsDeep(item)) as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = rewriteSupabaseUrlsDeep(nested);
    }
    return result as T;
  }
  return value;
};

export const getSupabaseFunctionUrl = (functionName: string) =>
  `${getActiveSupabaseUrl()}/functions/v1/${functionName}`;

export const getStorageObjectUrl = (bucket: string, path: string) =>
  `${getActiveSupabaseUrl()}/storage/v1/object/${bucket}/${path}`;

export const getStoragePublicUrl = (bucket: string, path: string) =>
  `${getActiveSupabaseUrl()}/storage/v1/object/public/${bucket}/${path}`;

export class SupabaseNetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'SupabaseNetworkError';
  }
}

export const isSupabaseNetworkError = (error: unknown): boolean => {
  if (error instanceof SupabaseNetworkError) return true;
  const msg = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  const code = String((error as { error?: string; code?: string })?.code ?? '');
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket') ||
    msg.includes('abort') ||
    msg.includes('aborted') ||
    msg.includes('bad gateway') ||
    msg.includes('service unavailable') ||
    code === 'NETWORK_ERROR'
  );
};

export const throwIfSupabaseNetworkError = (error: unknown): void => {
  if (isSupabaseNetworkError(error)) {
    throw new SupabaseNetworkError(
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
};

export const resetSupabaseEndpointPreference = async (): Promise<void> => {
  await clearCachedSupabaseOrigin();
  routingReadyPromise = null;
};

const SUPABASE_RETRY_DELAYS_MS = [250, 500, 1000];
const SUPABASE_RETRYABLE_STATUSES = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isRetryableMethod = (init?: RequestInit): boolean => {
  const method = (init?.method ?? 'GET').toUpperCase();
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
};

const isRetryableResponse = (response: Response): boolean =>
  SUPABASE_RETRYABLE_STATUSES.has(response.status);

const normalizeFetchInput = (input: RequestInfo | URL): RequestInfo | URL => {
  if (typeof input === 'string') {
    return rewriteToActiveOrigin(input);
  }
  if (input instanceof URL) {
    return new URL(rewriteToActiveOrigin(input.toString()));
  }
  if (input instanceof Request) {
    const nextUrl = rewriteToActiveOrigin(input.url);
    if (nextUrl === input.url) return input;
    return new Request(nextUrl, input);
  }
  return input;
};

/** Без таймаута fetch на iOS висит до минуты — экран крутится «бесконечно». */
const FETCH_TIMEOUT_READ_MS = 15000;
const FETCH_TIMEOUT_WRITE_MS = 40000;

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): Promise<Response> => {
  if (init?.signal) {
    return fetch(input, init);
  }
  const controller = new AbortController();
  const timeoutMs = isRetryableMethod(init) ? FETCH_TIMEOUT_READ_MS : FETCH_TIMEOUT_WRITE_MS;
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
};

/**
 * Ретраи на сетевые сбои/502/503/504 + подмена origin на активный маршрут.
 * Failover в обе стороны: direct ↔ Moscow proxy — какой путь жив, тем и идём.
 */
export const supabaseFetch: typeof fetch = async (input, init) => {
  const maxAttempts = SUPABASE_RETRY_DELAYS_MS.length + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const normalizedInput = normalizeFetchInput(input);
    try {
      const response = await fetchWithTimeout(normalizedInput, init);
      if (shouldFailoverToProxy(undefined, response)) {
        await failoverToSupabaseProxy();
        return fetchWithTimeout(normalizeFetchInput(input), init);
      }
      if (isRetryableResponse(response) && (await failoverToSupabaseDirect())) {
        return fetchWithTimeout(normalizeFetchInput(input), init);
      }
      if (
        isRetryableMethod(init) &&
        isRetryableResponse(response) &&
        attempt < maxAttempts - 1
      ) {
        await sleep(SUPABASE_RETRY_DELAYS_MS[attempt] ?? 1000);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (shouldFailoverToProxy(error)) {
        await failoverToSupabaseProxy();
        return fetchWithTimeout(normalizeFetchInput(input), init);
      }
      if (isSupabaseNetworkError(error) && (await failoverToSupabaseDirect())) {
        return fetchWithTimeout(normalizeFetchInput(input), init);
      }
      if (isRetryableMethod(init) && isSupabaseNetworkError(error) && attempt < maxAttempts - 1) {
        await sleep(SUPABASE_RETRY_DELAYS_MS[attempt] ?? 1000);
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new SupabaseNetworkError('Network request failed');
};

function buildSupabaseClient(url: string): SupabaseClient {
  return createClient(url, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        apikey: supabaseAnonKey,
      },
    },
    global: {
      fetch: supabaseFetch,
    },
  });
}

export let supabase: SupabaseClient = buildSupabaseClient(activeSupabaseUrl);

let routingReadyPromise: Promise<string> | null = null;
let proxyFailoverPromise: Promise<void> | null = null;

async function failoverToSupabaseProxy(): Promise<void> {
  if (activeSupabaseUrl === SUPABASE_PROXY_URL) return;
  if (!proxyFailoverPromise) {
    proxyFailoverPromise = (async () => {
      await preferSupabaseProxyOrigin();
      await applySupabaseOrigin(SUPABASE_PROXY_URL);
    })().finally(() => {
      proxyFailoverPromise = null;
    });
  }
  await proxyFailoverPromise;
}

let directProbePromise: Promise<boolean> | null = null;
let lastDirectProbeFailAt = 0;
const DIRECT_PROBE_COOLDOWN_MS = 20000;

/**
 * Proxy (VPS) не отвечает с этого устройства — пробуем прямой Supabase.
 * Переключаемся только если direct реально отвечает; неудачную пробу не
 * повторяем чаще раз в 20 с, чтобы не удваивать таймауты на каждом запросе.
 */
async function failoverToSupabaseDirect(): Promise<boolean> {
  if (ENV_LOCKED_URL) return false;
  if (activeSupabaseUrl !== SUPABASE_PROXY_URL) return false;
  if (Date.now() - lastDirectProbeFailAt < DIRECT_PROBE_COOLDOWN_MS) return false;
  if (!directProbePromise) {
    directProbePromise = (async () => {
      const { probeSupabaseOrigin } = await import('./supabaseRouting');
      const direct = await probeSupabaseOrigin(SUPABASE_DIRECT_URL, supabaseAnonKey, 4000);
      if (!direct.ok) {
        lastDirectProbeFailAt = Date.now();
        return false;
      }
      console.warn('🌐 Proxy недоступен — переключаемся на прямой Supabase');
      await applySupabaseOrigin(SUPABASE_DIRECT_URL);
      return true;
    })().finally(() => {
      directProbePromise = null;
    });
  }
  return directProbePromise;
}

const shouldFailoverToProxy = (error?: unknown, response?: Response): boolean => {
  if (activeSupabaseUrl !== SUPABASE_DIRECT_URL) return false;
  if (error && isSupabaseNetworkError(error)) return true;
  if (response && isRetryableResponse(response)) return true;
  return false;
};

async function applySupabaseOrigin(nextUrl: string): Promise<void> {
  if (nextUrl === activeSupabaseUrl) return;

  let reconnectUserId: string | null = null;
  try {
    const { realtimeManager } = await import('./RealtimeManager');
    reconnectUserId = realtimeManager.getConnectedUserId();
    realtimeManager.disconnect();
  } catch {
    // ignore
  }

  activeSupabaseUrl = nextUrl;
  supabase = buildSupabaseClient(nextUrl);
  originVersion += 1;
  originListeners.forEach((listener) => {
    try {
      listener(nextUrl);
    } catch {
      // ignore
    }
  });

  if (reconnectUserId) {
    try {
      const { realtimeManager } = await import('./RealtimeManager');
      await realtimeManager.setupSubscriptions(reconnectUserId);
    } catch {
      // ignore
    }
  }
}

/** Выбирает direct vs Moscow proxy и пересоздаёт клиент при необходимости. */
export async function ensureSupabaseRouting(): Promise<string> {
  if (ENV_LOCKED_URL) {
    if (!routingReadyPromise) {
      routingReadyPromise = (async () => {
        await applySupabaseOrigin(ENV_LOCKED_URL);
        void revalidateSupabaseOriginInBackground(
          activeSupabaseUrl,
          supabaseAnonKey,
          applySupabaseOrigin,
          { lockedUrl: ENV_LOCKED_URL },
        );
        return activeSupabaseUrl;
      })();
    }
    return routingReadyPromise;
  }

  if (!routingReadyPromise) {
    routingReadyPromise = (async () => {
      const resolved = await resolveSupabaseOrigin(supabaseAnonKey);
      await applySupabaseOrigin(resolved);

      void revalidateSupabaseOriginInBackground(resolved, supabaseAnonKey, applySupabaseOrigin);

      return activeSupabaseUrl;
    })();
  }

  return routingReadyPromise;
}

/** Повторная проверка маршрута при возврате из фона (VPN выкл / смена сети). */
export async function refreshSupabaseRoutingOnForeground(): Promise<void> {
  await revalidateSupabaseOriginInBackground(
    activeSupabaseUrl,
    supabaseAnonKey,
    applySupabaseOrigin,
    ENV_LOCKED_URL ? { lockedUrl: ENV_LOCKED_URL } : undefined,
  );
}

// Интерфейсы для базы данных
export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  age: number;
  height: string;
  weight: string;
  avatar?: string;
  email?: string;
  password?: string;
  status?: string;
  birthDate?: string;
  hockeyStartDate?: string;
  experience?: string;
  achievements?: string;
  phone?: string;
  city?: string;
  goals?: string;
  assists?: string;
  country?: string;
  grip?: string;
  games?: string;
  pullUps?: string;
  pushUps?: string;
  plankTime?: string;
  sprint100m?: string;
  longJump?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  read: boolean;
}

export interface FriendRequest {
  id: string;
  from_id: string;
  to_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

// Новые интерфейсы для системы предметов
export interface Item {
  id: string;
  owner_id: string;
  item_type: 'autograph' | 'stick' | 'puck' | 'jersey' | 'custom';
  name: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemRequest {
  id: string;
  requester_id: string;
  owner_id: string;
  item_type: 'autograph' | 'stick' | 'puck' | 'jersey' | 'custom';
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  gift_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MuseumItem {
  id: string;
  player_id: string;
  item_id: string;
  item: {
    id: string;
    name: string;
    image_url: string;
    item_type: 'autograph' | 'stick' | 'puck' | 'jersey' | 'custom';
    created_at: string;
  };
  received_from: {
    id: string;
    name: string;
  };
  custom_name?: string;
  received_at: string;
}

// Функции для работы с игроками
export const getPlayers = async (): Promise<Player[]> => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка загрузки игроков:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ошибка загрузки игроков:', error);
    return [];
  }
};

export const getPlayerById = async (id: string): Promise<Player | null> => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Ошибка получения игрока:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Ошибка получения игрока:', error);
    return null;
  }
};

export const addPlayer = async (player: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Promise<Player | null> => {
  try {
    const { data, error } = await supabase
      .from('players')
      .insert([player])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка добавления игрока:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Ошибка добавления игрока:', error);
    return null;
  }
};

export const updatePlayer = async (id: string, updates: Partial<Player>): Promise<Player | null> => {
  try {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка обновления игрока:', error);
      return null;
    }


    return data;
  } catch (error) {
    console.error('❌ Ошибка обновления игрока:', error);
    return null;
  }
};

export const deletePlayer = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Ошибка удаления игрока:', error);
      return false;
    }


    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления игрока:', error);
    return false;
  }
};

export const findPlayerByCredentials = async (email: string, password: string): Promise<Player | null> => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error) {
      console.error('❌ Ошибка поиска пользователя:', error);
      return null;
    }


    return data;
  } catch (error) {
    console.error('❌ Ошибка поиска пользователя:', error);
    return null;
  }
};

// Функции для работы с сообщениями
export const getMessages = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Ошибка загрузки сообщений:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ошибка загрузки сообщений:', error);
    return [];
  }
};

export const sendMessage = async (message: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      return null;
    }


    return data;
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    return null;
  }
};

// Функции для работы с запросами дружбы
export const getFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('to_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка загрузки запросов дружбы:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ошибка загрузки запросов дружбы:', error);
    return [];
  }
};

export const sendFriendRequest = async (fromId: string, toId: string): Promise<FriendRequest | null> => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .insert([{
        from_id: fromId,
        to_id: toId,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка отправки запроса дружбы:', error);
      return null;
    }


    return data;
  } catch (error) {
    console.error('❌ Ошибка отправки запроса дружбы:', error);
    return null;
  }
};

// Функция для инициализации базы данных
export const initializeDatabase = async (): Promise<boolean> => {
  try {

    
    // Проверяем подключение
    const { data, error } = await supabase
      .from('players')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Ошибка подключения к базе данных:', error);
      return false;
    }

    
    return true;
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    return false;
  }
};

// Функция для очистки всех данных
export const clearAllData = async (): Promise<boolean> => {
  try {

    
    // Удаляем все данные из всех таблиц
    const tables = ['players', 'messages', 'friend_requests', 'notifications'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все записи

      if (error) {
        console.error(`❌ Ошибка очистки таблицы ${table}:`, error);
      } else {

      }
    }


    return true;
  } catch (error) {
    console.error('❌ Ошибка очистки данных:', error);
    return false;
  }
};

// Функции для работы с предметами
export const getItemsByOwner = async (ownerId: string): Promise<Item[]> => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка загрузки предметов:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ошибка загрузки предметов:', error);
    return [];
  }
};

export const createItem = async (item: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<Item | null> => {
  try {
    const { data, error } = await supabase
      .from('items')
      .insert([item])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка создания предмета:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Ошибка создания предмета:', error);
    return null;
  }
};

export const updateItem = async (id: string, updates: Partial<Item>): Promise<Item | null> => {
  try {
    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка обновления предмета:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Ошибка обновления предмета:', error);
    return null;
  }
};

export const deleteItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Ошибка удаления предмета:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления предмета:', error);
    return false;
  }
};

// Функции для работы с запросами на предметы
export const createItemRequest = async (request: Omit<ItemRequest, 'id' | 'created_at' | 'updated_at'>): Promise<ItemRequest | null> => {
  try {
    const { data, error } = await supabase
      .from('item_requests')
      .insert([request])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка создания запроса на предмет:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Ошибка создания запроса на предмет:', error);
    return null;
  }
};

export const getItemRequestsByOwner = async (ownerId: string): Promise<ItemRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('item_requests')
      .select('*')
      .eq('item_owner_id', ownerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка загрузки запросов на предметы:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ошибка загрузки запросов на предметы:', error);
    return [];
  }
};

export const getItemRequestsByRequester = async (requesterId: string): Promise<ItemRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('item_requests')
      .select('*')
      .eq('requester_id', requesterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка загрузки запросов игрока:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ошибка загрузки запросов игрока:', error);
    return [];
  }
};

export const updateItemRequest = async (id: string, status: 'accepted' | 'rejected'): Promise<ItemRequest | null> => {
  try {
    const { data, error } = await supabase
      .from('item_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка обновления запроса на предмет:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Ошибка обновления запроса на предмет:', error);
    return null;
  }
};

// Функции для работы с музеем
export const getPlayerMuseum = async (playerId: string): Promise<MuseumItem[]> => {
  try {
    const { data, error } = await supabase
      .from('player_museum')
      .select('*')
      .eq('player_id', playerId)
      .order('received_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка загрузки музея игрока:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ошибка загрузки музея игрока:', error);
    return [];
  }
};

export const addMuseumItem = async (item: Omit<MuseumItem, 'id' | 'received_at'>): Promise<MuseumItem | null> => {
  try {
    const { data, error } = await supabase
      .from('player_museum')
      .insert([item])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка добавления предмета в музей:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Ошибка добавления предмета в музей:', error);
    return null;
  }
};
