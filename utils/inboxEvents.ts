import { DeviceEventEmitter } from 'react-native';

/**
 * App-wide "something changed in messages" signal.
 *
 * Realtime subscriptions miss INSERTs while the app is in the background
 * (the socket drops), so the inbox and open chat re-fetch on:
 *   - a message push arriving in the foreground,
 *   - the app returning to the foreground,
 *   - explicit requests (e.g. after sending a message from a different screen).
 */
const INBOX_REFRESH_EVENT = 'hs:inbox-refresh';

export type InboxRefreshReason = 'push' | 'foreground' | 'manual';

export function emitInboxRefresh(reason: InboxRefreshReason = 'manual', peerId?: string): void {
  DeviceEventEmitter.emit(INBOX_REFRESH_EVENT, { reason, peerId });
}

export function onInboxRefresh(
  handler: (payload: { reason: InboxRefreshReason; peerId?: string }) => void
): () => void {
  const sub = DeviceEventEmitter.addListener(INBOX_REFRESH_EVENT, handler);
  return () => sub.remove();
}

export const isMessagePushType = (type: unknown): boolean =>
  type === 'message' || type === 'new_message';
