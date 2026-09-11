/**
 * Мостик «главная готова» между экраном льда и заставкой в корневом лэйауте.
 *
 * Заставка раньше уходила по своему таймеру, а шайбы проявлялись позже — между
 * ними был кадр пустого льда. Теперь главная сообщает, что смонтирована и что
 * сцена проявилась, а лэйаут держит логотип до этого момента (с потолком по
 * времени, чтобы зависшая загрузка не оставила заставку навсегда).
 */

type Listener = () => void;

let mounted = false;
let ready = false;
const listeners = new Set<Listener>();

const emit = () => {
  for (const listener of Array.from(listeners)) listener();
};

export const markHomeSceneMounted = () => {
  if (mounted) return;
  mounted = true;
  emit();
};

export const markHomeSceneReady = () => {
  if (ready) return;
  ready = true;
  emit();
};

export const isHomeSceneMounted = () => mounted;
export const isHomeSceneReady = () => ready;

export const subscribeHomeScene = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
