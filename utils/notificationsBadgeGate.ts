/**
 * Пока пользователь на экране уведомлений — не поднимаем бейдж из Realtime/БД
 * (иначе 0 → 5 → 0 при mark-as-read и sync players.unread_notifications_count).
 */
let notificationsScreenFocused = false;
let suppressBadgeUntilMs = 0;

export function setNotificationsScreenFocused(focused: boolean): void {
  notificationsScreenFocused = focused;
  if (focused) {
    suppressBadgeUntilMs = Date.now() + 8000;
  }
}

export function extendNotificationsBadgeSuppressMs(ms: number): void {
  suppressBadgeUntilMs = Math.max(suppressBadgeUntilMs, Date.now() + ms);
}

export function isNotificationsBadgeSuppressed(): boolean {
  return notificationsScreenFocused || Date.now() < suppressBadgeUntilMs;
}

/** Применяет счётчик к UI: на экране уведомлений — всегда 0. */
export function resolveNotificationsBadgeCount(proposed: number): number {
  if (isNotificationsBadgeSuppressed()) {
    return 0;
  }
  return Math.max(0, proposed);
}
