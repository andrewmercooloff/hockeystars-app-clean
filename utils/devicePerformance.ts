import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type PerformanceLevel = 'high' | 'medium' | 'low';

/** Уровень производительности устройства (FPS, отложенный старт, lazy-вкладки). */
export const getPerformanceLevel = (): PerformanceLevel => {
  const yearClass = Device.deviceYearClass ?? null;
  const totalMemory = Device.totalMemory ?? null;

  if (Platform.OS === 'ios') {
    if (yearClass && yearClass < 2020) return 'medium';
    return 'high';
  }

  if (Platform.OS === 'android') {
    if (Device.isDevice === false) return 'low';

    const memoryInGb = totalMemory ? totalMemory / 1024 ** 3 : null;

    if (yearClass && yearClass >= 2023) return 'high';

    if ((memoryInGb && memoryInGb <= 4) || (yearClass && yearClass <= 2020)) {
      return 'low';
    }

    if (yearClass && yearClass < 2023) return 'medium';

    return 'high';
  }

  if (Platform.OS === 'web') return 'high';
  return 'high';
};

export const isLowEndAndroid = (): boolean =>
  Platform.OS === 'android' && getPerformanceLevel() !== 'high';

/** Задержка перед тяжёлой работой после первого кадра UI. */
export const androidStartupDeferMs = (): number => {
  const level = getPerformanceLevel();
  if (level === 'low') return 1400;
  if (level === 'medium') return 800;
  return 0;
};

/** Нужен ли отложенный старт физики (только слабый Android). */
export const shouldDeferStartupPhysics = (): boolean => isLowEndAndroid();

/** Пауза перед включением физики шайб после первого кадра (только Android). */
export const startupPhysicsDeferMs = (): number => androidStartupDeferMs();

/** Период после инициализации шайб с упрощённым рендером (без интерполяции). */
export const startupRenderGraceMs = (): number =>
  Platform.OS === 'android' && getPerformanceLevel() !== 'high' ? 1600 : 0;

