import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState,
  AppStateStatus,
  Dimensions,
  Image as _RNImage,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import CachedBackground from './CachedBackground';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import { Player, notifyFriendsAboutGameFirstPlace } from '../utils/playerStorage';
import { supabase } from '../utils/supabase';
import IceRinkMarkings from './IceRinkMarkings';
import Puck from './Puck';
import Svg, { Path } from 'react-native-svg';
import { useLanguage } from '../contexts/LanguageContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GAME_DURATION = 30;
const PUCK_SIZE = 70; // ВАЖНО: как на главном экране
const GOAL_DEPTH = 10; // как в IceRinkMarkings
const SPAWN_INTERVAL_MS = 500;
const MAX_PUCKS = 25;

interface PuckPosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isDragging: boolean;
}

interface LeaderboardEntry {
  player_id: string;
  player_name: string;
  player_avatar?: string;
  score: number;
  created_at: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  visiblePlayers: Player[];
  currentUser: Player | null;
  /** Открыть сразу экран результатов (топ таблица), без игры */
  openToResults?: boolean;
}

function splitNameTwoLines(fullName?: string | null) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

// Определение уровня производительности устройства (как на главном)
const getPerformanceLevel = (): 'high' | 'medium' | 'low' => {
  const yearClass = Device.deviceYearClass ?? null;
  const totalMemory = Device.totalMemory ?? null;

  if (Platform.OS === 'ios') {
    if (yearClass && yearClass < 2020) return 'medium';
    return 'high';
  }

  if (Platform.OS === 'android') {
    const memoryInGb = totalMemory ? totalMemory / (1024 ** 3) : null;
    if (yearClass && yearClass >= 2022) return 'high';
    if ((memoryInGb && memoryInGb < 3) || (yearClass && yearClass < 2018)) return 'low';
    if ((memoryInGb && memoryInGb < 4) || (yearClass && yearClass < 2022)) return 'medium';
    return 'high';
  }

  if (Platform.OS === 'web') return 'high';
  return 'high';
};

// Полная логика коллизий и движения — скопирована с главного экрана для 1-в-1 поведения
const usePuckCollisionSystem = (
  players: Player[],
  currentUserId?: string,
  currentScreen?: string,
  screenWidth?: number,
  screenHeight?: number
) => {
  const puckSize = 70;
  const [puckPositions, setPuckPositions] = useState<PuckPosition[]>([]);
  const [appIsActive, setAppIsActive] = useState(true);
  const collisionDetectedRef = useRef(false);
  const lastHapticTimeRef = useRef(0);
  const isInitializedRef = useRef(false);
  const previousPlayersRef = useRef<Player[]>([]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const isActive = nextAppState === 'active';
      setAppIsActive(isActive);
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const activeCollisionsRef = useRef<Set<string>>(new Set());
  const initializationTimeRef = useRef<number>(0);
  const INITIALIZATION_PROTECTION_MS = 3000;

  const performanceLevel = useMemo(() => getPerformanceLevel(), []);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef(0);

  const renderPositionsRef = useRef<PuckPosition[]>([]);
  const renderPositionsMapRef = useRef<Map<string, PuckPosition>>(new Map());
  const physicsPositionsRef = useRef<PuckPosition[]>([]);
  const alphaRef = useRef(1);

  const sharedPositionsRef = useRef<Map<string, { x: { value: number }; y: { value: number } }>>(new Map());

  // Как на главном (index.tsx): на Android не гоним физику 80 Гц — иначе игра подтормаживает при 22+ шайбах.
  const { STEP_MS, FIXED_DT, MAX_STEPS, TARGET_FPS } = useMemo(() => {
    let fps: number;
    switch (performanceLevel) {
      case 'high':
        if (Platform.OS === 'android') fps = 60;
        else if (Platform.OS === 'ios') fps = 80;
        else fps = 80;
        break;
      case 'medium':
        fps = 45;
        break;
      case 'low':
      default:
        fps = 30;
        break;
    }
    return {
      STEP_MS: 1000 / fps,
      FIXED_DT: 1 / fps,
      MAX_STEPS: 1,
      TARGET_FPS: fps,
    };
  }, [performanceLevel]);

  const reactUpdateInterval = useMemo(() => {
    if (Platform.OS === 'web') return 1;
    if (Platform.OS === 'android') {
      if (performanceLevel === 'low') return 8;
      if (performanceLevel === 'medium') return 6;
      return 5;
    }
    if (Platform.OS === 'ios') {
      if (performanceLevel === 'low') return 5;
      return 3;
    }
    return 1;
  }, [performanceLevel]);

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
    // В игре площадка на весь экран: без учёта таб-бара, и ВЕРХ открыт (можно улетать)
    const bottomInset = insets.bottom;
    // Делаем нижнюю границу НИЖЕ экрана, чтобы шайбы реально “выплывали” из-под экрана,
    // и при спавне не сталкивались/не толкали уже летящие шайбы.
    // Держим "вне экрана" близко, чтобы шайба появлялась быстро
    const offscreenBottom = height + puckSize * 0.5 + bottomInset;
    return {
      left: 10,
      top: -puckSize * 3, // открываем верх: шайба может улетать
      right: width - puckSize - 10,
      bottom: offscreenBottom,
    };
  }, [width, height, puckSize, insets.bottom]);

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
    const spawnX = (boundaries.left + boundaries.right) / 2;
    const spawnY = height + puckSize * 0.4; // близко к нижнему краю — шайба появляется быстро

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
      // GAME MODE: упрощённое обновление списка без "переинициализаций".
      // В игре мы только добавляем новые шайбы; важно НЕ трогать позиции уже летящих шайб,
      // иначе будет мерцание/дёргание при каждом спавне.
      if (currentScreen === 'game') {
        const current = physicsPositionsRef.current || [];
        const currentMap = new Map<string, PuckPosition>(current.map((p) => [p.id, p]));
        const currentIds = new Set(players.map((p) => p.id));

        // Удаляем shared values для удалённых (например, при закрытии)
        Array.from(sharedPositionsRef.current.keys()).forEach((id) => {
          if (!currentIds.has(id)) {
            sharedPositionsRef.current.delete(id);
          }
        });

        const newPositions: PuckPosition[] = [];
        for (const pl of players) {
          const existing = currentMap.get(pl.id);
          if (existing) {
            newPositions.push(existing);
            continue;
          }
          const pos = generatePosition(newPositions);
          pos.id = pl.id;
          pos.x = spawnX;
          pos.y = spawnY;
          pos.vx = (Math.random() - 0.5) * baseSpeedMultiplier;
          pos.vy = -Math.abs((Math.random() - 0.5) * baseSpeedMultiplier);
          newPositions.push(pos);

          let shared = sharedPositionsRef.current.get(pl.id);
          if (!shared) {
            shared = { x: { value: pos.x } as any, y: { value: pos.y } as any };
            sharedPositionsRef.current.set(pl.id, shared);
          } else {
            shared.x.value = pos.x;
            shared.y.value = pos.y;
          }
        }

        // Обновляем рефы и state единообразно
        physicsPositionsRef.current = newPositions;
        renderPositionsRef.current = newPositions;
        const newMap = new Map<string, PuckPosition>();
        newPositions.forEach((p) => newMap.set(p.id, p));
        renderPositionsMapRef.current = newMap;
        setPuckPositions(newPositions);
        previousPlayersRef.current = players;
        return;
      }
      const previousIds = new Set(previousPlayersRef.current.map((p) => p.id));
      const currentIds = new Set(players.map((p) => p.id));

      const allCurrentInPrevious = Array.from(currentIds).every((id) => previousIds.has(id));
      // Фильтрация (уменьшение списка): удаляем лишние шайбы без переинициализации.
      // ВАЖНО: только когда текущий список МЕНЬШЕ предыдущего.
      if (allCurrentInPrevious && currentIds.size > 0 && currentIds.size < previousIds.size) {
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
              if (ids.some((id) => removedIds.has(id))) activeCollisionsRef.current.delete(key);
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
                // Новая шайба должна "вылетать" снизу по центру, а не появляться случайно
                const pos = generatePosition(newPositions);
                pos.id = playerId;
                pos.x = spawnX;
                pos.y = spawnY;
                pos.vx = (Math.random() - 0.5) * baseSpeedMultiplier;
                pos.vy = -Math.abs((Math.random() - 0.5) * baseSpeedMultiplier);
                newPositions.push(pos);
                // И сразу обновляем shared values, чтобы не было "прыжка" в случайную точку
                let shared = sharedPositionsRef.current.get(playerId);
                if (!shared) {
                  shared = { x: { value: pos.x } as any, y: { value: pos.y } as any };
                  sharedPositionsRef.current.set(playerId, shared);
                } else {
                  shared.x.value = pos.x;
                  shared.y.value = pos.y;
                }
              }
            });

            physicsPositionsRef.current = newPositions;
            renderPositionsRef.current = newPositions;

            if (removedPlayerIds.length > 0) {
              const removedSet = new Set(removedPlayerIds);
              removedPlayerIds.forEach((id) => sharedPositionsRef.current.delete(id));
              Array.from(activeCollisionsRef.current).forEach((key) => {
                const ids = key.split('-');
                if (ids.some((id) => removedSet.has(id))) activeCollisionsRef.current.delete(key);
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
            if (ids.some((id) => removedSet.has(id))) activeCollisionsRef.current.delete(key);
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
        const existingMap = new Map(prevPositions.map((pos) => [pos.id, pos] as const));
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
            // Если это новая шайба, то стартуем из точки "вне экрана" по центру
            if (!existing) {
              newPos.x = spawnX;
              newPos.y = spawnY;
              newPos.vx = (Math.random() - 0.5) * baseSpeedMultiplier;
              newPos.vy = -Math.abs((Math.random() - 0.5) * baseSpeedMultiplier);
            }
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
            if (ids.some((id) => removedIds.has(id))) activeCollisionsRef.current.delete(key);
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
      if (!currentPlayerIds.has(id)) sharedPositionsRef.current.delete(id);
    });
    activeCollisionsRef.current.clear();

    const positions: PuckPosition[] = [];
    if (players.length <= 2) {
      const centerX = (boundaries.left + boundaries.right) / 2;
      const centerY = (boundaries.top + boundaries.bottom) / 2;
      const offsetX = puckSize * 1.6;
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
          // В игре стартуем "из вне экрана" по центру
          x: spawnX,
          y: spawnY,
          vx: (Math.random() - 0.5) * baseSpeedMultiplier,
          vy: -Math.abs((Math.random() - 0.5) * baseSpeedMultiplier),
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
      players.forEach((player) => {
        const pos = generatePosition(positions);
        pos.id = player.id;
        // В игре стартуем "из вне экрана" по центру
        pos.x = spawnX;
        pos.y = spawnY;
        pos.vx = (Math.random() - 0.5) * baseSpeedMultiplier;
        pos.vy = -Math.abs((Math.random() - 0.5) * baseSpeedMultiplier);
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
    }

    setPuckPositions(positions);
    physicsPositionsRef.current = positions;
    renderPositionsRef.current = positions;
    previousPlayersRef.current = players;
    isInitializedRef.current = true;

    const newMap = new Map<string, PuckPosition>();
    positions.forEach((pos) => newMap.set(pos.id, pos));
    renderPositionsMapRef.current = newMap;

    if (initializationTimeRef.current === 0) initializationTimeRef.current = Date.now();
  }, [players, boundaries, performanceLevel]);

  const stepPhysics = useCallback(() => {
    const currentPositions = physicsPositionsRef.current;
    if (currentPositions.length === 0) return;

    const minSpeed = 0.8;
    const maxSpeed = 6.0;
    const friction = 0.999;

    const hasNonDraggingPucks = currentPositions.some((p) => !p.isDragging);
    if (!hasNonDraggingPucks) return;

    let updatedPositions = currentPositions.map((pos) => {
      if (pos.isDragging) return pos;
      let { x, y, vx, vy } = pos;

      const currentSpeed = Math.sqrt(vx * vx + vy * vy);
      if (currentSpeed < minSpeed) {
        if (currentSpeed > 0.001) {
          const ratio = minSpeed / currentSpeed;
          vx *= ratio;
          vy *= ratio;
        } else {
          const angle = Math.random() * Math.PI * 2;
          vx = Math.cos(angle) * minSpeed;
          vy = Math.sin(angle) * minSpeed;
        }
      }

      const SPEED_MULTIPLIER = 1.2;
      x += vx * FIXED_DT * TARGET_FPS * SPEED_MULTIPLIER;
      y += vy * FIXED_DT * TARGET_FPS * SPEED_MULTIPLIER;

      if (x <= boundaries.left) {
        x = boundaries.left;
        vx = Math.abs(vx);
      } else if (x >= boundaries.right) {
        x = boundaries.right;
        vx = -Math.abs(vx);
      }

      if (y <= boundaries.top) {
        // В игре верх открыт — не отражаем от верхней границы
        // (выход вверх обработаем в игровом loop: центр < -PUCK_SIZE -> респавн)
      } else if (y >= boundaries.bottom) {
        y = boundaries.bottom;
        vy = -Math.abs(vy);
      }

      const minDistance = puckSize;
      const minDistSq = minDistance * minDistance;

      if (!pos.isDragging) {
        const isWeakDevice = Platform.OS === 'android' && (performanceLevel === 'low' || performanceLevel === 'medium');
        const collisionCheckRadius = isWeakDevice ? minDistSq * 2.5 : minDistSq * 4;
        for (const other of currentPositions) {
          if (other.id === pos.id || other.isDragging) continue;
          const dx = x - other.x;
          const dy = y - other.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > collisionCheckRadius) continue;
          if (distSq < minDistSq && distSq > 0) {
            if (isWeakDevice) {
              const dist = Math.sqrt(distSq);
              const angle = Math.atan2(dy, dx);
              const pushForce = 0.3;
              vx += Math.cos(angle) * pushForce;
              vy += Math.sin(angle) * pushForce;
              const speed = Math.sqrt(vx * vx + vy * vy);
              if (speed > maxSpeed) {
                const ratio = maxSpeed / speed;
                vx *= ratio;
                vy *= ratio;
              }
            } else {
              const dist = Math.sqrt(distSq);
              const angle = Math.atan2(dy, dx);
              const relativeVx = vx - other.vx;
              const relativeVy = vy - other.vy;
              const dot = relativeVx * Math.cos(angle) + relativeVy * Math.sin(angle);
              if (dot < 0) {
                const restitution = 0.5;
                const impulse = dot * restitution;
                vx -= impulse * Math.cos(angle);
                vy -= impulse * Math.sin(angle);
                const additionalPush = 0.2;
                vx += Math.cos(angle) * additionalPush;
                vy += Math.sin(angle) * additionalPush;
                const speed = Math.sqrt(vx * vx + vy * vy);
                if (speed > maxSpeed) {
                  const ratio = maxSpeed / speed;
                  vx *= ratio;
                  vy *= ratio;
                }
              }
              vx *= 0.95;
              vy *= 0.95;
            }

            if (currentUserId && pos.id === currentUserId) {
              const collisionKey = [pos.id, other.id].sort().join('-');
              if (!activeCollisionsRef.current.has(collisionKey)) {
                activeCollisionsRef.current.add(collisionKey);
                collisionDetectedRef.current = true;
              }
            }
          }
        }
      }

      vx *= friction;
      vy *= friction;
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > maxSpeed) {
        const ratio = maxSpeed / speed;
        vx *= ratio;
        vy *= ratio;
      }

      x = Math.max(boundaries.left, Math.min(boundaries.right, x));
      // Не зажимаем сверху (верх открыт)
      y = Math.min(boundaries.bottom, y);
      return { ...pos, x, y, vx, vy };
    });

    const minDistance = puckSize;
    const minDistSq = minDistance * minDistance;
    const checkRadiusSq = (puckSize * 2) * (puckSize * 2);
    const offsets = new Array(updatedPositions.length).fill(0).map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < updatedPositions.length; i++) {
      const pos1 = updatedPositions[i];
      for (let j = i + 1; j < updatedPositions.length; j++) {
        const pos2 = updatedPositions[j];
        if (pos1.isDragging && pos2.isDragging) continue;
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > checkRadiusSq) continue;
        if (distSq < minDistSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const overlap = minDistance - dist;
          const invDist = 1 / dist;
          const nx = dx * invDist;
          const ny = dy * invDist;
          const pushStrength = 1.2;
          const adjustedOverlap = overlap * pushStrength;

          if (pos1.isDragging) {
            offsets[j].x -= nx * adjustedOverlap;
            offsets[j].y -= ny * adjustedOverlap;
          } else if (pos2.isDragging) {
            offsets[i].x += nx * adjustedOverlap;
            offsets[i].y += ny * adjustedOverlap;
          } else {
            const halfOverlap = adjustedOverlap * 0.5;
            offsets[i].x += nx * halfOverlap;
            offsets[i].y += ny * halfOverlap;
            offsets[j].x -= nx * halfOverlap;
            offsets[j].y -= ny * halfOverlap;
          }

          if (!pos1.isDragging && !pos2.isDragging) {
            const impulseStrength = 0.3;
            updatedPositions[i].vx += nx * impulseStrength;
            updatedPositions[i].vy += ny * impulseStrength;
            updatedPositions[j].vx -= nx * impulseStrength;
            updatedPositions[j].vy -= ny * impulseStrength;
          }

          if (currentUserId && (pos1.id === currentUserId || pos2.id === currentUserId)) {
            const collisionKey = [pos1.id, pos2.id].sort().join('-');
            if (!activeCollisionsRef.current.has(collisionKey)) {
              activeCollisionsRef.current.add(collisionKey);
              collisionDetectedRef.current = true;
            }
          }
        }
      }
    }

    for (let i = 0; i < updatedPositions.length; i++) {
      if (offsets[i].x !== 0 || offsets[i].y !== 0) {
        updatedPositions[i] = {
          ...updatedPositions[i],
          x: Math.max(boundaries.left, Math.min(boundaries.right, updatedPositions[i].x + offsets[i].x)),
          y: Math.max(boundaries.top, Math.min(boundaries.bottom, updatedPositions[i].y + offsets[i].y)),
        };
      }
    }

    physicsPositionsRef.current = updatedPositions;
  }, [boundaries, currentUserId, puckSize, performanceLevel, FIXED_DT, TARGET_FPS]);

  const lastInteractionTimeRef = useRef<number>(Date.now());
  const isIdleModeRef = useRef<boolean>(false);
  // В игре — агрессивнее: быстрее в idle (5 сек) и сильнее пропуск кадров (~16 FPS) для экономии батареи
  const IDLE_TIMEOUT_MS = currentScreen === 'game' ? 5000 : 12000;
  const IDLE_FRAME_SKIP = currentScreen === 'game' ? 5 : 3;
  const frameCounterRef = useRef(0);
  /** Пока идёт активная игра — реже считаем физику на слабых устройствах (меньше нагрев) */
  const gamePhysicsSkipRef = useRef(0);

  const updateInteractionTime = useCallback(() => {
    lastInteractionTimeRef.current = Date.now();
    if (isIdleModeRef.current) isIdleModeRef.current = false;
  }, []);

  const animationRunningRef = useRef(false);
  const appIsActiveRef = useRef(appIsActive);

  useEffect(() => {
    appIsActiveRef.current = appIsActive;
    if (!appIsActive) {
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
    }
  }, [appIsActive]);

  useEffect(() => {
    (window as any).__updatePuckInteraction = updateInteractionTime;
    return () => {
      delete (window as any).__updatePuckInteraction;
    };
  }, [updateInteractionTime]);

  const hasPucksRef = useRef(puckPositions.length > 0);
  useEffect(() => {
    hasPucksRef.current = puckPositions.length > 0;
  }, [puckPositions.length]);

  const isOnHomeScreen = currentScreen === 'home' || currentScreen === 'game';
  const isOnHomeScreenRef = useRef(isOnHomeScreen);
  useEffect(() => {
    isOnHomeScreenRef.current = isOnHomeScreen;
  }, [isOnHomeScreen]);

  useEffect(() => {
    if (!appIsActive || !isOnHomeScreen) {
      animationRunningRef.current = false;
      return;
    }
    if (animationRunningRef.current && hasPucksRef.current) return;
    animationRunningRef.current = true;

    let animationFrameId: number | null = null;
    const tick = (now: number) => {
      if (!appIsActiveRef.current || !isOnHomeScreenRef.current) {
        animationRunningRef.current = false;
        lastTimeRef.current = 0;
        return;
      }
      if (!hasPucksRef.current || physicsPositionsRef.current.length === 0) {
        lastTimeRef.current = 0;
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const timeSinceInteraction = now - lastInteractionTimeRef.current;
      if (timeSinceInteraction > IDLE_TIMEOUT_MS && !isIdleModeRef.current) {
        isIdleModeRef.current = true;
      }

      frameCounterRef.current++;
      if (isIdleModeRef.current && frameCounterRef.current % IDLE_FRAME_SKIP !== 0) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      if (currentScreen === 'game' && !isIdleModeRef.current) {
        const stride =
          performanceLevel === 'low' ? 2 : performanceLevel === 'medium' ? 1 : 0;
        if (stride > 0) {
          gamePhysicsSkipRef.current++;
          if (gamePhysicsSkipRef.current % (stride + 1) !== 0) {
            animationFrameId = requestAnimationFrame(tick);
            return;
          }
        }
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = now;
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const dtMs = now - lastTimeRef.current;
      lastTimeRef.current = now;
      const MAX_DT_MS = 100;
      const clampedDtMs = Math.min(dtMs, MAX_DT_MS);
      accumulatorRef.current += clampedDtMs;
      let steps = 0;
      while (accumulatorRef.current >= STEP_MS && steps < MAX_STEPS) {
        stepPhysics();
        accumulatorRef.current -= STEP_MS;
        steps++;
      }
      const alpha = Math.min(accumulatorRef.current / STEP_MS, 1);
      alphaRef.current = alpha;

      const physics = physicsPositionsRef.current;
      physics.forEach((physicsPos) => {
        const shared = sharedPositionsRef.current.get(physicsPos.id);
        if (shared && shared.x && shared.y) {
          const currentPos = renderPositionsMapRef.current.get(physicsPos.id);
          if (currentPos) {
            shared.x.value = currentPos.x + (physicsPos.x - currentPos.x) * alpha;
            shared.y.value = currentPos.y + (physicsPos.y - currentPos.y) * alpha;
          } else {
            shared.x.value = physicsPos.x;
            shared.y.value = physicsPos.y;
          }
        }
      });

      const nextRenderPositions = physics.map((p) => ({ ...p }));
      renderPositionsRef.current = nextRenderPositions;
      const nextMap = new Map<string, PuckPosition>();
      nextRenderPositions.forEach((pos) => nextMap.set(pos.id, pos));
      renderPositionsMapRef.current = nextMap;

      animationFrameId = requestAnimationFrame(tick);
    };

    lastTimeRef.current = 0;
    accumulatorRef.current = 0;
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      animationRunningRef.current = false;
    };
  }, [
    stepPhysics,
    STEP_MS,
    MAX_STEPS,
    reactUpdateInterval,
    appIsActive,
    isOnHomeScreen,
    IDLE_TIMEOUT_MS,
    IDLE_FRAME_SKIP,
    currentScreen,
    performanceLevel,
  ]);

  useEffect(() => {
    if (collisionDetectedRef.current && currentScreen === 'home' && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      const now = Date.now();
      const timeDiff = now - lastHapticTimeRef.current;
      if (timeDiff > 1000) {
        lastHapticTimeRef.current = now;
        if (Platform.OS === 'ios') {
          try {
            Haptics.selectionAsync();
          } catch {
            try {
              Vibration.vibrate(15);
            } catch {}
          }
        } else {
          try {
            Vibration.vibrate(15);
          } catch {}
        }
      }
      collisionDetectedRef.current = false;
    } else if (collisionDetectedRef.current) {
      collisionDetectedRef.current = false;
    }

    const currentPositions = physicsPositionsRef.current;
    const clearDistance = puckSize + 3;
    const clearDistSq = clearDistance * clearDistance;
    const checkRadiusSq = (puckSize * 2.5) * (puckSize * 2.5);
    const stillColliding = new Set<string>();
    if (frameCounterRef.current % 3 === 0) {
      for (let i = 0; i < currentPositions.length; i++) {
        for (let j = i + 1; j < currentPositions.length; j++) {
          const pos1 = currentPositions[i];
          const pos2 = currentPositions[j];
          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > checkRadiusSq) continue;
          if (distSq < clearDistSq && distSq > 0) {
            const collisionKey = [pos1.id, pos2.id].sort().join('-');
            stillColliding.add(collisionKey);
          }
        }
      }
    } else {
      activeCollisionsRef.current.forEach((key) => stillColliding.add(key));
    }
    activeCollisionsRef.current.forEach((key) => {
      if (!stillColliding.has(key)) activeCollisionsRef.current.delete(key);
    });
  }, [puckPositions, currentScreen, performanceLevel]);

  const updatePuckPosition = useCallback(
    (id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => {
      const current = physicsPositionsRef.current;
      if (!current || current.length === 0) return;

      let finalX = Math.max(boundaries.left, Math.min(boundaries.right, x));
      let finalY = Math.max(boundaries.top, Math.min(boundaries.bottom, y));

      const minDistance = puckSize;
      const minDistSq = minDistance * minDistance;
      const newPositions = current.map((pos) => ({ ...pos }));

      if (isDragging) {
        const draggedIndex = newPositions.findIndex((p) => p.id === id);
        if (draggedIndex === -1) return;

        newPositions[draggedIndex] = {
          ...newPositions[draggedIndex],
          x: finalX,
          y: finalY,
          vx: vx ?? newPositions[draggedIndex].vx,
          vy: vy ?? newPositions[draggedIndex].vy,
          isDragging: true,
        };

        for (let i = 0; i < newPositions.length; i++) {
          if (i === draggedIndex) continue;
          const other = newPositions[i];
          const dx = finalX - other.x;
          const dy = finalY - other.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance - dist;
            const pushStrength = 1.2;
            const adjustedOverlap = overlap * pushStrength;
            const pushX = -Math.cos(angle) * adjustedOverlap;
            const pushY = -Math.sin(angle) * adjustedOverlap;
            let newOtherX = other.x + pushX;
            let newOtherY = other.y + pushY;
            newOtherX = Math.max(boundaries.left, Math.min(boundaries.right, newOtherX));
            newOtherY = Math.max(boundaries.top, Math.min(boundaries.bottom, newOtherY));
            newPositions[i] = { ...other, x: newOtherX, y: newOtherY };

            if (currentUserId && (id === currentUserId || other.id === currentUserId)) {
              const collisionKey = [id, other.id].sort().join('-');
              if (!activeCollisionsRef.current.has(collisionKey)) {
                activeCollisionsRef.current.add(collisionKey);
                collisionDetectedRef.current = true;
              }
            }
          }
        }

        for (let i = 0; i < newPositions.length; i++) {
          if (i === draggedIndex) continue;
          const other = newPositions[i];
          const dx = finalX - other.x;
          const dy = finalY - other.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance - dist;
            finalX -= Math.cos(angle) * overlap * 0.3;
            finalY -= Math.sin(angle) * overlap * 0.3;
            const additionalPush = overlap * 0.2;
            const newOtherX = other.x - Math.cos(angle) * additionalPush;
            const newOtherY = other.y - Math.sin(angle) * additionalPush;
            newPositions[i] = {
              ...other,
              x: Math.max(boundaries.left, Math.min(boundaries.right, newOtherX)),
              y: Math.max(boundaries.top, Math.min(boundaries.bottom, newOtherY)),
            };
          }
        }

        finalX = Math.max(boundaries.left, Math.min(boundaries.right, finalX));
        finalY = Math.max(boundaries.top, Math.min(boundaries.bottom, finalY));
        newPositions[draggedIndex] = { ...newPositions[draggedIndex], x: finalX, y: finalY };
      } else {
        const index = newPositions.findIndex((p) => p.id === id);
        if (index !== -1) {
          newPositions[index] = {
            ...newPositions[index],
            x: finalX,
            y: finalY,
            vx: vx ?? newPositions[index].vx,
            vy: vy ?? newPositions[index].vy,
            isDragging: false,
          };
        }
      }

      physicsPositionsRef.current = newPositions;
      renderPositionsRef.current = newPositions;
      const newMap = new Map<string, PuckPosition>();
      newPositions.forEach((pos) => newMap.set(pos.id, pos));
      renderPositionsMapRef.current = newMap;
    },
    [boundaries, currentUserId, puckSize]
  );

  const resetPucksMotion = useCallback(() => {
    const current = physicsPositionsRef.current;
    if (!current || current.length === 0) return;
    const baseSpeedMultiplier = 0.49;
    const newPositions = current.map((pos) => ({
      ...pos,
      vx: (Math.random() - 0.5) * baseSpeedMultiplier,
      vy: (Math.random() - 0.5) * baseSpeedMultiplier,
      isDragging: false,
    }));
    physicsPositionsRef.current = newPositions;
    renderPositionsRef.current = newPositions;
    const newMap = new Map<string, PuckPosition>();
    newPositions.forEach((pos) => newMap.set(pos.id, pos));
    renderPositionsMapRef.current = newMap;
  }, []);

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

const OriginalPuckAnimator = React.memo(
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
      if (typeof (window as any).__updatePuckInteraction === 'function') {
        (window as any).__updatePuckInteraction();
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
        style={[gs.puckContainer, animatedStyle]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Suspense fallback={null}>
          <Puck
            avatar={player.avatar}
            playerId={player.id}
            onPress={() => {
              if (!hasDragged) onNav();
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

const LED_BG = require('../assets/images/led.jpg');

export default function PuckGame({ visible, onClose, visiblePlayers, currentUser, openToResults = false }: Props) {
  const { language } = useLanguage();

  useEffect(() => {
    try {
      const resolved = _RNImage.resolveAssetSource(LED_BG);
      if (resolved?.uri) {
        Image.prefetch(resolved.uri).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, []);

  const gameLimits = useMemo(() => {
    const perf = getPerformanceLevel();
    // На Android больше одновременных шайб = тяжёлый O(n²) по коллизиям при полном экране.
    if (Platform.OS === 'android') {
      if (perf === 'low') return { maxPucks: 12, spawnMs: 850, rafStride: 3 };
      if (perf === 'medium') return { maxPucks: 16, spawnMs: 700, rafStride: 2 };
      return { maxPucks: 20, spawnMs: 580, rafStride: 1 };
    }
    if (perf === 'low') return { maxPucks: 12, spawnMs: 850, rafStride: 3 };
    if (perf === 'medium') return { maxPucks: 18, spawnMs: 650, rafStride: 2 };
    return { maxPucks: MAX_PUCKS, spawnMs: SPAWN_INTERVAL_MS, rafStride: 1 };
  }, []);
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'finished'>('countdown');
  const [countdownValue, setCountdownValue] = useState<number | 'Go'>(5);
  const countdownScale = useSharedValue(0.5);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [iceSize, setIceSize] = useState({ width: 0, height: 0 });
  const insets = useSafeAreaInsets();
  const [activePlayers, setActivePlayers] = useState<Player[]>([]);
  const gameStartRef = useRef(0);
  const scoreRef = useRef(0);
  const scoredCooldownRef = useRef<Map<string, number>>(new Map());
  const lastCenterYRef = useRef<Map<string, number>>(new Map());
  const lastHitYRef = useRef<Map<string, number>>(new Map());
  const [offsideVisible, setOffsideVisible] = useState(false);
  const spawnQueueRef = useRef<Player[]>([]);
  const spawnedIdsRef = useRef<Set<string>>(new Set());
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoringRafTickRef = useRef(0);
  const activePlayersCountRef = useRef(0);
  const visiblePlayersRef = useRef<Player[]>(visiblePlayers);
  useEffect(() => {
    visiblePlayersRef.current = visiblePlayers;
  }, [visiblePlayers]);
  useEffect(() => {
    activePlayersCountRef.current = activePlayers.length;
  }, [activePlayers.length]);

  const { puckPositions, updatePuckPosition, boundaries, getSharedPosition, registerSharedPosition, resetPucksMotion } =
    usePuckCollisionSystem(activePlayers, currentUser?.id, 'game', SCREEN_W, SCREEN_H);

  const shuffle = useCallback(<T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  const spawnOneRandom = useCallback(() => {
    if (activePlayersCountRef.current >= gameLimits.maxPucks) return;
    const pool = spawnQueueRef.current;
    if (!pool || pool.length === 0) return;
    const idx = Math.floor(Math.random() * pool.length);
    const next = pool.splice(idx, 1)[0];
    if (!next) return;
    if (spawnedIdsRef.current.has(next.id)) return;
    spawnedIdsRef.current.add(next.id);
    setActivePlayers((prev) => {
      if (prev.length >= gameLimits.maxPucks) return prev;
      return [...prev, next];
    });
  }, [gameLimits.maxPucks]);

  const ensureSpawnLoop = useCallback(() => {
    if (spawnTimerRef.current) return;
    spawnTimerRef.current = setInterval(() => {
      spawnOneRandom();
    }, gameLimits.spawnMs);
  }, [spawnOneRandom, gameLimits.spawnMs]);

  const initSpawnQueueFromVisiblePlayers = useCallback(() => {
    const source = visiblePlayersRef.current || [];
    let pool = source.filter((p) => p?.id && p.status !== 'game' && !p.is_hidden);
    if (pool.length === 0) {
      pool = source.filter((p) => p?.id && p.status !== 'game');
    }
    spawnQueueRef.current = shuffle(pool);
    ensureSpawnLoop();
  }, [ensureSpawnLoop, shuffle]);

  // Ворота вычисляем так же, как в IceRinkMarkings (симметрия и размеры)
  // offsideLineY — синяя линия (blueLineTop), совпадает с разметкой IceRinkMarkings
  const goalRect = useMemo(() => {
    const w = iceSize.width || SCREEN_W;
    const h = iceSize.height || SCREEN_H;
    const goalWidth = w * 0.18;
    const visibleHeight = h; // topInset=0, bottomInset=0
    const centerY = visibleHeight / 2;
    const goalLineOffset = visibleHeight * 0.48;
    const goalLineTop = centerY - goalLineOffset; // около верхней границы
    const blueLineOffset = visibleHeight * 0.28; // как в IceRinkMarkings
    const offsideLineY = centerY - blueLineOffset; // синяя линия у верхних ворот
    return {
      x: w / 2 - goalWidth / 2,
      y: goalLineTop - GOAL_DEPTH,
      w: goalWidth,
      h: GOAL_DEPTH,
      goalLineY: goalLineTop,
      offsideLineY,
    };
  }, [iceSize.height, iceSize.width]);

  const crease = useMemo(() => {
    const r = goalRect.w * 0.55; // визуально близко к “голубой зоне” на разметке
    const cx = goalRect.x + goalRect.w / 2;
    // Опускаем чуть ниже, учитывая Dynamic Island / safe area
    const y = goalRect.goalLineY + 14 + Math.min(18, insets.top * 0.25);
    return { r, cx, y };
  }, [goalRect, insets.top]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    gameStartRef.current = Date.now();
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameState('playing');
    lastCenterYRef.current.clear();
    lastHitYRef.current.clear();
    scoredCooldownRef.current.clear();
    spawnedIdsRef.current = new Set();

    const source = visiblePlayersRef.current || [];
    let pool = source.filter((p) => p?.id && p.status !== 'game' && !p.is_hidden);
    // Если вдруг у кого-то нет name — всё равно допускаем, чтобы поле не было пустым
    if (pool.length === 0) {
      pool = source.filter((p) => p?.id && p.status !== 'game');
    }
    spawnQueueRef.current = shuffle(pool);
    setActivePlayers([]); // старт — пустое поле

    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    spawnTimerRef.current = null;
    ensureSpawnLoop();
    spawnOneRandom(); // первая шайба сразу
  }, [ensureSpawnLoop, shuffle, spawnOneRandom]);

  // Если игру начали до загрузки игроков — как только пул придёт, запустим очередь спавна
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (activePlayers.length > 0) return;
    if (spawnQueueRef.current.length > 0) return;
    if ((visiblePlayersRef.current || []).length === 0) return;
    initSpawnQueueFromVisiblePlayers();
  }, [activePlayers.length, gameState, initSpawnQueueFromVisiblePlayers]);

  // Останавливаем спавн, когда игра не идёт
  useEffect(() => {
    if (gameState !== 'playing') {
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current);
        spawnTimerRef.current = null;
      }
    }
  }, [gameState]);

  // Когда добавились новые активные игроки — “выпрыгиваем” из точки вне экрана по центру
  useEffect(() => {
    if (gameState !== 'playing') return;
    const spawnX = (boundaries.left + boundaries.right) / 2;
    const spawnY = boundaries.bottom;
    const baseSpeedMultiplier = 0.49;
    activePlayers.forEach((p) => {
      if (lastCenterYRef.current.has(p.id)) return; // уже “видели” шайбу
      updatePuckPosition(
        p.id,
        spawnX,
        spawnY,
        (Math.random() - 0.5) * baseSpeedMultiplier,
        -Math.abs((Math.random() - 0.5) * baseSpeedMultiplier),
        false
      );
      lastCenterYRef.current.set(p.id, spawnY + PUCK_SIZE / 2);
    });
  }, [activePlayers, boundaries.left, boundaries.right, boundaries.bottom, gameState, updatePuckPosition]);

  const tr = useCallback(
    (
      key:
        | 'title'
        | 'subtitle'
        | 'start'
        | 'playAgain'
        | 'close'
        | 'topPlayers'
        | 'score'
        | 'yourBest'
        | 'go'
        | 'results'
    ) => {
      const dict: Record<string, Record<string, string>> = {
        title: {
          en: 'Hockeystars Game',
          ru: 'Hockeystars Game',
          lt: 'Hockeystars Game',
          lv: 'Hockeystars Game',
          pl: 'Hockeystars Game',
          sv: 'Hockeystars Game',
          cs: 'Hockeystars Game',
          sk: 'Hockeystars Game',
          fi: 'Hockeystars Game',
          it: 'Hockeystars Game',
          de: 'Hockeystars Game',
          fr: 'Hockeystars Game',
        },
        subtitle: {
          ru: 'Забивай в ворота и становись чемпионом!',
          en: 'Score goals and become a champion!',
          lt: 'Mušk į vartus ir tapk čempionu!',
          lv: 'Met vārtos un kļūsti par čempionu!',
          pl: 'Strzelaj do bramki i zostań mistrzem!',
          sv: 'Gör mål och bli mästare!',
          cs: 'Dávej góly a staň se šampionem!',
          sk: 'Dávaj góly a staň sa šampiónom!',
          fi: 'Tee maaleja ja nouse mestariksi!',
          it: 'Segna e diventa campione!',
          de: 'Schieß Tore und werde Champion!',
          fr: 'Marque des buts et deviens champion !',
        },
        start: {
          ru: 'Старт',
          en: 'Start',
          lt: 'Pradėti',
          lv: 'Sākt',
          pl: 'Start',
          sv: 'Start',
          cs: 'Start',
          sk: 'Štart',
          fi: 'Aloita',
          it: 'Avvia',
          de: 'Start',
          fr: 'Démarrer',
        },
        playAgain: {
          ru: 'Сыграть ещё',
          en: 'Play Again',
          lt: 'Žaisti dar kartą',
          lv: 'Spēlēt vēlreiz',
          pl: 'Zagraj ponownie',
          sv: 'Spela igen',
          cs: 'Hrát znovu',
          sk: 'Hrať znova',
          fi: 'Pelaa uudelleen',
          it: 'Gioca ancora',
          de: 'Nochmal spielen',
          fr: 'Rejouer',
        },
        close: {
          ru: 'Закрыть',
          en: 'Close',
          lt: 'Uždaryti',
          lv: 'Aizvērt',
          pl: 'Zamknąć',
          sv: 'Stäng',
          cs: 'Zavřít',
          sk: 'Zavrieť',
          fi: 'Sulje',
          it: 'Chiudi',
          de: 'Schließen',
          fr: 'Fermer',
        },
        topPlayers: {
          ru: 'Топ игроков',
          en: 'Top Players',
          lt: 'Geriausi žaidėjai',
          lv: 'Top spēlētāji',
          pl: 'Najlepsi gracze',
          sv: 'Toppspelare',
          cs: 'Nejlepší hráči',
          sk: 'Najlepší hráči',
          fi: 'Parhaat pelaajat',
          it: 'Migliori giocatori',
          de: 'Top-Spieler',
          fr: 'Meilleurs joueurs',
        },
        score: {
          ru: 'Счёт: {score}',
          en: 'Score: {score}',
          lt: 'Rezultatas: {score}',
          lv: 'Rezultāts: {score}',
          pl: 'Wynik: {score}',
          sv: 'Poäng: {score}',
          cs: 'Skóre: {score}',
          sk: 'Skóre: {score}',
          fi: 'Tulos: {score}',
          it: 'Punteggio: {score}',
          de: 'Punkte: {score}',
          fr: 'Score : {score}',
        },
        offside: {
          ru: 'ОФСАЙД!',
          en: 'OFFSIDE!',
          lt: 'UŽ LAIKĄ!',
          lv: 'ĀRĀ LĪNIJAS!',
          pl: 'SPALONY!',
          sv: 'OFFSIDE!',
          cs: 'ZAKÁZANÉ STŘÍLENÍ!',
          sk: 'ZAKÁZANÉ STRIELANIE!',
          fi: 'LAITON!',
          it: 'FUORIGIOCO!',
          de: 'ABSEITS!',
          fr: 'HORS-JEU !',
        },
        go: {
          ru: 'Go',
          en: 'Go',
          lt: 'Go',
          lv: 'Go',
          pl: 'Go',
          sv: 'Go',
          cs: 'Go',
          sk: 'Go',
          fi: 'Go',
          it: 'Go',
          de: 'Go',
          fr: 'Go',
        },
        results: {
          ru: 'Результаты',
          en: 'Results',
          lt: 'Rezultatai',
          lv: 'Rezultāti',
          pl: 'Wyniki',
          sv: 'Resultat',
          cs: 'Výsledky',
          sk: 'Výsledky',
          fi: 'Tulokset',
          it: 'Risultati',
          de: 'Ergebnis',
          fr: 'Résultats',
        },
        yourBest: {
          ru: 'Твой рекорд: {score}',
          en: 'Your best: {score}',
          lt: 'Tavo rekordas: {score}',
          lv: 'Tavs rekords: {score}',
          pl: 'Twój rekord: {score}',
          sv: 'Ditt rekord: {score}',
          cs: 'Tvůj rekord: {score}',
          sk: 'Tvoj rekord: {score}',
          fi: 'Ennätyksesi: {score}',
          it: 'Il tuo record: {score}',
          de: 'Dein Rekord: {score}',
          fr: 'Ton record : {score}',
        },
      };
      return dict[key]?.[language] || dict[key]?.en || key;
    },
    [language]
  );

  const endGame = useCallback(async () => {
    setGameState('finished');

    const finalScore = scoreRef.current;

    if (currentUser && finalScore > 0) {
      try {
        // Кто был №1 ДО сохранения (один игрок = одно место) + глобальный макс. для детекта нового рекорда
        const { data: beforeScores } = await supabase
          .from('puck_game_scores')
          .select('player_id, score')
          .order('score', { ascending: false });
        const seenBefore = new Set<string>();
        const uniqueBefore: { player_id: string }[] = [];
        const playerBestBefore = new Map<string, number>();
        for (const row of beforeScores || []) {
          if (!playerBestBefore.has(row.player_id)) {
            playerBestBefore.set(row.player_id, row.score);
          }
          if (!seenBefore.has(row.player_id)) {
            seenBefore.add(row.player_id);
            uniqueBefore.push({ player_id: row.player_id });
          }
        }
        const oldLeaderId = uniqueBefore[0]?.player_id;
        const prevGlobalMax =
          playerBestBefore.size > 0 ? Math.max(...playerBestBefore.values()) : 0;

        await supabase.from('puck_game_scores').insert({
          player_id: currentUser.id,
          player_name: currentUser.name,
          player_avatar: currentUser.avatar || null,
          score: finalScore,
        });

        // Кто №1 ПОСЛЕ сохранения — уведомляем только если победитель обновился
        const { data: topScores } = await supabase
          .from('puck_game_scores')
          .select('player_id, score')
          .order('score', { ascending: false });
        if (topScores && topScores.length > 0) {
          const seen = new Set<string>();
          const unique: { player_id: string; score: number }[] = [];
          for (const row of topScores) {
            if (!seen.has(row.player_id)) {
              seen.add(row.player_id);
              unique.push({ player_id: row.player_id, score: row.score });
            }
          }
          const newLeaderId = unique[0]?.player_id;
          const becameLeader = newLeaderId === currentUser.id && oldLeaderId !== currentUser.id;
          const newGlobalRecordWhileLeader =
            newLeaderId === currentUser.id && finalScore > prevGlobalMax;
          if (becameLeader || newGlobalRecordWhileLeader) {
            notifyFriendsAboutGameFirstPlace(currentUser.id, currentUser.name || 'Player', currentUser.avatar).catch(() => {});
          }
        }
      } catch (e) {
        console.error('Failed to save score:', e);
      }
    }

    loadLeaderboard();
  }, [currentUser]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('puck_game_scores')
        .select('player_id, player_name, player_avatar, score, created_at')
        .order('score', { ascending: false })
        .limit(100);

      // Один игрок — одно место: берём лучший результат каждого
      const seen = new Set<string>();
      const unique = (data || []).filter((row) => {
        if (seen.has(row.player_id)) return false;
        seen.add(row.player_id);
        return true;
      }).slice(0, 10);

      setLeaderboard(unique);

      if (currentUser) {
        const { data: best } = await supabase
          .from('puck_game_scores')
          .select('score')
          .eq('player_id', currentUser.id)
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (best) setBestScore(best.score);
      }
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    let raf: number | null = null;
    const loop = () => {
      if (gameLimits.rafStride > 1) {
        scoringRafTickRef.current++;
        if (scoringRafTickRef.current % gameLimits.rafStride !== 0) {
          raf = requestAnimationFrame(loop);
          return;
        }
      }
      const now = Date.now();
      const elapsed = (now - gameStartRef.current) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        endGame();
        return;
      }

      // Гол/мимо: шайба улетает вверх за пределы площадки.
      // Если пересекла линию ворот ВНУТРИ проёма — гол. Если пересекла линию вне проёма — мимо.
      // После вылета за экран — респавним снизу по центру.
      const goalLeft = goalRect.x;
      const goalRight = goalRect.x + goalRect.w;
      const goalLineY = goalRect.goalLineY;

      const spawnX = (boundaries.left + boundaries.right) / 2;
      // Шайба “выпрыгивает” из центра снизу, но из точки вне экрана
      const spawnY = boundaries.bottom;
      const baseSpeedMultiplier = 0.49;

      for (const p of activePlayers) {
        const shared = getSharedPosition(p.id);
        if (!shared) continue;
        const x = shared.x.value;
        const y = shared.y.value;
        const centerX = x + PUCK_SIZE / 2;
        const centerY = y + PUCK_SIZE / 2;

        const lastCenterY = lastCenterYRef.current.get(p.id);
        lastCenterYRef.current.set(p.id, centerY);

        // Засчитываем попытку только когда шайба пересекает линию ворот снизу вверх
        if (typeof lastCenterY === 'number' && lastCenterY > goalLineY && centerY <= goalLineY) {
          const isGoal = centerX >= goalLeft && centerX <= goalRight;
          if (isGoal) {
            const last = scoredCooldownRef.current.get(p.id) || 0;
            if (now - last >= 700) {
              const hitY = lastHitYRef.current.get(p.id);
              const offsideLineY = goalRect.offsideLineY ?? goalLineY + 100;
              // Гол засчитывается только если удар был из-за линии офсайда (дальше от ворот)
              const validShot = typeof hitY === 'number' && hitY >= offsideLineY;
              if (validShot) {
                scoredCooldownRef.current.set(p.id, now);
                scoreRef.current += 1;
                setScore(scoreRef.current);
                try {
                  if (Platform.OS === 'ios') {
                    Haptics.selectionAsync();
                  } else {
                    Vibration.vibrate(10);
                  }
                } catch {
                  try {
                    Vibration.vibrate(10);
                  } catch {}
                }
              } else {
                setOffsideVisible(true);
                setTimeout(() => setOffsideVisible(false), 1800);
              }
            }
          }
        }

        // Если улетела выше экрана — возвращаем вниз по центру
        if (centerY < -PUCK_SIZE) {
          lastHitYRef.current.delete(p.id);
          updatePuckPosition(
            p.id,
            spawnX,
            spawnY,
            (Math.random() - 0.5) * baseSpeedMultiplier,
            -Math.abs((Math.random() - 0.5) * baseSpeedMultiplier),
            false
          );
          lastCenterYRef.current.set(p.id, spawnY + PUCK_SIZE / 2);
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [gameState, activePlayers, getSharedPosition, goalRect, boundaries, updatePuckPosition, endGame, gameLimits.rafStride]);

  useEffect(() => {
    if (!visible) return;
    loadLeaderboard();
    setActivePlayers([]);
    spawnQueueRef.current = [];
    spawnedIdsRef.current = new Set();
    if (spawnTimerRef.current) {
      clearInterval(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    if (openToResults) {
      setGameState('finished');
      setCountdownValue(5);
      setScore(0);
      setTimeLeft(0);
    } else {
      setGameState('countdown');
      setCountdownValue(5);
      setScore(0);
      setTimeLeft(GAME_DURATION);
    }
  }, [visible, openToResults, loadLeaderboard]);

  // Плавное увеличение цифры при смене
  const countdownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
  }));

  useEffect(() => {
    if (gameState !== 'countdown') return;
    countdownScale.value = 0.5;
    countdownScale.value = withSequence(
      withTiming(1.25, { duration: 400, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) })
    );
  }, [gameState, countdownValue, countdownScale]);

  // Обратный отсчёт 5-4-3-2-1-Go → старт игры
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!visible || gameState !== 'countdown') {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }
    if (countdownValue === 'Go') {
      countdownTimerRef.current = setTimeout(() => startGame(), 400);
      return () => {
        if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      };
    }
    countdownTimerRef.current = setTimeout(() => {
      setCountdownValue((v) => (v === 1 ? 'Go' : (typeof v === 'number' ? v - 1 : 5)));
    }, 500);
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [visible, gameState, countdownValue, startGame]);

  const positionMap = useMemo(() => {
    const map = new Map<string, PuckPosition>();
    puckPositions.forEach((p) => map.set(p.id, p));
    return map;
  }, [puckPositions]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={gs.container}>
        <CachedBackground source={LED_BG} style={gs.background} resizeMode="cover">
          <View
            style={gs.background}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setIceSize({ width, height });
            }}
          >
          {iceSize.width > 0 && iceSize.height > 0 && (
            <IceRinkMarkings width={iceSize.width} height={iceSize.height} opacity={0.15} topInset={0} />
          )}

          {/* Goal */}
          <View
            pointerEvents="none"
            style={[
              gs.goalRect,
              {
                left: goalRect.x,
                top: goalRect.y,
                width: goalRect.w,
                height: goalRect.h,
              },
            ]}
          />

          {/* Blue crease (semi-circle) */}
          {iceSize.width > 0 && iceSize.height > 0 && (
            <Svg
              pointerEvents="none"
              width={iceSize.width}
              height={iceSize.height}
              style={gs.creaseSvg}
            >
              <Path
                // Полуокружность “вниз” (в сторону поля)
                d={`M ${crease.cx - crease.r} ${crease.y} A ${crease.r} ${crease.r} 0 0 0 ${crease.cx + crease.r} ${crease.y}`}
                stroke="#0066CC"
                strokeWidth={2}
                fill="rgba(0, 102, 204, 0.12)"
              />
              <Path
                d={`M 0 ${goalRect.offsideLineY} L ${iceSize.width} ${goalRect.offsideLineY}`}
                stroke="#fa2f40"
                strokeWidth={2}
                strokeDasharray="8 6"
                opacity={0.7}
              />
            </Svg>
          )}

          {/* HUD — только во время игры (на экране результатов — своя кнопка закрытия) */}
          {gameState === 'playing' && (
          <View style={gs.hud} pointerEvents="box-none">
            <View style={gs.hudItem}>
              <Ionicons name="time-outline" size={18} color="#fff" />
              <Text style={gs.hudText}>{timeLeft}</Text>
            </View>
            <View style={gs.hudItem}>
              <Ionicons name="disc" size={18} color="#fa2f40" />
              <Text style={gs.hudScore}>{score}</Text>
            </View>
            <View style={gs.hudRight}>
              <TouchableOpacity
                onPress={() => void endGame()}
                style={gs.resultsBtn}
                hitSlop={14}
                accessibilityRole="button"
                accessibilityLabel={tr('results')}
              >
                <Ionicons name="trophy-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={gs.closeBtn} hitSlop={10}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          )}

          {/* Offside overlay */}
          {gameState === 'playing' && offsideVisible && (
            <View style={gs.offsideOverlay} pointerEvents="none">
              <Text style={gs.offsideText}>{tr('offside')}</Text>
            </View>
          )}

          {/* Inner border like main screen */}
          <View style={gs.innerBorder} pointerEvents="none" />

          {/* Pucks (drag like main) */}
          {activePlayers.map((player) => {
            const fallbackPosition: PuckPosition = {
              id: player.id,
              x: (boundaries.left + boundaries.right) / 2,
              // Никогда не показываем "мигающую" шайбу по центру,
              // если позиция ещё не готова — держим её вне экрана снизу.
              y: boundaries.bottom,
              vx: 0,
              vy: 0,
              size: 70,
              isDragging: false,
            };
            const initialPosition = positionMap.get(player.id) || fallbackPosition;
            return (
              <OriginalPuckAnimator
                key={player.id}
                player={player}
                position={initialPosition}
                onNav={() => {}}
                onDrag={(id, x, y, vx, vy, isDragging) => {
                  if (!isDragging) lastHitYRef.current.set(id, y + PUCK_SIZE / 2);
                  updatePuckPosition(id, x, y, vx, vy, isDragging);
                }}
                getAndroidPerformanceLevel={() => getPerformanceLevel()}
                registerSharedPosition={registerSharedPosition}
              />
            );
          })}

          {/* Countdown 5-4-3-2-1-Go */}
          {gameState === 'countdown' && (
            <View style={gs.countdownOverlay} pointerEvents="box-none">
              <TouchableOpacity style={gs.countdownCloseBtn} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Animated.View style={countdownAnimatedStyle}>
                <Text style={gs.countdownText}>{countdownValue === 'Go' ? tr('go') : countdownValue}</Text>
              </Animated.View>
            </View>
          )}

          {/* Game Over */}
          {gameState === 'finished' && (
            <View style={gs.overlay} pointerEvents="box-none">
              <TouchableOpacity style={[gs.overlayCloseBtn, { top: insets.top + 8 }]} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <BlurOrSolid intensity={40} tint="dark" style={gs.overlayBlur}>
                <Text style={gs.overlayTitle}>{tr('score').replace('{score}', String(score))}</Text>
                {bestScore > 0 && (
                  <Text style={gs.bestScoreText}>{tr('yourBest').replace('{score}', String(bestScore))}</Text>
                )}

                {/* Leaderboard */}
                {leaderboard.length > 0 && (
                  <View style={gs.leaderboard}>
                    <Text style={gs.lbTitle}>{tr('topPlayers')}</Text>
                    <View style={gs.lbCard}>
                      {leaderboard.map((entry, i) => (
                        <View key={`${entry.player_id}-${i}`} style={gs.lbRow}>
                          <Text style={gs.lbRank}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </Text>
                          <Text style={gs.lbName} numberOfLines={2}>
                            {entry.player_name}
                          </Text>
                          <Text style={gs.lbScore}>{entry.score}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity style={gs.startBtn} onPress={startGame}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={gs.startBtnText}>{tr('playAgain')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={gs.closeBtnBig} onPress={onClose}>
                  <Text style={gs.closeBtnBigText}>{tr('close')}</Text>
                </TouchableOpacity>
              </BlurOrSolid>
            </View>
          )}
          </View>
        </CachedBackground>
      </View>
    </Modal>
  );
}

const gs = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1418',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 50,
    overflow: 'hidden',
  },
  hud: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 100,
  },
  hudItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  hudRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudText: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 18,
  },
  hudScore: {
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    fontSize: 20,
  },
  resultsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 10,
    minWidth: 44,
    minHeight: 44,
  },
  closeBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  goalRect: {
    position: 'absolute',
    zIndex: 50,
    borderWidth: 2,
    borderColor: '#666666',
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
  },
  creaseSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 49,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 150,
  },
  countdownCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  countdownText: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 120,
    color: '#fff',
  },
  offsideOverlay: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 90,
  },
  offsideText: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 32,
    color: '#fa2f40',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  puckContainer: {
    position: 'absolute',
    zIndex: 60,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  overlayCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
    zIndex: 210,
  },
  overlayBlur: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    overflow: 'hidden',
    width: SCREEN_W * 0.85,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(250, 47, 64, 0.22)',
  },
  overlayTitle: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 28,
    marginTop: 12,
    marginBottom: 6,
  },
  overlaySub: {
    fontFamily: 'Gilroy-Regular',
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  bestScoreText: {
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fa2f40',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 10,
  },
  startBtnText: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 17,
  },
  closeBtnBig: {
    paddingVertical: 10,
  },
  closeBtnBigText: {
    fontFamily: 'Gilroy-Regular',
    color: '#666',
    fontSize: 14,
  },
  leaderboard: {
    width: '100%',
    marginBottom: 16,
    marginTop: 8,
  },
  lbCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  lbTitle: {
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 8,
  },
  lbRank: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 14,
    width: 26,
    textAlign: 'center',
  },
  lbName: {
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    fontSize: 13,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    lineHeight: 16,
  },
  lbScore: {
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    fontSize: 15,
  },
});
