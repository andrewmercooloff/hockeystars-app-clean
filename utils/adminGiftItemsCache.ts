import { supabase } from './supabase';
import { prefetchGiftImages } from './giftImage';

export type AdminGiftItem = {
  id: string;
  item_type: 'autograph' | 'stick' | 'puck' | 'jersey' | 'custom';
  name: string;
  image_url?: string | null;
  created_at: string;
};

const ITEM_COLUMNS = 'id,item_type,name,image_url,created_at';
const CACHE_TTL_MS = 10 * 60_000;

const cache = new Map<string, { items: AdminGiftItem[]; fetchedAt: number }>();
const inflight = new Map<string, Promise<AdminGiftItem[]>>();

export function getCachedAdminGiftItems(adminId: string): AdminGiftItem[] | null {
  const entry = cache.get(adminId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.items;
}

export function invalidateAdminGiftItemsCache(adminId: string): void {
  cache.delete(adminId);
}

async function fetchAdminGiftItems(adminId: string): Promise<AdminGiftItem[]> {
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_COLUMNS)
    .eq('owner_id', adminId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const items = (data ?? []) as AdminGiftItem[];
  cache.set(adminId, { items, fetchedAt: Date.now() });
  void prefetchGiftImages(items.map((item) => item.image_url));
  return items;
}

/** Load admin gifts; returns cache instantly when fresh unless force=true. */
export async function loadAdminGiftItems(
  adminId: string,
  options?: { force?: boolean },
): Promise<AdminGiftItem[]> {
  if (!options?.force) {
    const cached = getCachedAdminGiftItems(adminId);
    if (cached) return cached;
  }

  const pending = inflight.get(adminId);
  if (pending) return pending;

  const task = fetchAdminGiftItems(adminId).finally(() => {
    inflight.delete(adminId);
  });
  inflight.set(adminId, task);
  return task;
}

/** Warm cache before the gift modal opens. */
export function prefetchAdminGiftItems(adminId: string): void {
  if (!adminId) return;
  if (getCachedAdminGiftItems(adminId)) return;
  if (inflight.has(adminId)) return;
  void loadAdminGiftItems(adminId).catch(() => {});
}
