type FeedRefreshListener = () => void;

export function parseNotificationData(data: unknown): Record<string, unknown> | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

/** Resolve profile id from notification payload (supports legacy field names). */
export function resolveNotificationPlayerId(
  notification: { data?: unknown; playerId?: string | null }
): string | null {
  const data = parseNotificationData(notification.data);
  const raw =
    data?.changedPlayerId ??
    data?.playerId ??
    data?.player_id ??
    notification.playerId;
  const id = raw != null ? String(raw).trim() : '';
  return id || null;
}

const listeners = new Set<FeedRefreshListener>();

/** Subscribe to in-app notification list refresh (e.g. after push while feed is open). */
export function subscribeNotificationFeedRefresh(listener: FeedRefreshListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitNotificationFeedRefresh(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}
