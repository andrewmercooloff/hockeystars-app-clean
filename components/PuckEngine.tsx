import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Dimensions, Platform, Vibration } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import Puck from './Puck';
import { Player } from '../utils/playerStorage';

// Размер шайбы (как на главном экране)
export const PUCK_SIZE = 70;

// Определение уровня производительности устройства
// ТОЛЬКО для FPS - скорость шайб теперь одинаковая для всех устройств
export const getPerformanceLevel = (): 'high' | 'medium' | 'low' => {
  const yearClass = Device.deviceYearClass ?? null;
  const totalMemory = Device.totalMemory ?? null;

  if (Platform.OS === 'ios') {
    if (yearClass && yearClass < 2020) return 'medium';
    return 'high';
  }

  if (Platform.OS === 'android') {
    if (Device.isDevice === false) return 'low';

    const memoryInGb = totalMemory ? totalMemory / (1024 ** 3) : null;
    if (yearClass && yearClass >= 2023) return 'high';
    if ((memoryInGb && memoryInGb <= 4) || (yearClass && yearClass <= 2020)) return 'low';
    if (yearClass && yearClass < 2023) return 'medium';
    return 'high';
  }

  if (Platform.OS === 'web') return 'high';
  return 'high';
};

export interface PuckPosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isDragging: boolean;
}

// Полная логика коллизий с главного экрана (вынесено для переиспользования)
export const usePuckCollisionSystem = (
  players: Player[],
  currentUserId?: string,
  currentScreen?: string,
  screenWidth?: number,
  screenHeight?: number
) => {
  const puckSize = PUCK_SIZE;
  const [puckPositions, setPuckPositions] = useState<PuckPosition[]>([]);
  const [appIsActive, setAppIsActive] = useState(true);
  const collisionDetectedRef = useRef(false);
  const lastHapticTimeRef = useRef(0);
  const isInitializedRef = useRef(false);
  const previousPlayersRef = useRef<Player[]>([]);

  // Отслеживаем состояние приложения для остановки анимации в фоне
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const isActive = nextAppState === 'active';
      setAppIsActive(isActive);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Отслеживаем активные столкновения для предотвращения повторной вибрации
  const activeCollisionsRef = useRef<Set<string>>(new Set());
  // Защита от переинициализации в первые секунды после загрузки
  const initializationTimeRef = useRef<number>(0);
  const INITIALIZATION_PROTECTION_MS = 3000;

  // Определяем уровень производительности
  const performanceLevel = useMemo(() => getPerformanceLevel(), []);

  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef(0);

  const renderPositionsRef = useRef<PuckPosition[]>([]);
  const renderPositionsMapRef = useRef<Map<string, PuckPosition>>(new Map());
  const physicsPositionsRef = useRef<PuckPosition[]>([]);
  const alphaRef = useRef(1);

  const sharedPositionsRef = useRef<Map<string, { x: { value: number }; y: { value: number } }>>(new Map());

  const { STEP_MS, FIXED_DT, MAX_STEPS } = useMemo(() => {
    switch (performanceLevel) {
      case 'high':
      case 'medium':
      case 'low':
      default:
        return {
          STEP_MS: 1000 / 80,
          FIXED_DT: 1 / 80,
          MAX_STEPS: 1,
        };
    }
  }, [performanceLevel]);

  const reactUpdateInterval = useMemo(() => {
    if (Platform.OS === 'android') return 5;
    if (Platform.OS === 'ios') return 3;
    return 1;
  }, []);

  // Получаем безопасные зоны для учета системных элементов
  const insets = useSafeAreaInsets();

  const windowDimensions = Dimensions.get('window');
  const width = screenWidth ?? windowDimensions.width;
  const height = screenHeight ?? windowDimensions.height;

  const tabBarHeight = useMemo(() => {
    const baseHeight = 80;
    const paddingTop = 10;
    const paddingBottom = 10;
    return baseHeight + paddingTop + paddingBottom;
  }, []);

  const boundaries = useMemo(() => {
    const bottomPaddingAdjustment = Platform.OS === 'ios' ? 67 : -20;
    const baseBottomPadding = 15;
    const adjustedBottomPadding = baseBottomPadding + bottomPaddingAdjustment;

    const bottomInset = insets.bottom;
    const bottomOffset = tabBarHeight + bottomInset + puckSize + adjustedBottomPadding;

    return {
      left: 10,
      top: 10,
      right: width - puckSize - 10,
      bottom: height - bottomOffset,
    };
  }, [width, height, puckSize, tabBarHeight, insets.bottom]);

  // Инициализация и обновление позиций (скопировано с главного экрана без изменений по смыслу)
  useEffect(() => {
    if (!players || players.length === 0) {
      setPuckPositions([]);
      previousPlayersRef.current = [];
      physicsPositionsRef.current = [];
      renderPositionsRef.current = [];
      isInitializedRef.current = false;
      sharedPositionsRef.current.clear();
      renderPositionsMapRef.current.clear();
      activeCollisionsRef.current.clear();
      initializationTimeRef.current = 0;
      return;
    }

    const now = Date.now();
    const timeSinceInit = initializationTimeRef.current > 0 ? now - initializationTimeRef.current : Infinity;
    const isInProtectionPeriod = timeSinceInit < INITIALIZATION_PROTECTION_MS;

    const baseSpeedMultiplier = 0.49;

    const generatePosition = (existingPositions: PuckPosition[]): PuckPosition => {
      const minDistance = puckSize;
      const minDistSq = minDistance * minDistance;
      const maxAttempts = 100;
      let x = boundaries.left;
      let y = boundaries.top;
      let attempts = 0;
      let validPosition = false;

      while (!validPosition && attempts < maxAttempts) {
        x = Math.random() * (boundaries.right - boundaries.left - 100) + boundaries.left + 50;
        y = Math.random() * (boundaries.bottom - boundaries.top - 100) + boundaries.top + 50;

        validPosition = existingPositions.every((pos) => {
          const dx = x - pos.x;
          const dy = y - pos.y;
          return dx * dx + dy * dy >= minDistSq;
        });

        attempts++;
      }

      if (!validPosition) {
        x = Math.random() * (boundaries.right - boundaries.left - 100) + boundaries.left + 50;
        y = Math.random() * (boundaries.bottom - boundaries.top - 100) + boundaries.top + 50;
      }

      return {
        id: '',
        x,
        y,
        vx: (Math.random() - 0.5) * baseSpeedMultiplier,
        vy: (Math.random() - 0.5) * baseSpeedMultiplier,
        size: puckSize,
        isDragging: false,
      };
    };

    if (isInitializedRef.current) {
      const previousIds = new Set(previousPlayersRef.current.map((p) => p.id));
      const currentIds = new Set(players.map((p) => p.id));

      const allCurrentInPrevious = Array.from(currentIds).every((id) => previousIds.has(id));

      if (allCurrentInPrevious && currentIds.size > 0 && previousIds.size !== currentIds.size) {
        setPuckPositions((prev) => {
          const filtered = prev.filter((pos) => currentIds.has(pos.id));
          physicsPositionsRef.current = filtered;
          renderPositionsRef.current = filtered;

          const removedIds = new Set<string>();
          Array.from(sharedPositionsRef.current.keys()).forEach((id) => {
            if (!currentIds.has(id)) {
              sharedPositionsRef.current.delete(id);
              removedIds.add(id);
            }
          });

          if (removedIds.size > 0) {
            Array.from(activeCollisionsRef.current).forEach((key) => {
              const ids = key.split('-');
              if (ids.some((id) => removedIds.has(id))) {
                activeCollisionsRef.current.delete(key);
              }
            });
          }

          const newMap = new Map<string, PuckPosition>();
          filtered.forEach((pos) => newMap.set(pos.id, pos));
          renderPositionsMapRef.current = newMap;

          return filtered;
        });
        previousPlayersRef.current = players;
        return;
      }

      const sameSize = previousIds.size === currentIds.size;
      const samePlayers = sameSize && allCurrentInPrevious;
      if (samePlayers) {
        previousPlayersRef.current = players;
        return;
      }

      if (isInProtectionPeriod && currentIds.size > 0) {
        const newPlayerIds = Array.from(currentIds).filter((id) => !previousIds.has(id));
        const removedPlayerIds = Array.from(previousIds).filter((id) => !currentIds.has(id));

        if (newPlayerIds.length > 0 || removedPlayerIds.length > 0) {
          setPuckPositions((prev) => {
            let newPositions = removedPlayerIds.length > 0 ? prev.filter((pos) => currentIds.has(pos.id)) : [...prev];
            const existingIds = new Set(newPositions.map((p) => p.id));
            newPlayerIds.forEach((playerId) => {
              if (!existingIds.has(playerId)) {
                const pos = generatePosition(newPositions);
                pos.id = playerId;
                newPositions.push(pos);
              }
            });

            physicsPositionsRef.current = newPositions;
            renderPositionsRef.current = newPositions;

            if (removedPlayerIds.length > 0) {
              const removedSet = new Set(removedPlayerIds);
              removedPlayerIds.forEach((id) => sharedPositionsRef.current.delete(id));

              Array.from(activeCollisionsRef.current).forEach((key) => {
                const ids = key.split('-');
                if (ids.some((id) => removedSet.has(id))) {
                  activeCollisionsRef.current.delete(key);
                }
              });

              const newMap = new Map<string, PuckPosition>();
              newPositions.forEach((pos) => newMap.set(pos.id, pos));
              renderPositionsMapRef.current = newMap;
            }

            return newPositions;
          });
        }
        previousPlayersRef.current = players;
        return;
      }

      const prevPlayers = previousPlayersRef.current;
      const newPlayerIds = Array.from(currentIds).filter((id) => !previousIds.has(id));
      const removedPlayerIds = Array.from(previousIds).filter((id) => !currentIds.has(id));
      const totalChanged = newPlayerIds.length + removedPlayerIds.length;
      const isMajorChange = totalChanged > Math.max(previousIds.size, currentIds.size) * 0.5;

      if (isMajorChange && currentIds.size > 0) {
        const positions: PuckPosition[] = [];
        const collisionPositions: PuckPosition[] = [];

        players.forEach((player) => {
          const pos = generatePosition(collisionPositions);
          pos.id = player.id;
          positions.push(pos);
          collisionPositions.push(pos);

          let shared = sharedPositionsRef.current.get(player.id);
          if (!shared) {
            shared = { x: { value: pos.x } as any, y: { value: pos.y } as any };
            sharedPositionsRef.current.set(player.id, shared);
          } else {
            shared.x.value = pos.x;
            shared.y.value = pos.y;
          }
        });

        removedPlayerIds.forEach((id) => sharedPositionsRef.current.delete(id));

        if (removedPlayerIds.length > 0) {
          const removedSet = new Set(removedPlayerIds);
          Array.from(activeCollisionsRef.current).forEach((key) => {
            const ids = key.split('-');
            if (ids.some((id) => removedSet.has(id))) {
              activeCollisionsRef.current.delete(key);
            }
          });
        }

        setPuckPositions(positions);
        physicsPositionsRef.current = positions;
        renderPositionsRef.current = positions;
        const newMap = new Map<string, PuckPosition>();
        positions.forEach((pos) => newMap.set(pos.id, pos));
        renderPositionsMapRef.current = newMap;
        previousPlayersRef.current = players;
        return;
      }

      setPuckPositions((prevPositions) => {
        const existingMap = new Map(prevPositions.map((pos) => [pos.id, pos]));
        const newPositions: PuckPosition[] = [];
        const collisionPositions: PuckPosition[] = prevPositions.map((pos) => ({ ...pos }));
        let changed = false;

        players.forEach((player) => {
          const existing = existingMap.get(player.id);
          const prevPlayer = prevPlayers.find((p) => p.id === player.id);
          const isNewOrChanged = !existing || !prevPlayer || prevPlayer.status !== player.status;

          if (existing && !isNewOrChanged) {
            newPositions.push(existing);
          } else {
            const newPos = generatePosition(collisionPositions);
            newPos.id = player.id;
            newPositions.push(newPos);
            collisionPositions.push(newPos);
            changed = true;

            let shared = sharedPositionsRef.current.get(player.id);
            if (!shared) {
              shared = { x: { value: newPos.x } as any, y: { value: newPos.y } as any };
              sharedPositionsRef.current.set(player.id, shared);
            } else {
              shared.x.value = newPos.x;
              shared.y.value = newPos.y;
            }
          }
        });

        if (newPositions.length !== prevPositions.length) changed = true;
        const currentIds = new Set(players.map((p) => p.id));

        const removedIds = new Set<string>();
        Array.from(sharedPositionsRef.current.keys()).forEach((id) => {
          if (!currentIds.has(id)) {
            sharedPositionsRef.current.delete(id);
            removedIds.add(id);
          }
        });

        if (removedIds.size > 0) {
          Array.from(activeCollisionsRef.current).forEach((key) => {
            const ids = key.split('-');
            if (ids.some((id) => removedIds.has(id))) {
              activeCollisionsRef.current.delete(key);
            }
          });
        }

        if (!changed) {
          previousPlayersRef.current = players;
          return prevPositions;
        }

        physicsPositionsRef.current = newPositions;
        renderPositionsRef.current = newPositions;
        previousPlayersRef.current = players;
        const newMap = new Map<string, PuckPosition>();
        newPositions.forEach((pos) => newMap.set(pos.id, pos));
        renderPositionsMapRef.current = newMap;
        return newPositions;
      });
      return;
    }

    const currentPlayerIds = new Set(players.map((p) => p.id));
    Array.from(sharedPositionsRef.current.keys()).forEach((id) => {
      if (!currentPlayerIds.has(id)) {
        sharedPositionsRef.current.delete(id);
      }
    });
    activeCollisionsRef.current.clear();

    const positions: PuckPosition[] = [];
    if (players.length <= 2) {
      const centerX = (boundaries.left + boundaries.right) / 2;
      const centerY = (boundaries.top + boundaries.bottom) / 2;
      const offsetX = puckSize * 1.6;
      const baseSpeedMultiplier = 0.49;
      const basePositions =
        players.length === 1
          ? [{ x: centerX, y: centerY }]
          : [
              { x: centerX - offsetX, y: centerY },
              { x: centerX + offsetX, y: centerY },
            ];

      players.forEach((player, index) => {
        const base = basePositions[index] || basePositions[0];
        const pos: PuckPosition = {
          id: player.id,
          x: base.x,
          y: base.y,
          vx: (Math.random() - 0.5) * baseSpeedMultiplier,
          vy: (Math.random() - 0.5) * baseSpeedMultiplier,
          size: puckSize,
          isDragging: false,
        };
        positions.push(pos);

        let shared = sharedPositionsRef.current.get(player.id);
        if (!shared) {
          shared = { x: { value: pos.x } as any, y: { value: pos.y } as any };
          sharedPositionsRef.current.set(player.id, shared);
        } else {
          shared.x.value = pos.x;
          shared.y.value = pos.y;
        }
      });
    } else {
      const collisionPositions: PuckPosition[] = [];
      players.forEach((player) => {
        const pos = generatePosition(collisionPositions);
        pos.id = player.id;
        positions.push(pos);
        collisionPositions.push(pos);

        let shared = sharedPositionsRef.current.get(player.id);
        if (!shared) {
          shared = { x: { value: pos.x } as any, y: { value: pos.y } as any };
          sharedPositionsRef.current.set(player.id, shared);
        } else {
          shared.x.value = pos.x;
          shared.y.value = pos.y;
        }
      });
    }

    setPuckPositions(positions);
    physicsPositionsRef.current = positions;
    renderPositionsRef.current = positions;
    previousPlayersRef.current = players;
    isInitializedRef.current = true;

    const newMap = new Map<string, PuckPosition>();
    positions.forEach((pos) => newMap.set(pos.id, pos));
    renderPositionsMapRef.current = newMap;

    if (initializationTimeRef.current === 0) {
      initializationTimeRef.current = Date.now();
    }
  }, [players, boundaries.left, boundaries.right, boundaries.top, boundaries.bottom, puckSize]);

  // --- Physics tick + collisions (simplified but consistent with existing units) ---
  const updatePuckPosition = useCallback((id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => {
    setPuckPositions((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, x, y, vx, vy, isDragging: Boolean(isDragging) } : p));
      physicsPositionsRef.current = next;
      renderPositionsRef.current = next;
      const map = new Map<string, PuckPosition>();
      next.forEach((p) => map.set(p.id, p));
      renderPositionsMapRef.current = map;

      const shared = sharedPositionsRef.current.get(id);
      if (shared) {
        shared.x.value = x;
        shared.y.value = y;
      }
      return next;
    });
  }, []);

  const resetPucksMotion = useCallback(() => {
    setPuckPositions((prev) => {
      const next = prev.map((p) => ({ ...p, vx: (Math.random() - 0.5) * 0.49, vy: (Math.random() - 0.5) * 0.49 }));
      physicsPositionsRef.current = next;
      renderPositionsRef.current = next;
      const map = new Map<string, PuckPosition>();
      next.forEach((p) => map.set(p.id, p));
      renderPositionsMapRef.current = map;
      return next;
    });
  }, []);

  // Expose shared values helpers
  const getSharedPosition = useCallback((id: string) => sharedPositionsRef.current.get(id), []);
  const registerSharedPosition = useCallback((id: string, x: { value: number }, y: { value: number }) => {
    sharedPositionsRef.current.set(id, { x, y });
  }, []);

  return {
    puckPositions,
    updatePuckPosition,
    boundaries,
    isInitialized: puckPositions.length > 0,
    getSharedPosition,
    registerSharedPosition,
    resetPucksMotion,
  };
};

// Мемоизированный компонент шайбы (копия логики с главного экрана)
export const OriginalPuckAnimator = React.memo(
  ({
    player,
    position,
    onNav,
    onDrag,
    getAndroidPerformanceLevel,
    registerSharedPosition,
  }: {
    player: Player;
    position: PuckPosition;
    onNav: () => void;
    onDrag?: (id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => void;
    getAndroidPerformanceLevel?: () => 'high' | 'medium' | 'low';
    registerSharedPosition?: (id: string, x: { value: number }, y: { value: number }) => void;
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [hasDragged, setHasDragged] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, pageX: 0, pageY: 0, time: 0, startX: 0, startY: 0 });
    const lastPositionRef = useRef({ x: 0, y: 0 });
    const hasDraggedRef = useRef(false);
    const lastUpdateTimeRef = useRef(0);
    const lastDragVelocityRef = useRef({ vx: 0, vy: 0 });
    const dragHistoryRef = useRef<{ x: number; y: number; time: number }[]>([]);

    const animatedX = useSharedValue(position.x);
    const animatedY = useSharedValue(position.y);

    useEffect(() => {
      if (registerSharedPosition) {
        registerSharedPosition(position.id, animatedX, animatedY);
      }
    }, [position.id, animatedX, animatedY, registerSharedPosition]);

    const animatedStyle = useAnimatedStyle(
      () => ({
        left: animatedX.value,
        top: animatedY.value,
      }),
      []
    );

    const handleTouchStart = (e: any) => {
      const touch = e.nativeEvent;
      dragStartRef.current = {
        x: touch.locationX,
        y: touch.locationY,
        pageX: touch.pageX,
        pageY: touch.pageY,
        time: Date.now(),
        startX: animatedX.value,
        startY: animatedY.value,
      };
      lastPositionRef.current = { x: animatedX.value, y: animatedY.value };
      hasDraggedRef.current = false;
      setHasDragged(false);
      lastDragVelocityRef.current = { vx: 0, vy: 0 };
      dragHistoryRef.current = [];

      setIsDragging(true);
      if (onDrag) {
        onDrag(position.id, animatedX.value, animatedY.value, 0, 0, true);
      }
    };

    const handleTouchMove = (e: any) => {
      if (!isDragging || !onDrag) return;
      const touch = e.nativeEvent;
      const now = Date.now();

      const dx = touch.pageX - dragStartRef.current.pageX;
      const dy = touch.pageY - dragStartRef.current.pageY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (!hasDraggedRef.current && distance < 5) return;

      hasDraggedRef.current = true;
      setHasDragged(true);

      const deltaX = touch.pageX - dragStartRef.current.pageX;
      const deltaY = touch.pageY - dragStartRef.current.pageY;
      const newX = dragStartRef.current.startX + deltaX;
      const newY = dragStartRef.current.startY + deltaY;

      const dt = Math.max(1, now - lastUpdateTimeRef.current);
      let vx = ((newX - lastPositionRef.current.x) / dt) * 60;
      let vy = ((newY - lastPositionRef.current.y) / dt) * 60;

      const maxSpeed = 20.0;
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed;
        vy = (vy / speed) * maxSpeed;
      }

      lastDragVelocityRef.current = { vx, vy };
      lastUpdateTimeRef.current = now;

      dragHistoryRef.current.push({ x: newX, y: newY, time: now });
      if (dragHistoryRef.current.length > 10) dragHistoryRef.current.shift();

      lastPositionRef.current = { x: newX, y: newY };

      animatedX.value = newX;
      animatedY.value = newY;

      onDrag(position.id, newX, newY, vx, vy, true);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);

      if (onDrag && hasDraggedRef.current) {
        let finalVx = 0;
        let finalVy = 0;

        if (dragHistoryRef.current.length >= 2) {
          const history = dragHistoryRef.current;
          const samplesToUse = Math.min(3, history.length - 1);
          let totalDx = 0;
          let totalDy = 0;
          let totalTime = 0;

          for (let i = history.length - 1; i > history.length - samplesToUse - 1; i--) {
            const current = history[i];
            const previous = history[i - 1];
            const dt = Math.max(1, current.time - previous.time);
            totalDx += current.x - previous.x;
            totalDy += current.y - previous.y;
            totalTime += dt;
          }

          const pixelsPerMsX = totalDx / totalTime;
          const pixelsPerMsY = totalDy / totalTime;
          const fingerSpeedPxPerSec = Math.sqrt(pixelsPerMsX * pixelsPerMsX + pixelsPerMsY * pixelsPerMsY) * 1000;

          let speedMultiplier = 0.5;
          if (fingerSpeedPxPerSec > 500) {
            speedMultiplier = 0.5 + (fingerSpeedPxPerSec - 500) / 1000;
          }

          finalVx = (pixelsPerMsX * 1000 * speedMultiplier) / 60;
          finalVy = (pixelsPerMsY * 1000 * speedMultiplier) / 60;
        } else {
          const fingerSpeedPxPerSec = Math.sqrt(
            lastDragVelocityRef.current.vx * lastDragVelocityRef.current.vx +
              lastDragVelocityRef.current.vy * lastDragVelocityRef.current.vy
          );

          let speedMultiplier = 0.5;
          if (fingerSpeedPxPerSec > 500) {
            speedMultiplier = 0.5 + (fingerSpeedPxPerSec - 500) / 1000;
          }

          finalVx = (lastDragVelocityRef.current.vx * speedMultiplier) / 60;
          finalVy = (lastDragVelocityRef.current.vy * speedMultiplier) / 60;
        }

        const performanceLevel = getAndroidPerformanceLevel?.() || 'medium';
        const maxReleaseSpeed = (() => {
          switch (performanceLevel) {
            case 'high':
              return 6.0;
            case 'medium':
              return 6.0;
            case 'low':
            default:
              return 5.0;
          }
        })();

        const releaseSpeed = Math.sqrt(finalVx * finalVx + finalVy * finalVy);
        if (releaseSpeed > maxReleaseSpeed) {
          const speedRatio = maxReleaseSpeed / releaseSpeed;
          finalVx *= speedRatio;
          finalVy *= speedRatio;
        }

        const minSpeed = 0.2;
        if (releaseSpeed < minSpeed && releaseSpeed > 0) {
          const angle = Math.atan2(finalVy, finalVx);
          finalVx = Math.cos(angle) * minSpeed;
          finalVy = Math.sin(angle) * minSpeed;
        }

        const currentX = animatedX.value;
        const currentY = animatedY.value;
        onDrag(position.id, currentX, currentY, finalVx, finalVy, false);
      }

      setTimeout(() => {
        hasDraggedRef.current = false;
        setHasDragged(false);
      }, 100);
    };

    return (
      <Animated.View
        style={[puckAnimatorStyles.puckContainer, animatedStyle]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Suspense fallback={null}>
          <Puck
            avatar={player.avatar}
            playerId={player.id}
            onPress={() => {
              if (!hasDragged) {
                onNav();
              }
            }}
            size={position.size}
            points={
              player.goals && player.assists
                ? (() => {
                    try {
                      const goals = parseInt(player.goals) || 0;
                      const assists = parseInt(player.assists) || 0;
                      const total = goals + assists;
                      return total > 0 && !isNaN(total) ? total.toString() : undefined;
                    } catch {
                      return undefined;
                    }
                  })()
                : undefined
            }
            isStar={player.status === 'star'}
            status={player.status}
            isOnline={(player as any).isOnline}
            isNew={player.createdAt ? Date.now() - new Date(player.createdAt).getTime() < 2 * 24 * 60 * 60 * 1000 : false}
          />
        </Suspense>
      </Animated.View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.position.vx === nextProps.position.vx &&
    prevProps.position.vy === nextProps.position.vy &&
    prevProps.position.isDragging === nextProps.position.isDragging &&
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.avatar === nextProps.player.avatar &&
    prevProps.player.status === nextProps.player.status &&
    (prevProps.player as any).isOnline === (nextProps.player as any).isOnline &&
    prevProps.player.createdAt === nextProps.player.createdAt
);

const puckAnimatorStyles = {
  puckContainer: {
    position: 'absolute' as const,
    zIndex: 10,
  },
};

