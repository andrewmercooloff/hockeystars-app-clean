type TabScrollHandler = () => void;

const handlers: Record<string, TabScrollHandler | null> = {};

export function registerTabScrollHandler(tabKey: string, handler: TabScrollHandler | null) {
  handlers[tabKey] = handler;
}

export function scrollTabToTop(tabKey: string): boolean {
  const handler = handlers[tabKey];
  if (!handler) return false;
  handler();
  return true;
}
