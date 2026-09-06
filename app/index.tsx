import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import { View, StyleSheet, Dimensions, Image as RNImage, TouchableOpacity, Platform, Vibration, AppState, AppStateStatus, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import Animated, { Easing as ReEasing, useAnimatedStyle, useSharedValue, withDelay, withTiming, runOnJS } from 'react-native-reanimated';

/**
 * The whole puck layer fades in as one group when the home tab (re)mounts.
 * Per-view entering animations left iOS shadow layers painting as grey
 * rectangles for a few frames; a single opacity ramp on the parent hides
 * that window and reads as "the ice lights up".
 */
const PuckSceneFade: React.FC<{ ready: boolean; children: React.ReactNode }> = ({ ready, children }) => {
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (!ready) return;
    // Two frames for native layout/border rendering to settle, then ramp up.
    opacity.value = withDelay(
      120,
      withTiming(1, { duration: 380, easing: ReEasing.out(ReEasing.cubic) })
    );
  }, [opacity, ready]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="box-none">
      {children}
    </Animated.View>
  );
};
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Puck, { PUCK_SCOUT_LOGO } from '../components/Puck';
import { useUser } from '../contexts/UserContext';
import { useScreenContext } from '../contexts/ScreenContext';
import {
  Player,
  loadPlayers,
  getSmartPlayerSelection,
  getBlockedUsers,
  ALL_PLAYERS_LIST_CACHE_KEYS,
  mergePlayerFromPlayersRealtimeRow,
  getPlayerSeasonPoints,
} from '../utils/playerStorage';
import { preloadPlayerAvatars, seedPlayerAvatarUrls, updateAvatarGlobally } from '../utils/AvatarCache';
import { supabase } from '../utils/supabase';
import CountryFilter from '../components/CountryFilter';
import YearFilter from '../components/YearFilter';
import InviteFriendsPill from '../components/InviteFriendsPill';
import IceRinkMarkings from '../components/IceRinkMarkings';
import { colors } from '../theme/colors';
import { useCountryFilter } from '../utils/CountryFilterContext';
import { useYearFilter } from '../utils/YearFilterContext';
import { navigateToPlayerProfile } from '../utils/navigateToPlayer';
import { useLanguage } from '../contexts/LanguageContext';
import { getPerformanceLevel, isLowEndAndroid, startupPhysicsDeferMs, startupRenderGraceMs } from '../utils/devicePerformance';
import { useIsDesktopLayout } from '../hooks/useIsDesktopLayout';
import PuckGame from '../components/PuckGame';
import HockeyStarQuizGame from '../components/HockeyStarQuizGame';
import CachedBackground from '../components/CachedBackground';
import { ICE_BACKGROUND } from '../utils/iceBackground';
import HomeSeoHead from '../components/HomeSeoHead';
import {
  getTopSeasonLeaderRanks,
  getPuckSizeForLeader,
  puckCollisionMinDistance,
  PUCK_BASE_SIZE,
  getScaledPuckBaseSize,
  type LeaderRank,
} from '../utils/leaderDisplay';

// Размер шайбы
const PUCK_SIZE = PUCK_BASE_SIZE;

/** Android: ~30 % мягче движение и отскоки относительно iPhone (подстройте 0.75–0.85). */
const ANDROID_PUCK_SOFT = Platform.OS === 'android' ? 0.7 : 1;
const GAME_PUCK_ID = '__game__';
const QUIZ_GAME_PUCK_ID = '__quiz_game__';

// Упрощенная версия usePuckCollisionSystem для тестового экрана
// boundsFromPlayfieldLayout: width/height пришли с onLayout поля (льда) — без повторного вычета таб-бара
const usePuckCollisionSystem = (
  players: Player[],
  currentUserId?: string,
  currentScreen?: string,
  screenWidth?: number,
  screenHeight?: number,
  boundsFromPlayfieldLayout?: boolean,
  physicsActive = true,
  leaderRanks?: Map<string, LeaderRank>,
  basePuckSize?: number,
) => {
  const puckSize = basePuckSize ?? PUCK_BASE_SIZE;
  const leaderRanksRef = useRef(leaderRanks);
  leaderRanksRef.current = leaderRanks;
  const sizeForPlayer = useCallback(
    (playerId: string) => getPuckSizeForLeader(puckSize, leaderRanksRef.current?.get(playerId)),
    [puckSize]
  );
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
      if (!isActive) {
        console.log('📱 Приложение ушло в фон - приостанавливаем анимацию шайб');
      } else {
        console.log('📱 Приложение активно - возобновляем анимацию шайб');
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);
  // Отслеживаем активные столкновения для предотвращения повторной вибрации
  const activeCollisionsRef = useRef<Set<string>>(new Set());
  /** Подпись границ — при переходе с fallback на размер льда с onLayout не пересоздаём шайбы, а поджимаем к новому прямоугольнику */
  const prevBoundsSigRef = useRef<string>('');
  // Защита от переинициализации в первые секунды после загрузки
  const initializationTimeRef = useRef<number>(0);
  // ОПТИМИЗАЦИЯ: Уменьшен период защиты с 6000ms до 3000ms для быстрого старта анимации
  const INITIALIZATION_PROTECTION_MS = Platform.OS === 'ios' ? 2000 : 1200;
  
  // Определяем уровень производительности
  const performanceLevel = useMemo(() => getPerformanceLevel(), []);
  
  // Для максимальной плавности используем useFrameCallback
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef(0);
  
  // Для интерполяции между кадрами
  const renderPositionsRef = useRef<PuckPosition[]>([]);
  const renderPositionsMapRef = useRef<Map<string, PuckPosition>>(new Map());
  const physicsPositionsRef = useRef<PuckPosition[]>([]);
  const alphaRef = useRef(1); // Интерполяционный коэффициент
  
  // Shared values для всех позиций - обновляются напрямую без React state
  // Тип: объект с value для совместимости с useSharedValue
  const sharedPositionsRef = useRef<Map<string, { x: { value: number }, y: { value: number }, vx?: { value: number }, vy?: { value: number } }>>(new Map());
  
  // Адаптивные константы для FPS - баланс между плавностью и производительностью
  // ИСПРАВЛЕНИЕ: Увеличено до 80 FPS для максимальной плавности
  // 80 FPS обеспечивает очень плавную анимацию, но с оптимизациями нагрузка будет контролируемой
  // Используем уровень производительности устройства для определения частоты кадров
  // Частота физики: на большинстве экранов 60 Гц — 80 Гц лишняя нагрузка; на слабых Android ещё ниже.
  const { STEP_MS, FIXED_DT, MAX_STEPS, TARGET_FPS } = useMemo(() => {
    let fps: number;
    switch (performanceLevel) {
      case 'high':
        if (Platform.OS === 'android') fps = 60;
        else if (Platform.OS === 'ios') fps = 80;
        else fps = 80;
        break;
      case 'medium':
        if (Platform.OS === 'android') fps = 32;
        else fps = 45;
        break;
      case 'low':
      default:
        // На слабых Android чуть выше частота + интерполяция между шагами = меньше дёрганий
        fps = Platform.OS === 'android' ? 24 : 16;
        break;
    }
    return {
      STEP_MS: 1000 / fps,
      FIXED_DT: 1 / fps,
      MAX_STEPS: 1,
      TARGET_FPS: fps,
    };
  }, [performanceLevel]);

  // Интервал обновления React state - оптимизирован для производительности
  // Shared values обновляются отдельно; реже трогаем React на слабом железе.
  const reactUpdateInterval = useMemo(() => {
    if (Platform.OS === 'web') return 1;
    if (Platform.OS === 'android') {
      if (performanceLevel === 'low') return 16;
      if (performanceLevel === 'medium') return 10;
      return 5;
    }
    if (Platform.OS === 'ios') {
      if (performanceLevel === 'low') return 5;
      return 3;
    }
    return 1;
  }, [performanceLevel]);

  // В режиме покоя реже считаем физику: на low — ещё реже
  const idleFrameSkip = useMemo(() => {
    if (performanceLevel === 'low') return 14;
    if (performanceLevel === 'medium') return 6;
    return 3;
  }, [performanceLevel]);

  const lowPhysicsTickRef = useRef(0);
  const physicsActiveRef = useRef(physicsActive);
  physicsActiveRef.current = physicsActive;
  const renderGraceUntilRef = useRef(0);

  useEffect(() => {
    if (physicsActive) {
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
      lowPhysicsTickRef.current = 0;
    }
  }, [physicsActive]);

  // Получаем безопасные зоны для учета системных элементов
  const insets = useSafeAreaInsets();

  const windowDimensions = Dimensions.get('window');
  const width = screenWidth ?? windowDimensions.width;
  const height = screenHeight ?? windowDimensions.height;
  // Динамическое вычисление высоты таб-бара
  // Значения из app/_layout.tsx: height: 80, paddingTop: 10, paddingBottom: 10
  const tabBarHeight = useMemo(() => {
    const baseHeight = 80; // height из tabBarStyle
    const paddingTop = 10; // paddingTop из tabBarStyle
    const paddingBottom = 10; // paddingBottom из tabBarStyle
    return baseHeight + paddingTop + paddingBottom;
  }, []);

  const boundaries = useMemo(() => {
    if (boundsFromPlayfieldLayout) {
      // Совпадает с styles.innerBorder (top/left/right/bottom: 8), плюс зазор,
      // чтобы шайба (и визуал аватара) не заезжала за белую линию и скругления.
      const innerInset = 8;
      const edgePad = Platform.OS === 'android' ? 8 : 4;
      return {
        left: innerInset + edgePad,
        top: innerInset + edgePad,
        right: width - puckSize - innerInset - edgePad,
        bottom: height - puckSize - innerInset - edgePad,
      };
    }

    // Fallback: размеры окна без onLayout льда — вычитаем таб-бар (устаревшая модель)
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
  }, [width, height, puckSize, tabBarHeight, insets.bottom, boundsFromPlayfieldLayout]);

  // Инициализация и обновление позиций
  useEffect(() => {
    if (!players || players.length === 0) {
      setPuckPositions([]);
      previousPlayersRef.current = [];
      physicsPositionsRef.current = [];
      renderPositionsRef.current = [];
      isInitializedRef.current = false;
      sharedPositionsRef.current.clear();
      // ИСПРАВЛЕНИЕ: Очищаем все рефы для предотвращения "призраков"
      renderPositionsMapRef.current.clear();
      activeCollisionsRef.current.clear();
      initializationTimeRef.current = 0;
      prevBoundsSigRef.current = '';
      return;
    }

    const boundsSig = `${boundaries.left}|${boundaries.top}|${boundaries.right}|${boundaries.bottom}`;
    const playerSig = players.map((p) => p.id).sort().join(',');
    const prevListSig = previousPlayersRef.current.map((p) => p.id).sort().join(',');

    if (
      isInitializedRef.current &&
      physicsPositionsRef.current.length > 0 &&
      prevBoundsSigRef.current !== '' &&
      prevBoundsSigRef.current !== boundsSig &&
      playerSig === prevListSig
    ) {
      prevBoundsSigRef.current = boundsSig;
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
      const clamped = physicsPositionsRef.current.map((p) => ({
        ...p,
        x: Math.max(boundaries.left, Math.min(boundaries.right, p.x)),
        y: Math.max(boundaries.top, Math.min(boundaries.bottom, p.y)),
      }));
      physicsPositionsRef.current = clamped;
      renderPositionsRef.current = clamped;
      clamped.forEach((p) => {
        const sh = sharedPositionsRef.current.get(p.id);
        if (sh) {
          sh.x.value = p.x;
          sh.y.value = p.y;
        }
      });
      const newMap = new Map<string, PuckPosition>();
      clamped.forEach((p) => newMap.set(p.id, p));
      renderPositionsMapRef.current = newMap;
      return;
    }

    const now = Date.now();
    const timeSinceInit = initializationTimeRef.current > 0 ? now - initializationTimeRef.current : Infinity;
    const isInProtectionPeriod = timeSinceInit < INITIALIZATION_PROTECTION_MS;

    // Определяем функцию генерации позиции здесь, чтобы она была доступна ниже
    // Единая скорость шайб для всех устройств (как на iOS)
    const baseSpeedMultiplier = (performanceLevel === 'low' ? 0.36 : 0.49) * ANDROID_PUCK_SOFT;
    
    const generatePosition = (existingPositions: PuckPosition[]): PuckPosition => {
      const maxAttempts = performanceLevel === 'low' ? 20 : performanceLevel === 'medium' ? 50 : 100;
      let x = boundaries.left;
      let y = boundaries.top;
      let attempts = 0;
      let validPosition = false;

      while (!validPosition && attempts < maxAttempts) {
        x = Math.random() * (boundaries.right - boundaries.left - 100) + boundaries.left + 50;
        y = Math.random() * (boundaries.bottom - boundaries.top - 100) + boundaries.top + 50;
        
        validPosition = existingPositions.every(pos => {
          const dx = x - pos.x;
          const dy = y - pos.y;
          const minDist = puckCollisionMinDistance(puckSize, pos.size);
          return (dx * dx + dy * dy) >= minDist * minDist;
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

    // Проверка изменений списка игроков с защитой от переинициализации
    if (isInitializedRef.current) {
      const previousIds = new Set(previousPlayersRef.current.map(p => p.id));
      const currentIds = new Set(players.map(p => p.id));
      
      // Проверяем, все ли текущие игроки были в предыдущем списке
      const allCurrentInPrevious = Array.from(currentIds).every(id => previousIds.has(id));
      
      // Если все текущие игроки уже есть - это фильтрация (уменьшение списка)
      // В этом случае просто удаляем лишние шайбы, не переинициализируя позиции
      if (allCurrentInPrevious && currentIds.size > 0 && previousIds.size !== currentIds.size) {
        // Фильтрация - удаляем шайбы, которых больше нет в списке
        setPuckPositions(prev => {
          const filtered = prev.filter(pos => currentIds.has(pos.id));
          physicsPositionsRef.current = filtered;
          renderPositionsRef.current = filtered;
          
          // ИСПРАВЛЕНИЕ: Очищаем все рефы от удаленных шайб
          // Это предотвращает столкновения с "призраками" - невидимыми шайбами
          const removedIds = new Set<string>();
          Array.from(sharedPositionsRef.current.keys()).forEach(id => {
            if (!currentIds.has(id)) {
              sharedPositionsRef.current.delete(id);
              removedIds.add(id);
            }
          });
          
          // Очищаем activeCollisionsRef от коллизий с удаленными шайбами
          if (removedIds.size > 0) {
            Array.from(activeCollisionsRef.current).forEach(key => {
              const ids = key.split('-');
              if (ids.some(id => removedIds.has(id))) {
                activeCollisionsRef.current.delete(key);
              }
            });
          }
          
          // Обновляем renderPositionsMapRef
          const newMap = new Map<string, PuckPosition>();
          filtered.forEach(pos => {
            newMap.set(pos.id, pos);
          });
          renderPositionsMapRef.current = newMap;
          
          return filtered;
        });
        previousPlayersRef.current = players;
        return;
      }
      
      // Проверяем, одинаковые ли игроки
      const sameSize = previousIds.size === currentIds.size;
      const samePlayers = sameSize && allCurrentInPrevious;

      if (samePlayers) {
        // Список не изменился - просто обновляем ref
        previousPlayersRef.current = players;
        return;
      }
      
      // В период защиты: добавляем новые шайбы И удаляем отфильтрованные
      if (isInProtectionPeriod && currentIds.size > 0) {
        const newPlayerIds = Array.from(currentIds).filter(id => !previousIds.has(id));
        const removedPlayerIds = Array.from(previousIds).filter(id => !currentIds.has(id));
        
        if (newPlayerIds.length > 0 || removedPlayerIds.length > 0) {
          setPuckPositions(prev => {
            // ИСПРАВЛЕНИЕ: Сначала удаляем шайбы, которых больше нет в списке
            let newPositions = removedPlayerIds.length > 0 
              ? prev.filter(pos => currentIds.has(pos.id))
              : [...prev];
            
            // Затем добавляем новые шайбы
            const existingIds = new Set(newPositions.map(p => p.id));
            newPlayerIds.forEach(playerId => {
              if (!existingIds.has(playerId)) {
                const pos = generatePosition(newPositions);
                pos.id = playerId;
                pos.size = sizeForPlayer(playerId);
                newPositions.push(pos);
              }
            });
            
            physicsPositionsRef.current = newPositions;
            renderPositionsRef.current = newPositions;
            
            // ИСПРАВЛЕНИЕ: Очищаем все рефы от удаленных шайб
            if (removedPlayerIds.length > 0) {
              const removedSet = new Set(removedPlayerIds);
              removedPlayerIds.forEach(id => {
                sharedPositionsRef.current.delete(id);
              });
              
              // Очищаем activeCollisionsRef от коллизий с удаленными шайбами
              Array.from(activeCollisionsRef.current).forEach(key => {
                const ids = key.split('-');
                if (ids.some(id => removedSet.has(id))) {
                  activeCollisionsRef.current.delete(key);
                }
              });
              
              // Обновляем renderPositionsMapRef
              const newMap = new Map<string, PuckPosition>();
              newPositions.forEach(pos => {
                newMap.set(pos.id, pos);
              });
              renderPositionsMapRef.current = newMap;
            }
            
            return newPositions;
          });
        }
        previousPlayersRef.current = players;
        return;
      }

      // Вне периода защиты - обновляем позиции с сохранением существующих
      const prevPlayers = previousPlayersRef.current;
      
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем, полностью ли изменился список игроков
      // Если больше 50% игроков новые - это полная замена (например, смена фильтра "Все" на "Латвия")
      // В этом случае пересоздаем все позиции для корректной работы фильтров
      const newPlayerIds = Array.from(currentIds).filter(id => !previousIds.has(id));
      const removedPlayerIds = Array.from(previousIds).filter(id => !currentIds.has(id));
      const totalChanged = newPlayerIds.length + removedPlayerIds.length;
      const isMajorChange = totalChanged > Math.max(previousIds.size, currentIds.size) * 0.5; // Больше 50% изменилось
      
      // Если список полностью изменился (например, смена фильтра) - пересоздаем все позиции
      if (isMajorChange && currentIds.size > 0) {
        console.log(`🔄 [ANIMATION] Полная замена списка игроков (${previousIds.size} -> ${currentIds.size}), пересоздаем все позиции`);
        const positions: PuckPosition[] = [];
        const collisionPositions: PuckPosition[] = [];
        
        players.forEach(player => {
          const pos = generatePosition(collisionPositions);
          pos.id = player.id;
          pos.size = sizeForPlayer(player.id);
          positions.push(pos);
          collisionPositions.push(pos);
          
          // Обновляем shared values
          let shared = sharedPositionsRef.current.get(player.id);
          if (!shared) {
            shared = {
              x: { value: pos.x } as any,
              y: { value: pos.y } as any,
            };
            sharedPositionsRef.current.set(player.id, shared);
          } else {
            shared.x.value = pos.x;
            shared.y.value = pos.y;
          }
        });
        
        // Очищаем shared values для удаленных игроков
        removedPlayerIds.forEach(id => {
          sharedPositionsRef.current.delete(id);
        });
        
        // Очищаем activeCollisionsRef от коллизий с удаленными шайбами
        if (removedPlayerIds.length > 0) {
          const removedSet = new Set(removedPlayerIds);
          Array.from(activeCollisionsRef.current).forEach(key => {
            const ids = key.split('-');
            if (ids.some(id => removedSet.has(id))) {
              activeCollisionsRef.current.delete(key);
            }
          });
        }
        
        setPuckPositions(positions);
        physicsPositionsRef.current = positions;
        renderPositionsRef.current = positions;
        
        // Обновляем renderPositionsMapRef
        const newMap = new Map<string, PuckPosition>();
        positions.forEach(pos => {
          newMap.set(pos.id, pos);
        });
        renderPositionsMapRef.current = newMap;
        
        previousPlayersRef.current = players;
        prevBoundsSigRef.current = boundsSig;
        return;
      }
      
      setPuckPositions(prevPositions => {
        const existingMap = new Map(prevPositions.map(pos => [pos.id, pos]));
        const newPositions: PuckPosition[] = [];
        const collisionPositions: PuckPosition[] = prevPositions.map(pos => ({ ...pos }));
        let changed = false;

        players.forEach(player => {
        const existing = existingMap.get(player.id);
          const prevPlayer = prevPlayers.find(p => p.id === player.id);
          const isNewOrChanged = !existing || !prevPlayer || prevPlayer.status !== player.status;

          if (existing && !isNewOrChanged) {
            newPositions.push(existing);
          } else {
            const newPos = generatePosition(collisionPositions);
            newPos.id = player.id;
            newPos.size = sizeForPlayer(player.id);
            newPositions.push(newPos);
            collisionPositions.push(newPos);
            changed = true;

            let shared = sharedPositionsRef.current.get(player.id);
      if (!shared) {
        shared = {
                x: { value: newPos.x } as any,
                y: { value: newPos.y } as any,
        };
              sharedPositionsRef.current.set(player.id, shared);
      } else {
              shared.x.value = newPos.x;
              shared.y.value = newPos.y;
        }
      }
    });
    
        if (newPositions.length !== prevPositions.length) {
          changed = true;
        }

        const currentIds = new Set(players.map(p => p.id));
        
        // ИСПРАВЛЕНИЕ: Очищаем все рефы от удаленных шайб
        const removedIds = new Set<string>();
        Array.from(sharedPositionsRef.current.keys()).forEach(id => {
          if (!currentIds.has(id)) {
            sharedPositionsRef.current.delete(id);
            removedIds.add(id);
          }
        });
        
        // Очищаем activeCollisionsRef от коллизий с удаленными шайбами
        if (removedIds.size > 0) {
          Array.from(activeCollisionsRef.current).forEach(key => {
            const ids = key.split('-');
            if (ids.some(id => removedIds.has(id))) {
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
        
        // Обновляем renderPositionsMapRef
        const newMap = new Map<string, PuckPosition>();
        newPositions.forEach(pos => {
          newMap.set(pos.id, pos);
        });
        renderPositionsMapRef.current = newMap;
        
        return newPositions;
      });
      return;
    }

    // ИСПРАВЛЕНИЕ: Очищаем старые рефы перед инициализацией новых позиций
    // Это предотвращает "призраков" при полной переинициализации
    const currentPlayerIds = new Set(players.map(p => p.id));
    
    // Очищаем sharedPositionsRef от устаревших записей
    Array.from(sharedPositionsRef.current.keys()).forEach(id => {
      if (!currentPlayerIds.has(id)) {
        sharedPositionsRef.current.delete(id);
      }
    });
    
    // Очищаем activeCollisionsRef полностью при переинициализации
    activeCollisionsRef.current.clear();
    
    const positions: PuckPosition[] = [];

    // СПЕЦИАЛЬНЫЙ РЕЖИМ ДЛЯ МАЛОГО КОЛИЧЕСТВА ШАЙБ (1–2)
    // Для стран с 1 игроком (Литва, Латвия, Казахстан и т.п.) расставляем шайбы
    // в детерминированные, далеко разнесённые позиции, чтобы они никогда
    // не налезали друг на друга и не прятались за границами.
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
          x: base.x,
          y: base.y,
          vx: (Math.random() - 0.5) * baseSpeedMultiplier,
          vy: (Math.random() - 0.5) * baseSpeedMultiplier,
          size: sizeForPlayer(player.id),
          isDragging: false,
        };
        positions.push(pos);

        let shared = sharedPositionsRef.current.get(player.id);
        if (!shared) {
          shared = {
            x: { value: pos.x } as any,
            y: { value: pos.y } as any,
          };
          sharedPositionsRef.current.set(player.id, shared);
        } else {
          shared.x.value = pos.x;
          shared.y.value = pos.y;
        }
      });
    } else {
      // Обычный режим для 3+ шайб — используем генератор случайных позиций
    players.forEach(player => {
      const pos = generatePosition(positions);
      pos.id = player.id;
      pos.size = sizeForPlayer(player.id);
      positions.push(pos);

      let shared = sharedPositionsRef.current.get(player.id);
      if (!shared) {
        shared = {
          x: { value: pos.x } as any,
          y: { value: pos.y } as any,
        };
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
    
    // Обновляем renderPositionsMapRef
    const newMap = new Map<string, PuckPosition>();
    positions.forEach(pos => {
      newMap.set(pos.id, pos);
    });
    renderPositionsMapRef.current = newMap;
    
    // Запоминаем время инициализации для защиты от переинициализации
    if (initializationTimeRef.current === 0) {
      initializationTimeRef.current = Date.now();
      renderGraceUntilRef.current = Date.now() + startupRenderGraceMs();
      console.log(`🚀 [ANIMATION] usePuckCollisionSystem: позиции инициализированы для ${positions.length} шайб`);
    } else {
      console.log(`🔄 [ANIMATION] usePuckCollisionSystem: позиции ПЕРЕИНИЦИАЛИЗИРОВАНЫ для ${positions.length} шайб`);
    }
    prevBoundsSigRef.current = boundsSig;
  }, [players, boundaries, performanceLevel]);

  // Физический шаг с адаптивными константами в зависимости от производительности
  const stepPhysics = useCallback(() => {
    const currentPositions = physicsPositionsRef.current;
    if (currentPositions.length === 0) return;
    
    // Оригинальные параметры физики для всех устройств (как на iOS)
    const minSpeed = 0.8;
    const maxSpeed = 6.0;
    const friction = 0.999;

    const hasNonDraggingPucks = currentPositions.some((p) => !p.isDragging);
    if (!hasNonDraggingPucks) return;

    let updatedPositions = currentPositions.map((pos) => {
      if (pos.isDragging) return pos;

      let { x, y, vx, vy } = pos;

      // Минимальная скорость
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

      // Как в PuckGame: эталон 80 FPS в интеграции, чтобы скорость по экрану не зависела от TARGET_FPS.
      // Иначе на Android (часто 60 шагов/с) шайбы медленнее, чем на iPhone (80), и главная «тормознее» игры.
      const SPEED_MULTIPLIER = 1.2;
      const REFERENCE_HOME_FPS = 80;
      let moveX = vx * FIXED_DT * REFERENCE_HOME_FPS * SPEED_MULTIPLIER * ANDROID_PUCK_SOFT;
      let moveY = vy * FIXED_DT * REFERENCE_HOME_FPS * SPEED_MULTIPLIER * ANDROID_PUCK_SOFT;
      const maxMovePerStep =
        pos.size * (Platform.OS === 'android' && performanceLevel === 'low' ? 0.35 : 0.55);
      const moveLen = Math.hypot(moveX, moveY);
      if (moveLen > maxMovePerStep) {
        const scale = maxMovePerStep / moveLen;
        moveX *= scale;
        moveY *= scale;
      }
      x += moveX;
      y += moveY;

      // Границы
      if (x <= boundaries.left) {
        x = boundaries.left;
        vx = Math.abs(vx);
      } else if (x >= boundaries.right) {
        x = boundaries.right;
        vx = -Math.abs(vx);
      }

      if (y <= boundaries.top) {
        y = boundaries.top;
        vy = Math.abs(vy);
      } else if (y >= boundaries.bottom) {
        y = boundaries.bottom;
        vy = -Math.abs(vy);
      }

      // Проверка коллизий - оптимизирована для слабых Android устройств
      const isWeakDevice = Platform.OS === 'android' && (performanceLevel === 'low' || performanceLevel === 'medium');

      // Только физика столкновений для автоматических шайб
      if (!pos.isDragging) {
        const collisionCheckRadiusMul = isWeakDevice ? 2.5 : 4;
        const maxCollisionChecks =
          performanceLevel === 'low'
            ? Math.min(14, currentPositions.length)
            : performanceLevel === 'medium'
              ? Math.min(18, currentPositions.length)
              : currentPositions.length;
        let collisionChecks = 0;
        
        for (const other of currentPositions) {
          if (other.id === pos.id || other.isDragging) continue;
          if (collisionChecks >= maxCollisionChecks) break;

          const dx = x - other.x;
          const dy = y - other.y;
          const distSq = dx * dx + dy * dy;
          const pairMinDist = puckCollisionMinDistance(pos.size, other.size);
          const pairMinDistSq = pairMinDist * pairMinDist;
          const collisionCheckRadius = pairMinDistSq * collisionCheckRadiusMul;

          // Пропускаем далекие шайбы для оптимизации (особенно для слабых устройств)
          if (distSq > collisionCheckRadius) continue;
          collisionChecks++;

          if (distSq < pairMinDistSq && distSq > 0) {
            // Для слабых устройств упрощаем физику столкновения
            if (isWeakDevice) {
              // Упрощенная физика для слабых устройств - только отталкивание
              const dist = Math.sqrt(distSq);
              const angle = Math.atan2(dy, dx);
              const pushForce = 0.3 * ANDROID_PUCK_SOFT; // Упрощенный импульс
              vx += Math.cos(angle) * pushForce;
              vy += Math.sin(angle) * pushForce;
              
              // Ограничиваем скорость
              const speed = Math.sqrt(vx * vx + vy * vy);
              if (speed > maxSpeed) {
                const ratio = maxSpeed / speed;
                vx *= ratio;
                vy *= ratio;
              }
            } else {
              // Полная физика для мощных устройств
              const dist = Math.sqrt(distSq);
              const angle = Math.atan2(dy, dx);

              // Физика столкновения (полная для всех устройств)
              const relativeVx = vx - other.vx;
              const relativeVy = vy - other.vy;
              const dot = relativeVx * Math.cos(angle) + relativeVy * Math.sin(angle);

              if (dot < 0) {
                // Коэффициент упругости столкновения
                const restitution = 0.5;
                const impulse = dot * restitution * ANDROID_PUCK_SOFT;
                vx -= impulse * Math.cos(angle);
                vy -= impulse * Math.sin(angle);
                    
                // Добавляем дополнительный импульс отталкивания для предотвращения кучкования
                const additionalPush = 0.2 * ANDROID_PUCK_SOFT;
                vx += Math.cos(angle) * additionalPush;
                vy += Math.sin(angle) * additionalPush;
                    
                // Ограничиваем скорость сразу после столкновения
                const speed = Math.sqrt(vx * vx + vy * vy);
                if (speed > maxSpeed) {
                  const ratio = maxSpeed / speed;
                  vx *= ratio;
                  vy *= ratio;
                }
              }

              // Более мягкое сглаживание для плавности
              vx *= 0.95;
              vy *= 0.95;
            }

            // Отслеживаем столкновения для вибрации (только один раз при начале столкновения)
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

      // Трение и ограничение скорости
      vx *= friction;
      vy *= friction;

      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > maxSpeed) {
        const ratio = maxSpeed / speed;
        vx *= ratio;
        vy *= ratio;
      }

      // Финальная проверка границ
      x = Math.max(boundaries.left, Math.min(boundaries.right, x));
      y = Math.max(boundaries.top, Math.min(boundaries.bottom, y));

      return { ...pos, x, y, vx, vy };
    });

    // Оптимизированное решение коллизий - один проход с накоплением смещений
    let maxPuckSize = puckSize;
    for (let i = 0; i < updatedPositions.length; i++) {
      if (updatedPositions[i].size > maxPuckSize) maxPuckSize = updatedPositions[i].size;
    }
    const checkRadiusMul =
      Platform.OS === 'android' && performanceLevel === 'low'
        ? 2
        : Platform.OS === 'android' && performanceLevel === 'medium'
          ? 2.2
          : 2;
    const checkRadiusSq = (maxPuckSize * checkRadiusMul) * (maxPuckSize * checkRadiusMul);
    
    // Массив для накопления смещений
    const offsets = new Array(updatedPositions.length).fill(0).map(() => ({ x: 0, y: 0 }));
    
    // Проверяем все коллизии - один проход: вычисляем все необходимые смещения
    // ОПТИМИЗАЦИЯ: Пропускаем проверку далеких шайб для снижения нагрузки
    for (let i = 0; i < updatedPositions.length; i++) {
      const pos1 = updatedPositions[i];
      
      for (let j = i + 1; j < updatedPositions.length; j++) {
        const pos2 = updatedPositions[j];
        
        // Пропускаем если обе перетаскиваются
        if (pos1.isDragging && pos2.isDragging) continue;
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distSq = dx * dx + dy * dy;
        
        // ОПТИМИЗАЦИЯ: Ранний выход - пропускаем далекие шайбы
        if (distSq > checkRadiusSq) continue;
        
        const pairMinDistance = puckCollisionMinDistance(pos1.size, pos2.size);
        const pairMinDistSq = pairMinDistance * pairMinDistance;
        if (distSq < pairMinDistSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const overlap = pairMinDistance - dist;
          
          // ОПТИМИЗАЦИЯ: Используем нормализованный вектор вместо Math.atan2/Math.cos/Math.sin
          // Это снижает количество тригонометрических вычислений
          const invDist = 1 / dist; // Вычисляем обратное расстояние один раз
          const nx = dx * invDist; // Нормализованный вектор X (заменяет cos(angle))
          const ny = dy * invDist; // Нормализованный вектор Y (заменяет sin(angle))
          
          // Увеличиваем силу отталкивания для предотвращения кучкования
          const pushStrength =
            Platform.OS === 'android' && performanceLevel === 'low'
              ? 1.5 * ANDROID_PUCK_SOFT
              : 1.2 * ANDROID_PUCK_SOFT;
          const adjustedOverlap = overlap * pushStrength;
          
          // Накопление смещений
          if (pos1.isDragging) {
            // pos1 перетаскивается, двигаем только pos2
            offsets[j].x -= nx * adjustedOverlap;
            offsets[j].y -= ny * adjustedOverlap;
          } else if (pos2.isDragging) {
            // pos2 перетаскивается, двигаем только pos1
            offsets[i].x += nx * adjustedOverlap;
            offsets[i].y += ny * adjustedOverlap;
          } else {
            // Обе автоматические - двигаем обе
            const halfOverlap = adjustedOverlap * 0.5;
            offsets[i].x += nx * halfOverlap;
            offsets[i].y += ny * halfOverlap;
            offsets[j].x -= nx * halfOverlap;
            offsets[j].y -= ny * halfOverlap;
          }
          
          // Добавляем импульс скорости для лучшего разлета при столкновении
          // ОПТИМИЗАЦИЯ: Используем уже вычисленные нормализованные векторы вместо cos/sin
          if (!pos1.isDragging && !pos2.isDragging) {
            const impulseStrength = 0.3 * ANDROID_PUCK_SOFT; // Сила импульса
            
            // Придаем скорость в направлении отталкивания (используем nx, ny вместо cos/sin)
            updatedPositions[i].vx += nx * impulseStrength;
            updatedPositions[i].vy += ny * impulseStrength;
            updatedPositions[j].vx -= nx * impulseStrength;
            updatedPositions[j].vy -= ny * impulseStrength;
          }
          
          // Отслеживаем столкновения для вибрации (только один раз при начале столкновения)
          if (currentUserId && (pos1.id === currentUserId || pos2.id === currentUserId)) {
            // Создаем уникальный ключ для пары шайб (сортируем ID для консистентности)
            const collisionKey = [pos1.id, pos2.id].sort().join('-');
            
            // Если это новое столкновение (еще не было вибрации), отмечаем его
            if (!activeCollisionsRef.current.has(collisionKey)) {
              activeCollisionsRef.current.add(collisionKey);
              collisionDetectedRef.current = true;
            }
          }
        }
      }
    }
    
    // Применяем накопленные смещения за один проход
    for (let i = 0; i < updatedPositions.length; i++) {
      if (offsets[i].x !== 0 || offsets[i].y !== 0) {
        updatedPositions[i] = {
          ...updatedPositions[i],
          x: Math.max(boundaries.left, Math.min(boundaries.right, updatedPositions[i].x + offsets[i].x)),
          y: Math.max(boundaries.top, Math.min(boundaries.bottom, updatedPositions[i].y + offsets[i].y)),
        };
      }
    }

    // На слабых Android при высокой скорости один проход separation не успевает — дожимаем overlap.
    const overlapIterations =
      Platform.OS === 'android' && performanceLevel === 'low'
        ? 4
        : Platform.OS === 'android' && performanceLevel === 'medium'
          ? 2
          : 1;
    for (let iter = 0; iter < overlapIterations; iter++) {
      let hadOverlap = false;
      for (let i = 0; i < updatedPositions.length; i++) {
        const pos1 = updatedPositions[i];
        for (let j = i + 1; j < updatedPositions.length; j++) {
          const pos2 = updatedPositions[j];
          if (pos1.isDragging && pos2.isDragging) continue;

          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const distSq = dx * dx + dy * dy;
          const pairMinDistance = puckCollisionMinDistance(pos1.size, pos2.size);
          const pairMinDistSq = pairMinDistance * pairMinDistance;
          if (distSq >= pairMinDistSq || distSq <= 0) continue;

          hadOverlap = true;
          const dist = Math.sqrt(distSq);
          const overlap = pairMinDistance - dist;
          const invDist = 1 / dist;
          const nx = dx * invDist;
          const ny = dy * invDist;

          if (pos1.isDragging) {
            updatedPositions[j] = {
              ...pos2,
              x: Math.max(boundaries.left, Math.min(boundaries.right, pos2.x - nx * overlap)),
              y: Math.max(boundaries.top, Math.min(boundaries.bottom, pos2.y - ny * overlap)),
            };
          } else if (pos2.isDragging) {
            updatedPositions[i] = {
              ...pos1,
              x: Math.max(boundaries.left, Math.min(boundaries.right, pos1.x + nx * overlap)),
              y: Math.max(boundaries.top, Math.min(boundaries.bottom, pos1.y + ny * overlap)),
            };
          } else {
            const half = overlap * 0.5;
            updatedPositions[i] = {
              ...pos1,
              x: Math.max(boundaries.left, Math.min(boundaries.right, pos1.x + nx * half)),
              y: Math.max(boundaries.top, Math.min(boundaries.bottom, pos1.y + ny * half)),
            };
            updatedPositions[j] = {
              ...pos2,
              x: Math.max(boundaries.left, Math.min(boundaries.right, pos2.x - nx * half)),
              y: Math.max(boundaries.top, Math.min(boundaries.bottom, pos2.y - ny * half)),
            };
          }
        }
      }
      if (!hadOverlap) break;
    }

    // Обновляем референсы для интерполяции
    physicsPositionsRef.current = updatedPositions;
  }, [boundaries, currentUserId, puckSize, performanceLevel, FIXED_DT, TARGET_FPS]);

  // ОПТИМИЗАЦИЯ: Режим покоя - снижаем частоту обновления когда нет взаимодействия
  const lastInteractionTimeRef = useRef<number>(Date.now());
  const isIdleModeRef = useRef<boolean>(false);
  // ОПТИМИЗАЦИЯ: Уменьшено с 30 до 12 секунд для быстрого перехода в режим покоя и снижения нагрузки
  const IDLE_TIMEOUT_MS = 12000; // 12 секунд без взаимодействия = режим покоя
  const frameCounterRef = useRef(0);
  
  // Функция для обновления времени последнего взаимодействия
  const updateInteractionTime = useCallback(() => {
    lastInteractionTimeRef.current = Date.now();
    if (isIdleModeRef.current) {
      isIdleModeRef.current = false;
      // ОПТИМИЗАЦИЯ: Логируем только в dev режиме для снижения нагрузки
      if (__DEV__) {
      console.log('📱 [PERFORMANCE] Выход из режима покоя - пользователь активен');
      }
    }
  }, []);

  // Используем requestAnimationFrame с интерполяцией для максимальной плавности
  const animationRunningRef = useRef(false);
  const appIsActiveRef = useRef(appIsActive);
  
  
  // Обновляем ref при изменении состояния и сбрасываем время при уходе в фон
  useEffect(() => {
    appIsActiveRef.current = appIsActive;
    if (!appIsActive) {
      // Сбрасываем время при уходе в фон, чтобы при возврате анимация сразу продолжилась
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
    }
  }, [appIsActive]);
  
  // ОПТИМИЗАЦИЯ: Экспортируем функцию обновления времени взаимодействия для компонентов
  useEffect(() => {
    (window as any).__updatePuckInteraction = updateInteractionTime;
    return () => {
      delete (window as any).__updatePuckInteraction;
    };
  }, [updateInteractionTime]);
  
  // 🎯 ЭФФЕКТ "ВЗРЫВА" при нажатии на звезду — экспортируем функцию
  useEffect(() => {
    (window as any).__triggerPuckExplosion = () => {
      const currentPositions = physicsPositionsRef.current;
      if (currentPositions.length > 0) {
        const explosionSpeed = 20; // Очень сильный импульс для ОЧЕНЬ заметного эффекта
        const updatedPositions = currentPositions.map(pos => {
          // Случайное направление для каждой шайбы
          const angle = Math.random() * Math.PI * 2;
          const speed = explosionSpeed * (0.8 + Math.random() * 0.4); // Варьируем скорость 80-120%
          return {
            ...pos,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          };
        });
        physicsPositionsRef.current = updatedPositions;
        console.log('💥 Shake explosion effect applied to', updatedPositions.length, 'pucks with speed', explosionSpeed);
      }
    };
    return () => {
      delete (window as any).__triggerPuckExplosion;
    };
  }, []);
  
  // Отслеживаем наличие шайб для запуска анимации (без перезапуска при изменении количества)
  const hasPucks = puckPositions.length > 0;
  const hasPucksRef = useRef(hasPucks);
  useEffect(() => {
    hasPucksRef.current = hasPucks;
  }, [hasPucks]);
  
  // Отслеживаем текущий экран для остановки анимации
  const isOnHomeScreen = currentScreen === 'home';
  const isOnHomeScreenRef = useRef(isOnHomeScreen);
  useEffect(() => {
    isOnHomeScreenRef.current = isOnHomeScreen;
    if (!isOnHomeScreen) {
      console.log('📱 Ушли с главного экрана - приостанавливаем анимацию шайб');
    }
  }, [isOnHomeScreen]);
  
  useEffect(() => {
    // Не запускаем анимацию если приложение в фоне, не на главном экране или идёт soft-start
    if (!appIsActive || !isOnHomeScreen || !physicsActiveRef.current) {
      if (animationRunningRef.current && __DEV__) {
        console.log('⏸️ Останавливаем анимацию:', { appIsActive, isOnHomeScreen, hasPucks: hasPucksRef.current });
      }
      animationRunningRef.current = false;
      return;
    }

    // ИСПРАВЛЕНИЕ: Если анимация уже запущена и работает, не перезапускаем её
    if (animationRunningRef.current && hasPucksRef.current) {
      return; // Анимация уже запущена и работает
    }
    
    // Если анимация была остановлена, но мы на главном экране и есть шайбы - перезапускаем
    if (!animationRunningRef.current && hasPucksRef.current && isOnHomeScreen && __DEV__) {
      console.log('🔄 Возобновляем анимацию шайб после возврата на главный экран:', {
        appIsActive,
        isOnHomeScreen,
        hasPucks: hasPucksRef.current,
        puckCount: physicsPositionsRef.current.length
      });
    }

    // Запускаем/возобновляем анимацию
    if (__DEV__) {
      console.log('▶️ Запускаем/возобновляем анимацию:', {
        wasRunning: animationRunningRef.current,
        appIsActive,
        isOnHomeScreen,
        hasPucks: hasPucksRef.current
      });
    }
    animationRunningRef.current = true;

    let animationFrameId: number | null = null;
    let frameCount = 0;

    const tick = (now: number) => {
      // Останавливаем анимацию если приложение ушло в фон или не на главном экране
      if (!appIsActiveRef.current || !isOnHomeScreenRef.current) {
        animationRunningRef.current = false;
        lastTimeRef.current = 0; // Сбрасываем для моментального продолжения
        return;
      }
      
      // Нет шайб — останавливаем цикл полностью (не крутим пустой rAF, экономим батарею).
      // Перезапуск произойдёт через эффект по флагу hasPucks, когда шайбы появятся.
      if (!hasPucksRef.current) {
        animationRunningRef.current = false;
        lastTimeRef.current = 0;
        return;
      }
      // Транзиентное рассогласование state/ref (редкость) — ждём кадр, не останавливаясь
      if (physicsPositionsRef.current.length === 0) {
        lastTimeRef.current = 0; // Сбрасываем время для плавного старта когда шайбы появятся
        animationFrameId = requestAnimationFrame(tick);
        return;
      }
      
      // ОПТИМИЗАЦИЯ: Проверяем режим покоя
      const timeSinceInteraction = now - lastInteractionTimeRef.current;
      if (timeSinceInteraction > IDLE_TIMEOUT_MS && !isIdleModeRef.current) {
        isIdleModeRef.current = true;
        // ОПТИМИЗАЦИЯ: Логируем только в dev режиме для снижения нагрузки
        if (__DEV__) {
        console.log('😴 [PERFORMANCE] Режим покоя активирован - снижаем FPS');
        }
      }
      
      // В режиме покоя пропускаем каждый N-й кадр для экономии батареи
      frameCounterRef.current++;
      if (isIdleModeRef.current && frameCounterRef.current % idleFrameSkip !== 0) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = now;
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const dtMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Ограничиваем максимальный шаг времени
      const MAX_DT_MS = 100;
      const clampedDtMs = Math.min(dtMs, MAX_DT_MS);

      accumulatorRef.current += clampedDtMs;

      // Выполняем шаги физики
      let steps = 0;
      while (accumulatorRef.current >= STEP_MS && steps < MAX_STEPS) {
        stepPhysics();
        accumulatorRef.current -= STEP_MS;
        steps++;
      }
      frameCount++;

      // ОПТИМИЗАЦИЯ: Упрощенная интерполяция - вычисляем alpha, но используем только при необходимости
      // Интерполяция нужна для плавности, но можно упростить вычисления
      const useInterpolation = Date.now() >= renderGraceUntilRef.current;
      const alpha = useInterpolation ? Math.min(accumulatorRef.current / STEP_MS, 1) : 1;
      alphaRef.current = alpha;

      const physics = physicsPositionsRef.current;
      physics.forEach(physicsPos => {
        const shared = sharedPositionsRef.current.get(physicsPos.id);
        if (shared && shared.x && shared.y) {
          // Скорость — для следа на льду (UI-поток читает её в worklet)
          if (shared.vx && shared.vy) {
            shared.vx.value = physicsPos.isDragging ? 0 : physicsPos.vx;
            shared.vy.value = physicsPos.isDragging ? 0 : physicsPos.vy;
          }
          if (!useInterpolation) {
            shared.x.value = physicsPos.x;
            shared.y.value = physicsPos.y;
            return;
          }
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
      
      if (useInterpolation) {
        // Обновляем render-позиции НА МЕСТЕ (без клонов и нового Map каждый кадр):
        // на слабых Android это убирает ~1500 аллокаций/сек и паузы GC.
        // Гарантируем, что в map лежит отдельный объект (не тот же, что в physics),
        // иначе интерполяция выродится (rp === physicsPos).
        const renderMap = renderPositionsMapRef.current;
        for (let i = 0; i < physics.length; i++) {
          const p = physics[i];
          const rp = renderMap.get(p.id);
          if (rp && rp !== p) {
            rp.x = p.x;
            rp.y = p.y;
            rp.vx = p.vx;
            rp.vy = p.vy;
            rp.isDragging = p.isDragging;
          } else {
            renderMap.set(p.id, { ...p });
          }
        }
      }
      
      // КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: НЕ обновляем React state из анимационного цикла!
      // Это вызывает ре-рендер всех компонентов Puck 16-27 раз в секунду
      // Shared values обновляются каждый кадр напрямую, поэтому визуально все плавно
      // React state обновляется только при изменении списка игроков (добавление/удаление)
      // setPuckPositions УДАЛЕН из анимационного цикла для предотвращения перегрева

      animationFrameId = requestAnimationFrame(tick);
    };

    lastTimeRef.current = 0;
    accumulatorRef.current = 0;
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationRunningRef.current = false;
      // НЕ сбрасываем lastTimeRef здесь, чтобы анимация продолжалась плавно
      // lastTimeRef.current = 0;
      // accumulatorRef.current = 0;
    };
  }, [stepPhysics, STEP_MS, MAX_STEPS, idleFrameSkip, appIsActive, isOnHomeScreen, performanceLevel, physicsActive, hasPucks]);

  // Вибрация при столкновениях (только один раз при начале столкновения)
  useEffect(() => {
    // Вибрация только для НОВЫХ столкновений (не для уже активных)
    // collisionDetectedRef устанавливается только для новых столкновений благодаря проверке activeCollisionsRef
    if (collisionDetectedRef.current && currentScreen === 'home' && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      const now = Date.now();
      const timeDiff = now - lastHapticTimeRef.current;
      // Вибрация только один раз при столкновении (минимум 1000мс между вибрациями)
      // Это гарантирует, что даже при "примагничивании" вибрация не будет повторяться
      if (timeDiff > 1000) {
        lastHapticTimeRef.current = now;
        if (Platform.OS === 'ios') {
          try {
            // Используем SelectionFeedbackStyle - самый легкий вариант вибрации
            Haptics.selectionAsync();
          } catch {
            try {
              Vibration.vibrate(15); // Уменьшено с 30 до 15 мс
            } catch {}
          }
        } else {
          try {
            Vibration.vibrate(15); // Уменьшено с 30 до 15 мс для более тихой вибрации
          } catch {}
        }
      }
      // Сбрасываем флаг сразу после проверки, чтобы не вибрировать повторно
      collisionDetectedRef.current = false;
    } else if (collisionDetectedRef.current) {
      collisionDetectedRef.current = false;
    }
    
    // Очищаем активные столкновения, которые больше не происходят
    // Проверяем все пары шайб и удаляем те, которые больше не сталкиваются
    // Используем БОЛЬШЕЕ расстояние для очистки (puckSize + 3px), чтобы избежать постоянной вибрации при "примагничивании"
    // Это означает, что шайбы должны разойтись на 3px больше, чем минимальное расстояние, чтобы столкновение считалось завершенным
    // ОПТИМИЗАЦИЯ: Проверяем коллизии реже - только каждые 3 кадра для снижения нагрузки
    // Это достаточно для отслеживания активных столкновений
    const currentPositions = physicsPositionsRef.current;
    const clearDistance = puckSize + 3; // Больше, чем для обнаружения столкновений (puckSize)
    const clearDistSq = clearDistance * clearDistance;
    // ОПТИМИЗАЦИЯ: Проверяем только близкие шайбы
    const checkRadiusSq = (puckSize * 2.5) * (puckSize * 2.5);
    const stillColliding = new Set<string>();
    
    // ОПТИМИЗАЦИЯ: Проверяем только каждые 3 кадра для снижения нагрузки
    // Используем frameCounterRef для отслеживания кадров
    if (frameCounterRef.current % 3 === 0) {
    for (let i = 0; i < currentPositions.length; i++) {
      for (let j = i + 1; j < currentPositions.length; j++) {
        const pos1 = currentPositions[i];
        const pos2 = currentPositions[j];
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distSq = dx * dx + dy * dy;
          
          // ОПТИМИЗАЦИЯ: Ранний выход - пропускаем далекие шайбы
          if (distSq > checkRadiusSq) continue;
        
        // Считаем столкновение активным только если шайбы действительно близко
        // Используем большее расстояние для очистки, чтобы избежать постоянной вибрации
        if (distSq < clearDistSq && distSq > 0) {
          const collisionKey = [pos1.id, pos2.id].sort().join('-');
          stillColliding.add(collisionKey);
        }
      }
      }
    } else {
      // В остальные кадры используем предыдущий набор активных столкновений
      // Это достаточно для отслеживания, так как столкновения не меняются мгновенно
      activeCollisionsRef.current.forEach(key => stillColliding.add(key));
    }
    
    // Удаляем столкновения, которые больше не происходят
    // Это позволяет вибрировать снова, если шайбы разошлись и снова столкнулись
    activeCollisionsRef.current.forEach(key => {
      if (!stillColliding.has(key)) {
        activeCollisionsRef.current.delete(key);
      }
    });
  }, [puckPositions, currentScreen, performanceLevel]);

  // Функция для обновления позиции при drag
  // ВАЖНО: работаем ТОЛЬКО с physicsPositionsRef, не трогаем React state,
  // чтобы не вызывать ре-рендеры и не "откатывать" шайбы к старым позициям
  const updatePuckPosition = useCallback(
    (id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => {
      const current = physicsPositionsRef.current;
      if (!current || current.length === 0) return;
        
        let finalX = Math.max(boundaries.left, Math.min(boundaries.right, x));
        let finalY = Math.max(boundaries.top, Math.min(boundaries.bottom, y));

        const minDistance = puckSize;
        const minDistSq = minDistance * minDistance;
        
      // Работает с текущими физическими позициями, а не со state
        const newPositions = current.map((pos) => ({ ...pos }));

        if (isDragging) {
          // Находим индекс перетаскиваемой шайбы
          const draggedIndex = newPositions.findIndex(p => p.id === id);
        if (draggedIndex === -1) return;
          
          // Обновляем позицию перетаскиваемой шайбы
          newPositions[draggedIndex] = {
            ...newPositions[draggedIndex],
            x: finalX,
            y: finalY,
            vx: vx ?? newPositions[draggedIndex].vx,
            vy: vy ?? newPositions[draggedIndex].vy,
            isDragging: true,
          };
            
          // Прямая формула для решения всех коллизий за один проход
          // Для каждой другой шайбы вычисляем коллизию с перетаскиваемой
          for (let i = 0; i < newPositions.length; i++) {
            if (i === draggedIndex) continue;
            
            const other = newPositions[i];
            const dx = finalX - other.x;
            const dy = finalY - other.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq && distSq > 0) {
              // Полная физика для всех устройств
              const dist = Math.sqrt(distSq);
              const angle = Math.atan2(dy, dx);
              const overlap = minDistance - dist;
          
              // Перетаскиваемая шайба остается на месте, другая отталкивается
              const pushStrength = 1.2 * ANDROID_PUCK_SOFT;
              const adjustedOverlap = overlap * pushStrength;
              const pushX = -Math.cos(angle) * adjustedOverlap;
              const pushY = -Math.sin(angle) * adjustedOverlap;
            
              // Применяем отталкивание к другой шайбе
              let newOtherX = other.x + pushX;
              let newOtherY = other.y + pushY;
              
              // Проверяем границы для отталкиваемой шайбы
              newOtherX = Math.max(boundaries.left, Math.min(boundaries.right, newOtherX));
              newOtherY = Math.max(boundaries.top, Math.min(boundaries.bottom, newOtherY));
              
              newPositions[i] = {
                ...other,
                x: newOtherX,
                y: newOtherY,
              };

              // Отслеживаем столкновения для вибрации
              if (currentUserId && (id === currentUserId || other.id === currentUserId)) {
                const collisionKey = [id, other.id].sort().join('-');
                if (!activeCollisionsRef.current.has(collisionKey)) {
                  activeCollisionsRef.current.add(collisionKey);
                  collisionDetectedRef.current = true;
                }
              }
            }
          }

          // Дополнительная проверка: если перетаскиваемая шайба все еще пересекается,
          // немного отодвигаем её назад
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
                
              // Немного отодвигаем перетаскиваемую шайбу назад
              finalX -= Math.cos(angle) * overlap * 0.3 * ANDROID_PUCK_SOFT;
              finalY -= Math.sin(angle) * overlap * 0.3 * ANDROID_PUCK_SOFT;
                
              // Дополнительно отталкиваем другую шайбу
              const additionalPush = overlap * 0.2 * ANDROID_PUCK_SOFT;
              const newOtherX = other.x - Math.cos(angle) * additionalPush;
              const newOtherY = other.y - Math.sin(angle) * additionalPush;
                
                newPositions[i] = {
                ...other,
                x: Math.max(boundaries.left, Math.min(boundaries.right, newOtherX)),
                y: Math.max(boundaries.top, Math.min(boundaries.bottom, newOtherY)),
              };
            }
          }

          // Обновляем финальную позицию перетаскиваемой шайбы
          finalX = Math.max(boundaries.left, Math.min(boundaries.right, finalX));
          finalY = Math.max(boundaries.top, Math.min(boundaries.bottom, finalY));
          newPositions[draggedIndex] = {
            ...newPositions[draggedIndex],
            x: finalX,
            y: finalY,
          };
        } else {
        // Если не перетаскиваем, просто обновляем позицию (например, толчок после отпускания)
          const index = newPositions.findIndex(p => p.id === id);
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

      // Обновляем референсы для физики и интерполяции
        physicsPositionsRef.current = newPositions;
        renderPositionsRef.current = newPositions;

      const newMap = new Map<string, PuckPosition>();
      newPositions.forEach(pos => {
        newMap.set(pos.id, pos);
      });
      renderPositionsMapRef.current = newMap;
    },
    [boundaries, currentUserId, puckSize]
  );

  // Функция для "перезапуска" движения всех шайб (например, после возврата с экрана профиля)
  const resetPucksMotion = useCallback(() => {
    const current = physicsPositionsRef.current;
    if (!current || current.length === 0) return;

    const baseSpeedMultiplier = 0.49 * ANDROID_PUCK_SOFT;

    const newPositions = current.map(pos => {
      // Если шайба сейчас "залипла", даём ей небольшую случайную скорость
      const randomVx = (Math.random() - 0.5) * baseSpeedMultiplier;
      const randomVy = (Math.random() - 0.5) * baseSpeedMultiplier;
      return {
        ...pos,
        vx: randomVx,
        vy: randomVy,
        isDragging: false,
      };
    });

    physicsPositionsRef.current = newPositions;
    renderPositionsRef.current = newPositions;

    const newMap = new Map<string, PuckPosition>();
    newPositions.forEach(pos => {
      newMap.set(pos.id, pos);
    });
    renderPositionsMapRef.current = newMap;
  }, []);

  // Функция для получения shared values (для использования в компонентах)
  const getSharedPosition = useCallback((id: string) => {
    return sharedPositionsRef.current.get(id);
  }, []);

  // Функция для регистрации shared values из компонентов
  const registerSharedPosition = useCallback((id: string, x: { value: number }, y: { value: number }, vx?: { value: number }, vy?: { value: number }) => {
    sharedPositionsRef.current.set(id, { x, y, vx, vy });
  }, []);

  return {
    puckPositions,
    updatePuckPosition,
    boundaries,
    isInitialized: puckPositions.length > 0,
    getSharedPosition, // Экспортируем функцию для получения shared values
    registerSharedPosition, // Экспортируем функцию для регистрации shared values
    resetPucksMotion, // Перезапуск движения всех шайб
  };
};

interface TestPuck {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  player: Player;
}

// Типы для совместимости
interface PuckPosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isDragging: boolean;
}

// Импортируем оригинальный PuckAnimator из основного экрана
// Для этого нужно создать временную копию компонента
// Мемоизированный компонент шайбы для оптимизации производительности
const OriginalPuckAnimator = React.memo(({
  player,
  position,
  leaderRank,
  onNav,
  onDrag,
  enableDrag = true,
  getAndroidPerformanceLevel,
  registerSharedPosition
}: {
  player: Player; 
  position: PuckPosition; 
  leaderRank?: LeaderRank;
  onNav: () => void; 
  onDrag?: (id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => void;
  enableDrag?: boolean;
  getAndroidPerformanceLevel?: () => 'high' | 'medium' | 'low';
  registerSharedPosition?: (id: string, x: { value: number }, y: { value: number }, vx?: { value: number }, vy?: { value: number }) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const lowEndTrail = Platform.OS === 'android' && (getAndroidPerformanceLevel?.() || 'medium') === 'low';
  const dragStartRef = useRef({ x: 0, y: 0, pageX: 0, pageY: 0, time: 0, startX: 0, startY: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const dragVelocityRef = useRef({ vx: 0, vy: 0 });
  const lastDragVelocityRef = useRef({ vx: 0, vy: 0 }); // Последняя скорость движения при drag
  const dragHistoryRef = useRef<{x: number, y: number, time: number}[]>([]);
  
  // Используем useSharedValue для максимальной плавности на 120 Гц
  const animatedX = useSharedValue(position.x);
  const animatedY = useSharedValue(position.y);
  const velX = useSharedValue(0);
  const velY = useSharedValue(0);
  
  // Регистрируем shared values в системе коллизий для прямого обновления
  useEffect(() => {
    if (registerSharedPosition) {
      registerSharedPosition(position.id, animatedX, animatedY, velX, velY);
    }
  }, [position.id, animatedX, animatedY, velX, velY, registerSharedPosition]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: animatedX.value,
    top: animatedY.value,
  }), []);

  // След на льду: снежная стружка за шайбой. Длина и яркость — от скорости,
  // направление — против вектора движения. Всё на UI-потоке, без setState.
  const trailLen = position.size * 2.2;
  const trailStyle = useAnimatedStyle(() => {
    const vx = velX.value;
    const vy = velY.value;
    const speed = Math.sqrt(vx * vx + vy * vy);
    const t = Math.min(1, Math.max(0, (speed - 0.25) / 3.2));
    const scale = 0.25 + 0.75 * t;
    return {
      opacity: t * 0.7,
      transform: [
        { rotate: `${Math.atan2(vy, vx)}rad` },
        { translateX: -(trailLen * scale) / 2 - position.size * 0.15 },
        { scaleX: scale },
      ],
    };
  }, [trailLen, position.size]);

  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent;
    // Сохраняем начальную позицию шайбы и смещение касания
    dragStartRef.current = {
      x: touch.locationX, // Смещение от левого края компонента в момент начала drag
      y: touch.locationY, // Смещение от верхнего края компонента в момент начала drag
      pageX: touch.pageX,
      pageY: touch.pageY,
      time: Date.now(),
      // ВАЖНО: используем ТЕКУЩИЕ координаты из shared values, а не initial position
      // Это предотвращает "прыжки" других шайб при начале drag
      startX: animatedX.value, // Текущая позиция шайбы
      startY: animatedY.value,
    };
    lastPositionRef.current = { x: animatedX.value, y: animatedY.value };
    hasDraggedRef.current = false;
    setHasDragged(false);
    dragVelocityRef.current = { vx: 0, vy: 0 };
    dragHistoryRef.current = [];
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: НЕ синхронизируем с position.x/y - они устаревшие!
    // position из props содержит устаревшие координаты (обновляется только при изменении списка игроков)
    // animatedX/animatedY уже содержат РЕАЛЬНЫЕ текущие координаты из физики
    // Синхронизация с устаревшими position.x/y вызывала "мелькание" шайбы в пустом месте
    
    setIsDragging(true);
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сразу обновляем физику с текущей позицией
    // Это предотвращает "мелькание" шайбы в пустом месте при касании
    // Физика должна знать, что шайба теперь перетаскивается с ТЕКУЩЕЙ позиции
    if (onDrag) {
      onDrag(position.id, animatedX.value, animatedY.value, 0, 0, true);
    }
    
    // ОПТИМИЗАЦИЯ: Обновляем время взаимодействия для выхода из режима покоя
    if (typeof (window as any).__updatePuckInteraction === 'function') {
      (window as any).__updatePuckInteraction();
    }
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging || !onDrag) return;
    
    const touch = e.nativeEvent;
    const now = Date.now();
    
    // Убираем throttle для максимальной плавности на 120 Гц
    // Обновления будут ограничены только частотой событий touch
    
    // Проверяем, что палец сдвинулся достаточно для drag (минимум 5 пикселей)
    const dx = touch.pageX - dragStartRef.current.pageX;
    const dy = touch.pageY - dragStartRef.current.pageY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (!hasDraggedRef.current && distance < 5) {
      return; // Слишком маленькое движение - это tap, а не drag
    }
    
    hasDraggedRef.current = true;
    setHasDragged(true);

    // Вычисляем новую позицию: используем pageX/pageY для абсолютных координат
    // Разница между текущим и начальным pageX/pageY дает смещение в пикселях экрана
    const deltaX = touch.pageX - dragStartRef.current.pageX;
    const deltaY = touch.pageY - dragStartRef.current.pageY;
    // Используем начальную позицию + смещение для плавного движения (без дергания)
    const newX = dragStartRef.current.startX + deltaX;
    const newY = dragStartRef.current.startY + deltaY;

    // Шайба следует за пальцем напрямую, но с ограничением скорости для натурального движения
    // Вычисляем скорость на основе изменения позиции (для толчка других шайб)
    // Используем lastPositionRef для расчета скорости, чтобы избежать дергания
    // Увеличиваем коэффициент для лучшего отслеживания быстрого движения
    const dt = Math.max(1, now - lastUpdateTimeRef.current); // время в миллисекундах
    let vx = ((newX - lastPositionRef.current.x) / dt) * 60; // пиксели в секунду (60 FPS)
    let vy = ((newY - lastPositionRef.current.y) / dt) * 60; // пиксели в секунду (60 FPS)

    // Ограничиваем максимальную скорость для натурального движения
    const maxSpeed = 20.0; // Максимальная скорость при drag (увеличена для более быстрого движения)
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > maxSpeed) {
      vx = (vx / speed) * maxSpeed;
      vy = (vy / speed) * maxSpeed;
    }

    dragVelocityRef.current.vx += vx;
    dragVelocityRef.current.vy += vy;
    
    // Сохраняем последнюю скорость движения для использования при отпускании
    lastDragVelocityRef.current = { vx, vy };
    lastUpdateTimeRef.current = now;
    
    dragHistoryRef.current.push({ x: newX, y: newY, time: now });
    if (dragHistoryRef.current.length > 10) {
      dragHistoryRef.current.shift();
    }
    
    lastPositionRef.current = { x: newX, y: newY };
    
    // Обновляем shared values напрямую для максимальной плавности на 120 Гц
    animatedX.value = newX;
    animatedY.value = newY;
    
    // Обновляем state для физики (с небольшой задержкой для оптимизации)
    onDrag(position.id, newX, newY, vx, vy, true);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (onDrag && hasDraggedRef.current) {
      // Это был drag - применяем скорость движения, с которой двигали шайбу
      // Вычисляем реальную скорость на основе последних позиций из истории
      let finalVx = 0;
      let finalVy = 0;
      
      if (dragHistoryRef.current.length >= 2) {
        // Используем последние позиции для более точного расчета скорости
        const history = dragHistoryRef.current;
        const last = history[history.length - 1];
        const secondLast = history[history.length - 2];
        
        // Используем последние 2-3 позиции для более точного расчета скорости быстрого движения
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
        
        // Вычисляем скорость в пикселях на миллисекунду
        const pixelsPerMsX = totalDx / totalTime;
        const pixelsPerMsY = totalDy / totalTime;
        
        // Вычисляем реальную скорость движения пальца (пиксели в секунду)
        const fingerSpeedPxPerSec = Math.sqrt(pixelsPerMsX * pixelsPerMsX + pixelsPerMsY * pixelsPerMsY) * 1000;
        
        // Применяем множитель, который зависит от скорости движения
        // Для медленных движений - меньший множитель, для быстрых - больший
        let speedMultiplier = 0.5; // Базовый множитель для медленных движений (уменьшен в 2 раза: было 1.0)
        if (fingerSpeedPxPerSec > 500) {
          // Для быстрых движений увеличиваем множитель пропорционально скорости
          speedMultiplier = 0.5 + (fingerSpeedPxPerSec - 500) / 1000; // От 0.5 до ~1.0+ для очень быстрых движений (уменьшено в 2 раза: было 1.0 + .../500)
        }
        
        // Конвертируем в единицы физики (делим на 60 для конвертации)
        finalVx = pixelsPerMsX * 1000 * speedMultiplier / 60;
        finalVy = pixelsPerMsY * 1000 * speedMultiplier / 60;
      } else {
        // Если истории недостаточно, используем последнюю сохраненную скорость
        // Скорость уже в пикселях в секунду
        const fingerSpeedPxPerSec = Math.sqrt(
          lastDragVelocityRef.current.vx * lastDragVelocityRef.current.vx + 
          lastDragVelocityRef.current.vy * lastDragVelocityRef.current.vy
        );
        
        let speedMultiplier = 0.5; // Базовый множитель (уменьшен в 2 раза: было 1.0)
        if (fingerSpeedPxPerSec > 500) {
          speedMultiplier = 0.5 + (fingerSpeedPxPerSec - 500) / 1000; // От 0.5 до ~1.0+ (уменьшено в 2 раза: было 1.0 + .../500)
        }
        
        finalVx = lastDragVelocityRef.current.vx * speedMultiplier / 60;
        finalVy = lastDragVelocityRef.current.vy * speedMultiplier / 60;
      }

      // Ограничиваем максимальную скорость при толчке - используем адаптивный лимит
      // Используем те же значения, что и в физике, для консистентности
      const performanceLevel = getAndroidPerformanceLevel?.() || 'medium';
      const maxReleaseSpeed = (() => {
        switch (performanceLevel) {
          case 'high':
            return 6.0; // Соответствует maxSpeed для iOS
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

      // Если скорость слишком мала, устанавливаем минимальную скорость
      const minSpeed = 0.2;
      if (releaseSpeed < minSpeed && releaseSpeed > 0) {
        const angle = Math.atan2(finalVy, finalVx);
        finalVx = Math.cos(angle) * minSpeed;
        finalVy = Math.sin(angle) * minSpeed;
      }

      // Используем ТЕКУЩУЮ позицию из shared values, чтобы не было "прыжков"
      const currentX = animatedX.value;
      const currentY = animatedY.value;
      onDrag(position.id, currentX, currentY, finalVx, finalVy, false);
    }
    
    // Сбрасываем накопленную скорость
    dragVelocityRef.current = { vx: 0, vy: 0 };
    lastDragVelocityRef.current = { vx: 0, vy: 0 };

    // Сбрасываем флаг drag с задержкой, чтобы onPress мог проверить
    setTimeout(() => {
      hasDraggedRef.current = false;
      setHasDragged(false);
    }, 100);
  };

  return (
    <Animated.View 
      style={[styles.puckContainer, animatedStyle]}
      onTouchStart={enableDrag ? handleTouchStart : undefined}
      onTouchMove={enableDrag ? handleTouchMove : undefined}
      onTouchEnd={enableDrag ? handleTouchEnd : undefined}
    >
      {!lowEndTrail && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.iceTrail,
            {
              width: trailLen,
              height: position.size * 0.62,
              borderRadius: position.size * 0.31,
              left: position.size / 2 - trailLen / 2,
              top: position.size / 2 - position.size * 0.31,
            },
            trailStyle,
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.85)']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <Puck
          avatar={player.avatar}
          playerId={player.id}
          denseScene
          onPress={() => {
            if (!hasDragged) {
              onNav();
            }
          }}
          size={position.size}
          points={(() => {
            const total = getPlayerSeasonPoints(player);
            return total > 0 ? String(total) : undefined;
          })()}
        isStar={player.status === 'star'}
        status={player.status}
          leaderRank={leaderRank}
          isOnline={player.isOnline}
          isNew={player.createdAt ? (Date.now() - new Date(player.createdAt).getTime()) < 2 * 24 * 60 * 60 * 1000 : false}
        />
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  const prevPts = getPlayerSeasonPoints(prevProps.player);
  const nextPts = getPlayerSeasonPoints(nextProps.player);
  return (
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.avatar === nextProps.player.avatar &&
    prevProps.player.status === nextProps.player.status &&
    prevProps.player.isOnline === nextProps.player.isOnline &&
    prevProps.player.createdAt === nextProps.player.createdAt &&
    prevProps.leaderRank === nextProps.leaderRank &&
    prevProps.position.size === nextProps.position.size &&
    prevProps.position.isDragging === nextProps.position.isDragging &&
    prevPts === nextPts
  );
});
OriginalPuckAnimator.displayName = 'OriginalPuckAnimator';

export default function HomeScreen() {
  const { currentUser, isUserLoading } = useUser();
  const router = useRouter();
  const { language } = useLanguage();
  const { setCurrentScreen, currentScreen } = useScreenContext();
  const params = useLocalSearchParams();
  const isFocused = useIsFocused();
  const performanceLevel = useMemo(() => getPerformanceLevel(), []);
  const isDesktopLayout = useIsDesktopLayout();
  // Desktop: physics on (pucks move), drag off (no grab with mouse)
  const [physicsActive, setPhysicsActive] = useState(!isLowEndAndroid());
  const [filtersReady, setFiltersReady] = useState(!currentUser);

  useEffect(() => {
    if (!currentUser) {
      setFiltersReady(true);
      return;
    }
    setFiltersReady(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLowEndAndroid() || physicsActive) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handle = InteractionManager.runAfterInteractions(() => {
      timeout = setTimeout(() => {
        if (!cancelled) setPhysicsActive(true);
      }, startupPhysicsDeferMs());
    });
    return () => {
      cancelled = true;
      handle.cancel?.();
      if (timeout) clearTimeout(timeout);
    };
  }, [physicsActive]);
  
  // Ref для currentScreen, чтобы использовать в акселерометре
  const currentScreenRef = useRef(currentScreen);
  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  // Мини-игра
  const [showGame, setShowGame] = useState(false);
  const [gameOpenToResults, setGameOpenToResults] = useState(false);
  const [showQuizGame, setShowQuizGame] = useState(false);
  const [quizOpenToResults, setQuizOpenToResults] = useState(false);

  // Размеры области льда для разметки
  const [iceSize, setIceSize] = useState({ width: 0, height: 0 });
  /** После onLayout один кадр геометрия ещё «плавает» — ждём 2× rAF, чтобы сменить границы шайб один раз */
  const [collisionLayoutReady, setCollisionLayoutReady] = useState(false);

  useEffect(() => {
    try {
      const resolved = RNImage.resolveAssetSource(PUCK_SCOUT_LOGO);
      if (resolved?.uri) {
        ExpoImage.prefetch(resolved.uri).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (iceSize.width <= 0 || iceSize.height <= 0) {
      setCollisionLayoutReady(false);
      return;
    }
    let raf = 0;
    raf = requestAnimationFrame(() => setCollisionLayoutReady(true));
    return () => cancelAnimationFrame(raf);
  }, [iceSize.width, iceSize.height]);

  const openGameResultsParam =
    params.openGameResults === 'true' ||
    (Array.isArray(params.openGameResults) && params.openGameResults[0] === 'true');

  useEffect(() => {
    if (!openGameResultsParam) return;
    setShowGame(true);
    setGameOpenToResults(true);
    requestAnimationFrame(() => {
      router.setParams({ openGameResults: undefined } as Record<string, undefined>);
    });
  }, [openGameResultsParam, router]);

  const openQuizResultsParam =
    params.openQuizResults === 'true' ||
    (Array.isArray(params.openQuizResults) && params.openQuizResults[0] === 'true');

  useEffect(() => {
    if (!openQuizResultsParam) return;
    setShowQuizGame(true);
    setQuizOpenToResults(true);
    requestAnimationFrame(() => {
      router.setParams({ openQuizResults: undefined } as Record<string, undefined>);
    });
  }, [openQuizResultsParam, router]);

  // Загружаем всех игроков из базы данных
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const lastBlockedUsersLoadRef = useRef(0);
  const filtersInitializedRef = useRef(false); // Флаг, что фильтры были инициализированы
  const previousVisiblePlayersRef = useRef<Set<string>>(new Set()); // Сохраняем ID видимых игроков для сравнения
  const filterInitTimeRef = useRef<number>(0); // Время инициализации фильтров для защиты от пересчета
  const lastUserCountryRef = useRef<string | null>(null); // Отслеживаем изменения страны пользователя
  const lastUserIdRef = useRef<string | null>(null); // Отслеживаем смену пользователя (например, admin login-as-user)
  // Рефы для чтения актуального currentUser внутри loadAllPlayers без добавления в deps
  const currentUserRef = useRef(currentUser);
  const isUserLoadingRef = useRef(isUserLoading);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { isUserLoadingRef.current = isUserLoading; }, [isUserLoading]);

  // Фильтры
  const { selectedCountry, setSelectedCountry, showCountryFilter, setShowCountryFilter } = useCountryFilter();
  const { selectedYear, setSelectedYear, showYearFilter, setShowYearFilter } = useYearFilter();

  // Вычисляем начальные значения фильтров СИНХРОННО при первом рендере
  // Это гарантирует, что фильтры будут установлены до вычисления allVisiblePlayers
  const initialFilters = useMemo(() => {
    // Ждем загрузки пользователя перед инициализацией фильтров
    if (isUserLoading || players.length === 0) {
      return { country: null, year: null };
    }

    // Для неавторизованных пользователей показываем "Все"
    if (!currentUser) {
      return { country: null, year: null };
    }

    // Для авторизованных пользователей вычисляем фильтры синхронно
    const defaultCountry = currentUser?.country;
    
    if (!defaultCountry) {
      return { country: null, year: null };
    }
      
      // Проверяем, есть ли игроки в стране пользователя
    // ВАЖНО: учитываем всех пользователей со статусом 'player', 'star', 'coach', 'scout'
    // чтобы фильтр работал правильно для всех типов пользователей
        const playersInCountry = players.filter(player =>
          player.country === defaultCountry &&
          player.birthDate &&
      (player.status === 'player' || player.status === 'star' || player.status === 'coach' || player.status === 'scout')
    );

    // Если нет игроков в стране пользователя, показываем "Все"
    if (playersInCountry.length === 0) {
      return { country: null, year: null };
    }

    // Устанавливаем фильтр по году рождения текущего пользователя
    let defaultYear: number | null = null;

    // Для тренеров и звёзд НЕ устанавливаем фильтр по году рождения
    // Они должны видеть всех игроков в своей стране ("Все года")
    if (currentUser?.status === 'coach' || currentUser?.status === 'star') {
      defaultYear = null;
        } else if (currentUser?.birthDate) {
          // Для обычных игроков используем год рождения текущего пользователя
          defaultYear = parseInt(currentUser.birthDate.split('-')[0]);
          
          // Проверяем, есть ли игроки в этом году в стране пользователя
          const playersInYear = playersInCountry.filter(player => {
            const year = player.birthDate!.split('-')[0];
            return parseInt(year) === defaultYear;
          });

          // Если нет игроков в этом году, показываем "Все" для года
          if (playersInYear.length === 0) {
            defaultYear = null;
          }
        } else {
          // Если у пользователя нет года рождения (например, админ),
          // устанавливаем фильтр "все года" (null) - показываем всех игроков в стране пользователя
          defaultYear = null;
        }

    return { country: defaultCountry, year: defaultYear };
  }, [players.length, currentUser?.id, currentUser?.country, currentUser?.birthDate, currentUser?.status, isUserLoading]);

  // Состояние для управления годами рождения
  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  const birthYears = useMemo(() => {
    const years: number[] = [];
    for (let year = 2025; year >= 2008; year--) {
      years.push(year);
    }
    return years;
  }, []);

  const getCurrentHourSeed = () => Math.floor(Date.now() / (60 * 60 * 1000));
  const [randomSeed, setRandomSeed] = useState(() => getCurrentHourSeed());
  const seedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unblockLoadRef = useRef(false);
  const homePuckRecoveryAttemptedRef = useRef(false);
  /** ID шайб на льду после первого расчёта — не пересобираем при догрузке activityRating (~1 с). */
  const homePuckSelectionIdsRef = useRef<string[] | null>(null);
  const homePuckSelectionKeyRef = useRef<string | null>(null);

  // Вспомогательная функция: вычисляет начальные фильтры по загруженным игрокам и пользователю.
  // Дублирует логику initialFilters useMemo, но работает синхронно внутри loadAllPlayers,
  // чтобы мы могли выставить setPlayers + setSelectedCountry + setSelectedYear В ОДНОМ рендере
  // и избежать двойного торможения шайб при старте.
  const computeFiltersForPlayers = useCallback((loadedPlayers: Player[], user: Player | null): { country: string | null; year: number | null } => {
    if (!user?.country || loadedPlayers.length === 0) return { country: null, year: null };
    const defaultCountry = user.country;
    const playersInCountry = loadedPlayers.filter(p =>
      p.country === defaultCountry && p.birthDate &&
      (p.status === 'player' || p.status === 'star' || p.status === 'coach' || p.status === 'scout')
    );
    if (playersInCountry.length === 0) return { country: null, year: null };
    let defaultYear: number | null = null;
    if (user.status !== 'coach' && user.status !== 'star' && user.birthDate) {
      const year = parseInt(user.birthDate.split('-')[0]);
      const inYear = playersInCountry.filter(p => p.birthDate?.startsWith(year.toString()));
      defaultYear = inYear.length > 0 ? year : null;
    }
    return { country: defaultCountry, year: defaultYear };
  }, []);

  // Загрузка игроков (с поддержкой принудительного обновления)
  // ВАЖНО: определяется ДО useEffect, которые его используют
  const loadAllPlayers = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log(`🔄 Начинаем загрузку игроков${forceRefresh ? ' (принудительно)' : ''}`);

      const applyLoadedPlayers = (loadedPlayers: Player[]) => {
        if (!Array.isArray(loadedPlayers) || loadedPlayers.length === 0) {
          console.warn('⚠️ Пустой ответ loadPlayers — оставляем текущий список');
          return;
        }
        const user = currentUserRef.current;
        const userStillLoading = isUserLoadingRef.current;

        if (!filtersInitializedRef.current && !userStillLoading) {
          const { country, year } = computeFiltersForPlayers(loadedPlayers, user);
          setPlayers(loadedPlayers);
          setSelectedCountry(country);
          setSelectedYear(year);
          filtersInitializedRef.current = true;
          setFiltersReady(true);
          console.log(`✅ Игроки (${loadedPlayers.length}) + фильтры за один рендер:`, country, year);
        } else {
          setPlayers((prev) => {
            if (prev.length === 0 || !filtersInitializedRef.current) {
              return loadedPlayers;
            }
            const byId = new Map(loadedPlayers.map((p) => [p.id, p]));
            let changed = false;
            const next = prev.map((p) => {
              const fresh = byId.get(p.id);
              if (!fresh) return p;
              if (
                fresh.activityRating === p.activityRating &&
                fresh.teams === p.teams
              ) {
                return p;
              }
              changed = true;
              return {
                ...p,
                activityRating: fresh.activityRating,
                teams: fresh.teams ?? p.teams,
              };
            });
            return changed ? next : prev;
          });
          console.log(`✅ Игроки: meta-обновление без замены списка (${loadedPlayers.length})`);
        }
      };

      const loadedPlayers = await loadPlayers(forceRefresh, {
        onUpdated: applyLoadedPlayers,
      });
      applyLoadedPlayers(loadedPlayers);
    } catch (error) {
      console.error('❌ Ошибка загрузки игроков:', error);
    } finally {
      setLoading(false);
    }
  }, [computeFiltersForPlayers, setSelectedCountry, setSelectedYear]);

  // Отслеживаем изменения страны пользователя и переинициализируем фильтры
  // ВАЖНО: НЕ вызываем loadAllPlayers(true), так как это unmounts другие экраны (профиль)
  useEffect(() => {
    const userId = currentUser?.id || null;
    const userCountry = currentUser?.country || null;

    // Если пользователь сменился (включая вход администратора в чужой аккаунт) —
    // сбрасываем фильтры, чтобы они переинициализировались под нового пользователя.
    if (userId && lastUserIdRef.current && lastUserIdRef.current !== userId) {
      console.log('👤 [FILTERS] Смена пользователя (admin login-as-user): сбрасываем фильтры, чтобы не пропадали шайбы');
      // Сбрасываем флаг инициализации и фильтры в null — useLayoutEffect ниже переинициализирует их
      filtersInitializedRef.current = false;
      filterInitTimeRef.current = 0;
      setFiltersReady(false);
      setSelectedCountry(null);
      setSelectedYear(null);
    } else if (userId && userCountry && lastUserCountryRef.current && userCountry !== lastUserCountryRef.current) {
      // Страна пользователя изменилась в базе данных (для того же userId)
      console.log('🌍 [FILTERS] Страна пользователя изменилась в базе данных:', {
        oldCountry: lastUserCountryRef.current,
        newCountry: userCountry
      });
      // Переинициализируем фильтры (через сброс в null)
      filtersInitializedRef.current = false;
      filterInitTimeRef.current = 0;
      setFiltersReady(false);
      setSelectedCountry(null);
      setSelectedYear(null);
    }

    lastUserIdRef.current = userId;
    lastUserCountryRef.current = userCountry;
  }, [currentUser?.id, currentUser?.country, setSelectedCountry, setSelectedYear]);

  // ОПТИМИЗАЦИЯ: Используем useLayoutEffect для синхронной установки перед отрисовкой
  // Это позволяет показать шайбы быстрее при первой загрузке
  useLayoutEffect(() => {
    // Ждем завершения загрузки пользователя перед инициализацией фильтров
    if (isUserLoading) {
      return;
    }

    // ИСПРАВЛЕНИЕ: Если пользователь изменился, сбрасываем флаг инициализации,
    // чтобы фильтры переинициализировались с новыми значениями из initialFilters
    if (currentUser?.id && lastUserIdRef.current && lastUserIdRef.current !== currentUser.id) {
      console.log('🔄 [FILTERS] Пользователь изменился в useLayoutEffect, сбрасываем флаг инициализации');
      filtersInitializedRef.current = false;
    }

    // Если пользователь загрузился, но фильтры еще не инициализированы, сбрасываем флаг
    // Это позволяет переинициализировать фильтры, если они были установлены как null до загрузки пользователя
    if (currentUser && filtersInitializedRef.current && selectedCountry === null && selectedYear === null && initialFilters.country !== null) {
      filtersInitializedRef.current = false;
    }

    // ОПТИМИЗАЦИЯ: Инициализируем фильтры быстрее - не ждём полной загрузки всех игроков
    // Достаточно проверить, что initialFilters готовы (вычислены в useMemo)
    const shouldInitialize = !filtersInitializedRef.current &&
      (selectedCountry === null && selectedYear === null) &&
      (players.length > 0 || !currentUser); // Для неавторизованных не ждём игроков
    
    if (shouldInitialize) {
      // ИСПРАВЛЕНИЕ: Проверяем, что initialFilters соответствует текущему пользователю
      // Если страна в initialFilters не совпадает со страной пользователя, значит initialFilters еще не обновился
      if (currentUser && initialFilters.country && initialFilters.country !== currentUser.country) {
        console.log(`⚠️ [FILTERS] initialFilters не соответствует текущему пользователю, ждем обновления:`, {
          initialFiltersCountry: initialFilters.country,
          userCountry: currentUser.country
        });
        return; // Ждем следующего рендера, когда initialFilters обновится
      }
      
      console.log(`🔄 [FILTERS] Инициализируем фильтры для пользователя ${currentUser?.id}:`, {
        country: initialFilters.country,
        year: initialFilters.year,
        userCountry: currentUser?.country
      });
      setSelectedCountry(initialFilters.country);
      setSelectedYear(initialFilters.year);
      filtersInitializedRef.current = true;
      setFiltersReady(true);
      console.log(`✅ [FILTERS] Инициализированы: ${initialFilters.country || 'Все'} / ${initialFilters.year || 'Все года'}`);
    } else if (!currentUser && players.length > 0 && !filtersReady) {
      setFiltersReady(true);
    }
  }, [players.length, currentUser?.id, currentUser?.country, isUserLoading, setSelectedCountry, setSelectedYear, initialFilters, filtersReady]);

  // Загружаем игроков при монтировании
  useEffect(() => {
    if (isLowEndAndroid()) {
      const handle = InteractionManager.runAfterInteractions(() => {
        void loadAllPlayers();
      });
      return () => handle.cancel?.();
    }
    void loadAllPlayers();
  }, [loadAllPlayers]);

  // Обрабатываем параметр refresh для принудительного обновления списка игроков
  // ВАЖНО: Вызываем только если экран в фокусе, чтобы не unmount другие экраны
  useEffect(() => {
    if (params.refresh && currentScreen === 'home') {
      console.log('🔄 Принудительное обновление списка игроков после регистрации');
      // Сбрасываем фильтры для переинициализации под нового пользователя
      filtersInitializedRef.current = false;
      filterInitTimeRef.current = 0;
      loadAllPlayers(true); // Принудительное обновление
    }
  }, [params.refresh, loadAllPlayers, currentScreen]);

  // Перезагружаем игроков при смене пользователя (например, после создания нового)
  // Это важно, чтобы фильтры работали правильно для нового пользователя
  const lastUserIdForReloadRef = useRef<string | null>(null);
  useEffect(() => {
    const currentUserId = currentUser?.id || null;
    // Если пользователь изменился (не просто загрузился впервые)
    if (currentUserId && lastUserIdForReloadRef.current && lastUserIdForReloadRef.current !== currentUserId) {
      console.log('🔄 Пользователь изменился, перезагружаем игроков для обновления фильтров');
      // Сбрасываем фильтры для переинициализации под нового пользователя
      filtersInitializedRef.current = false;
      filterInitTimeRef.current = 0;
      loadAllPlayers(true); // Принудительное обновление
    }
    lastUserIdForReloadRef.current = currentUserId;
  }, [currentUser?.id, loadAllPlayers]);

  const loadBlockedUsers = useCallback(async (force = false) => {
    const userId = currentUser?.id;
    if (!userId) {
      lastBlockedUsersLoadRef.current = 0;
      return;
    }

    const now = Date.now();
    if (!force) {
      const elapsed = now - lastBlockedUsersLoadRef.current;
      const cooldown = 3000; // 3 секунды защищают от двойной загрузки
      if (elapsed < cooldown) {
        return;
      }
    }
    lastBlockedUsersLoadRef.current = now;

        try {
      const blocked = await getBlockedUsers(userId);
      setBlockedUsers(prev => {
        const prevSet = new Set(prev);
        const nextSet = new Set(blocked);
        if (prevSet.size === nextSet.size && Array.from(prevSet).every(id => nextSet.has(id))) {
          return prev;
        }
        return blocked;
      });
        } catch (error) {
          console.error('❌ Ошибка загрузки заблокированных пользователей:', error);
        }
  }, [currentUser?.id]);

  const hasLoadedBlockedInitiallyRef = useRef(false);
  const resumeAnimationRef = useRef<number | null>(null);
  const lastHomeShuffleTimeRef = useRef(0);

  const shuffleHomePucks = useCallback(() => {
    if (currentScreenRef.current !== 'home') return;

    const now = Date.now();
    if (now - lastHomeShuffleTimeRef.current < 2000) return;
    lastHomeShuffleTimeRef.current = now;

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 80);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 160);
    } else if (Platform.OS === 'android') {
      Vibration.vibrate([0, 100, 50, 100, 50, 100]);
    }

    setRandomSeed(now);

    setTimeout(() => {
      if (typeof (window as any).__triggerPuckExplosion === 'function') {
        (window as any).__triggerPuckExplosion();
      }
    }, 150);

    if (typeof (window as any).__updatePuckInteraction === 'function') {
      (window as any).__updatePuckInteraction();
    }
  }, []);

  useEffect(() => {
    (window as any).__handleHomeShake = shuffleHomePucks;
    return () => {
      delete (window as any).__handleHomeShake;
    };
  }, [shuffleHomePucks]);

  useEffect(() => {
    const oneHourMs = 60 * 60 * 1000;
    const updateSeed = () => setRandomSeed(getCurrentHourSeed());

    const clearTimers = () => {
      if (seedTimeoutRef.current) {
        clearTimeout(seedTimeoutRef.current);
        seedTimeoutRef.current = null;
      }
      if (seedIntervalRef.current) {
        clearInterval(seedIntervalRef.current);
        seedIntervalRef.current = null;
      }
    };

    const scheduleNextUpdate = () => {
      const now = Date.now();
      const msUntilNextHour = oneHourMs - (now % oneHourMs);
      seedTimeoutRef.current = setTimeout(() => {
        updateSeed();
        seedIntervalRef.current = setInterval(updateSeed, oneHourMs);
      }, msUntilNextHour);
    };

    updateSeed();
    scheduleNextUpdate();
    
    // ОПТИМИЗАЦИЯ: Убрана задержка загрузки blockedUsers для быстрого старта анимации
    // Загружаем blockedUsers сразу, но не блокируем анимацию
    if (currentUser?.id) {
      // Загружаем в следующем тике event loop, чтобы не блокировать инициализацию
      Promise.resolve().then(() => {
        unblockLoadRef.current = true;
        loadBlockedUsers(true);
      });
    }

    return () => {
      clearTimers();
    };
  }, [loadBlockedUsers, currentUser?.id]);


  // Умный отбор игроков с ограничением количества
  // Используем useRef для стабильной ссылки, чтобы избежать переинициализации позиций
  const allVisiblePlayersRef = useRef<Player[]>([]);
  const lastFilterStateRef = useRef<{
    playersLength: number;
    hiddenPlayersCount: number;
    hiddenPlayerIds?: Set<string>; // Set ID скрытых игроков для точного сравнения
    currentUserId?: string;
    currentUserStatus?: string;
    selectedCountry?: string | null;
    selectedYear?: number | null;
    randomSeed: number;
    blockedUsersLength: number;
  }>({
    playersLength: 0,
    hiddenPlayersCount: 0,
    hiddenPlayerIds: new Set<string>(),
    randomSeed: 0,
    blockedUsersLength: 0
  });
  
  useEffect(() => {
    homePuckSelectionIdsRef.current = null;
    homePuckSelectionKeyRef.current = null;
  }, [selectedCountry, selectedYear, randomSeed, currentUser?.id]);

  const allVisiblePlayers = useMemo(() => {
    if (players.length === 0) {
      allVisiblePlayersRef.current = [];
      lastFilterStateRef.current = {
        playersLength: 0,
        hiddenPlayersCount: 0,
        hiddenPlayerIds: new Set<string>(),
        randomSeed: 0,
        blockedUsersLength: 0
      };
      return [];
    }

    const effectiveCountry = selectedCountry === null || selectedCountry === undefined 
      ? undefined 
      : selectedCountry;
    const effectiveYear = selectedYear === null || selectedYear === undefined 
      ? undefined 
      : selectedYear;

    // Фильтруем скрытые профили до вызова getSmartPlayerSelection
      const visiblePlayersForHome = players.filter(player => !player.is_hidden);

    // ВСЕГДА пересчитываем выборку для текущего набора фильтров
    const selected = getSmartPlayerSelection(
      visiblePlayersForHome,
      currentUser?.id,
      currentUser?.status,
      effectiveCountry,
      effectiveYear,
      randomSeed
    );
    
    // Фильтруем заблокированных пользователей (не показываем их на льду)
    let filtered = selected;
    if (blockedUsers.length > 0) {
      const blockedSet = new Set(blockedUsers);
      filtered = filtered.filter(player => !blockedSet.has(player.id));
    }

    if (currentUser?.id && currentUser.avatar) {
      filtered = filtered.map((player) =>
        player.id === currentUser.id && !player.avatar
          ? { ...player, avatar: currentUser.avatar }
          : player
      );
    }

    // Обновляем ref для использования в других местах
    if (__DEV__) {
      console.log('✅ [ANIMATION] Список видимых игроков обновлен:', {
        count: filtered.length,
        country: effectiveCountry || 'ALL',
        year: effectiveYear || 'ALL',
        players: filtered.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          country: p.country,
        })),
      });
    }
    allVisiblePlayersRef.current = filtered;

    // Обновляем lastFilterState только для возможного будущего использования (но не для кеширования результата)
    lastFilterStateRef.current = {
      playersLength: players.length,
      hiddenPlayersCount: players.filter(p => p.is_hidden).length,
      hiddenPlayerIds: new Set(players.filter(p => p.is_hidden).map(p => p.id)),
      randomSeed,
      blockedUsersLength: blockedUsers.length
    };

    // Добавляем “игровую” шайбу всегда, независимо от фильтров
    const gamePuck: Player = {
      id: GAME_PUCK_ID,
      name: 'STAR GOAL',
      status: 'game' as any,
      avatar: null,
    } as any;

    const quizGamePuck: Player = {
      id: QUIZ_GAME_PUCK_ID,
      name: 'Hockey Star Quiz',
      status: 'quizGame' as any,
      avatar: null,
    } as any;

    const fullList = [...filtered, gamePuck, quizGamePuck];

    const selectionKey = `${effectiveCountry ?? 'ALL'}|${effectiveYear ?? 'ALL'}|${randomSeed}|${currentUser?.id ?? ''}`;
    const blockedSet =
      blockedUsers.length > 0 ? new Set(blockedUsers) : null;

    if (
      homePuckSelectionIdsRef.current === null ||
      homePuckSelectionKeyRef.current !== selectionKey
    ) {
      homePuckSelectionKeyRef.current = selectionKey;
      homePuckSelectionIdsRef.current = fullList.map((p) => p.id);
    } else {
      const computedMap = new Map(fullList.map((p) => [p.id, p]));
      const stableIds = homePuckSelectionIdsRef.current.filter(
        (id) => !blockedSet?.has(id),
      );
      const stable = stableIds
        .map((id) => computedMap.get(id))
        .filter((p): p is Player => !!p);
      if (stable.length > 0) {
        const stableIdsSet = new Set(stable.map((p) => p.id));
        const extras = fullList.filter((p) => !stableIdsSet.has(p.id));
        return [...stable, ...extras];
      }
    }

    return fullList;
  }, [players, currentUser?.id, currentUser?.status, currentUser?.avatar, selectedCountry, selectedYear, randomSeed, blockedUsers]);

  // Прицельный prefetch аватаров именно для шайб на льду (без новой сборки, только JS / OTA).
  useLayoutEffect(() => {
    const puckPlayers = allVisiblePlayers.filter(
      (p) => p.id !== GAME_PUCK_ID && p.id !== QUIZ_GAME_PUCK_ID && !!p.avatar
    );
    if (puckPlayers.length === 0) return;
    seedPlayerAvatarUrls(puckPlayers);
  }, [allVisiblePlayers]);

  const lastPuckPrefetchSigRef = useRef('');
  useEffect(() => {
    const puckPlayers = allVisiblePlayers.filter(
      (p) => p.id !== GAME_PUCK_ID && p.id !== QUIZ_GAME_PUCK_ID && !!p.avatar
    );
    if (puckPlayers.length === 0) return;

    // Не перезапускаем prefetch, если набор аватаров на льду не изменился
    // (например, при догрузке рейтингов список пересобирается, но шайбы те же).
    const sig = puckPlayers.map((p) => `${p.id}:${p.avatar}`).join('|');
    if (sig === lastPuckPrefetchSigRef.current) return;
    lastPuckPrefetchSigRef.current = sig;

    const concurrency =
      performanceLevel === 'low' ? 3 : performanceLevel === 'medium' ? 5 : 12;

    const run = () => {
      preloadPlayerAvatars(puckPlayers, { concurrency }).catch(() => {});
    };

    if (isLowEndAndroid()) {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const handle = InteractionManager.runAfterInteractions(() => {
        timeout = setTimeout(run, physicsActive ? 0 : startupPhysicsDeferMs());
      });
      return () => {
        handle.cancel?.();
        if (timeout) clearTimeout(timeout);
      };
    }

    run();
  }, [allVisiblePlayers, performanceLevel, physicsActive]);

  // Для игры: берём игроков НЕЗАВИСИМО от фильтров (страна/год),
  // но сохраняем ограничения скрытых/заблокированных, чтобы не показывать их нигде.
  const gamePlayers = useMemo(() => {
    const base = players.filter((p) => !p.is_hidden);
    if (blockedUsers.length === 0) return base;
    const blockedSet = new Set(blockedUsers);
    return base.filter((p) => !blockedSet.has(p.id));
  }, [players, blockedUsers]);

  // Используем полную логику коллизий из основного экрана
  const windowForPucks = Dimensions.get('window');
  const playfieldLayoutReady = collisionLayoutReady && iceSize.width > 0 && iceSize.height > 0;
  const puckFieldWidth = playfieldLayoutReady ? iceSize.width : windowForPucks.width;
  const puckFieldHeight = playfieldLayoutReady ? iceSize.height : windowForPucks.height;
  const scaledPuckSize = useMemo(() => {
    const base = getScaledPuckBaseSize(puckFieldWidth, puckFieldHeight, { homeScreen: true });
    // Desktop: larger than mobile, then −30% from the 2× size (→ 1.4× base).
    return isDesktopLayout ? Math.round(base * 1.4) : base;
  }, [puckFieldWidth, puckFieldHeight, isDesktopLayout]);

  const homeLeaderRanks = useMemo(() => {
    if (players.length === 0) return new Map<string, LeaderRank>();
    const effectiveCountry =
      selectedCountry === null || selectedCountry === undefined ? undefined : selectedCountry;
    const effectiveYear =
      selectedYear === null || selectedYear === undefined ? undefined : selectedYear;
    const pool = players.filter((p) => {
      if (p.is_hidden || p.status !== 'player') return false;
      if (effectiveCountry && p.country !== effectiveCountry) return false;
      if (effectiveYear && !p.birthDate?.startsWith(String(effectiveYear))) return false;
      return true;
    });
    return getTopSeasonLeaderRanks(pool);
  }, [players, selectedCountry, selectedYear]);

  // Ждём фильтры и реальный onLayout льда — одна инициализация без смены границ.
  const puckPlayersForScene = useMemo(() => {
    if (isUserLoading) return [];
    if (currentUser && !filtersReady) return [];
    if (!playfieldLayoutReady) return [];
    return allVisiblePlayers;
  }, [isUserLoading, currentUser, filtersReady, playfieldLayoutReady, allVisiblePlayers]);

  // Пока открыта полноэкранная игра (шайбы главного экрана не видны под модалкой),
  // ставим домашнюю физику на паузу — иначе на слабых устройствах работают два движка сразу.
  const effectiveScreenForPhysics = (showGame || showQuizGame) ? 'game-modal' : (currentScreen || undefined);

  const { puckPositions, updatePuckPosition, boundaries, registerSharedPosition, resetPucksMotion } = usePuckCollisionSystem(
    puckPlayersForScene,
    currentUser?.id,
    effectiveScreenForPhysics,
    puckFieldWidth,
    puckFieldHeight,
    playfieldLayoutReady,
    physicsActive,
    homeLeaderRanks,
    scaledPuckSize,
  );

  // На слабом Android: как только шайбы на льду — сразу включаем физику (без второй паузы).
  useEffect(() => {
    if (puckPlayersForScene.length > 0 && !physicsActive) {
      setPhysicsActive(true);
    }
  }, [puckPlayersForScene.length, physicsActive]);

  // Watchdog: только если шайбы так и не появились через 3 с (без setPlayers — он дёргает лёд).
  useEffect(() => {
    const shouldRecover =
      currentScreen === 'home' &&
      !loading &&
      players.length > 0 &&
      puckPlayersForScene.length > 0 &&
      puckPositions.length === 0 &&
      !homePuckRecoveryAttemptedRef.current;

    if (!shouldRecover) {
      if (puckPositions.length > 0 || puckPlayersForScene.length === 0 || loading) {
        homePuckRecoveryAttemptedRef.current = false;
      }
      return;
    }

    const timeout = setTimeout(() => {
      if (homePuckRecoveryAttemptedRef.current) return;
      if (puckPositions.length > 0) return;
      homePuckRecoveryAttemptedRef.current = true;
      console.warn('⚠️ [HOME] Watchdog: повторная инициализация шайб');
      homePuckSelectionIdsRef.current = null;
      homePuckSelectionKeyRef.current = null;
      resetPucksMotion();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [currentScreen, loading, players.length, puckPlayersForScene.length, puckPositions.length, resetPucksMotion]);

  // Перезапускаем анимацию при возвращении на экран
  useFocusEffect(
    useCallback(() => {
      console.log('🏠 Возвращение на главный экран');
      setCurrentScreen('home');
      // Перезапускаем движение всех шайб, чтобы "залипшие" после профиля снова поехали
      resetPucksMotion();
      
      // Если есть параметр refresh, перезагружаем игроков принудительно
      // Это важно для случая, когда новый пользователь создан и сразу переходит на главный экран
      if (params.refresh) {
        console.log('🔄 useFocusEffect: Принудительное обновление списка игроков после регистрации');
        // Сбрасываем фильтры для переинициализации под нового пользователя
        filtersInitializedRef.current = false;
        filterInitTimeRef.current = 0;
        loadAllPlayers(true); // Принудительное обновление
      }
      
      // ОПТИМИЗАЦИЯ: НЕ перезагружаем игроков каждый раз при возврате на экран
      // Игроки уже загружены при монтировании, перезагрузка происходит только при:
      // 1. params.refresh (после регистрации)
      // 2. Realtime событиях (изменение is_hidden и т.д.)
      // 3. Смене пользователя (обрабатывается в отдельном useEffect)
      // Это убирает задержку 500мс и экономит запросы к БД
      
      // blockedUsers загружаем только один раз при первом входе
      if (unblockLoadRef.current && !hasLoadedBlockedInitiallyRef.current) {
        loadBlockedUsers(true);
        hasLoadedBlockedInitiallyRef.current = true;
      }
      return () => {
        setCurrentScreen(null);
      };
    }, [setCurrentScreen, currentUser?.id, loadBlockedUsers, params.refresh, loadAllPlayers, resetPucksMotion])
  );

  // Realtime подписка на изменения игроков (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('players-realtime-updates')
      // Обработка INSERT - создание нового игрока
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'players'
        },
        async (payload) => {
          const newPlayerData = payload.new as any;
          const playerId = newPlayerData.id;
          const isHidden = newPlayerData.is_hidden ?? false;
          
          console.log(`🆕 Realtime: Новый игрок создан: ${playerId}, is_hidden: ${isHidden}`);
          
          // Очищаем кеш всех игроков
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.multiRemove([...ALL_PLAYERS_LIST_CACHE_KEYS]).catch(err => {
            console.error('❌ Ошибка очистки кеша списка игроков:', err);
          });
          
          // ИСПРАВЛЕНИЕ: Если игрок не скрыт, загружаем его с принудительным обновлением
          // и добавляем в список. Используем forceRefresh=true чтобы получить актуальные данные.
          if (!isHidden) {
            try {
              // Используем принудительное обновление, чтобы получить нового игрока из БД
              const allPlayers = await loadPlayers(true);
              const newPlayer = allPlayers.find(p => p.id === playerId);
              if (newPlayer && !newPlayer.is_hidden) {
                setPlayers((prev) => {
                  const exists = prev.find(p => p.id === playerId);
                  if (!exists) {
                    console.log(`✅ Realtime: Добавлен новый игрок в список: ${newPlayer.name} (${newPlayer.country || 'без страны'}, ${newPlayer.birthDate ? newPlayer.birthDate.split('-')[0] : 'без года'})`);
                    // ИСПРАВЛЕНИЕ: Принудительно очищаем кеш allVisiblePlayers, чтобы он пересчитался
                    allVisiblePlayersRef.current = [];
                    return [...prev, newPlayer];
                  } else {
                    console.log(`⚠️ Realtime: Игрок ${newPlayer.name} уже есть в списке`);
                  }
                  return prev;
                });
              } else {
                console.warn(`⚠️ Realtime: Новый игрок ${playerId} не найден или скрыт после загрузки`);
              }
            } catch (error) {
              console.error('❌ Ошибка загрузки нового игрока:', error);
            }
          } else {
            console.log(`⏭️ Realtime: Новый игрок ${playerId} скрыт, пропускаем добавление`);
          }
        }
      )
      // Обработка UPDATE - обновление существующего игрока
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players'
        },
        (payload) => {
          const playerData = payload.new as any;
          const oldPlayerData = payload.old as any;
          const playerId = playerData?.id;
          if (!playerId) return;

          const newIsHidden = playerData.is_hidden ?? false;
          const oldIsHidden = oldPlayerData?.is_hidden ?? false;
          
          // Обновляем только если is_hidden действительно изменился
          if (newIsHidden !== oldIsHidden) {
            console.log(`🔄 Realtime: Обновление is_hidden для игрока ${playerId}: ${oldIsHidden} -> ${newIsHidden}`);
            
            // Очищаем кеш всех игроков для главного экрана при изменении is_hidden
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            AsyncStorage.multiRemove([...ALL_PLAYERS_LIST_CACHE_KEYS]).catch(err => {
              console.error('❌ Ошибка очистки кеша списка игроков:', err);
            });
            
            // Обновляем конкретного игрока в массиве players
            setPlayers((currentPlayers) => {
              const playerExists = currentPlayers.find(p => p.id === playerId);
              
              // Если игрок скрыт, просто обновляем его is_hidden (он будет отфильтрован в useMemo)
              if (playerExists) {
                return currentPlayers.map((player) => 
                player.id === playerId 
                  ? { ...player, is_hidden: newIsHidden }
                  : player
              );
              }
              
              // Если игрок показан и его нет в текущем списке, загружаем его
              if (!newIsHidden) {
                // Загружаем данные игрока если его нет в списке
                loadPlayers(false).then((allPlayers) => {
                  const updatedPlayer = allPlayers.find(p => p.id === playerId);
                  if (updatedPlayer && !updatedPlayer.is_hidden) {
                    setPlayers((prev) => {
                      const exists = prev.find(p => p.id === playerId);
                      if (!exists) {
                        return [...prev, updatedPlayer];
                      }
                      return prev.map(p => p.id === playerId ? updatedPlayer : p);
                    });
                  }
                }).catch(console.error);
              }
              
              // Если игрок скрыт и его нет в списке, не добавляем его
              return currentPlayers;
            });
          }

          // Аватар, голы/передачи и т.д. на шайбах: раньше игнорировалось, если is_hidden не менялся
          setPlayers((currentPlayers) => {
            const idx = currentPlayers.findIndex(p => p.id === playerId);
            if (idx === -1) return currentPlayers;
            const cur = currentPlayers[idx];
            const merged = mergePlayerFromPlayersRealtimeRow(cur, playerData as Record<string, unknown>);
            if (!merged) return currentPlayers;
            if (merged.invalidatePlayersListCache) {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              AsyncStorage.multiRemove([...ALL_PLAYERS_LIST_CACHE_KEYS]).catch(() => {});
            }
            if (playerData.avatar != null && playerData.avatar !== cur.avatar) {
              void updateAvatarGlobally(playerId, playerData.avatar as string);
            }
            return currentPlayers.map((p, i) => (i === idx ? merged.next : p));
          });
        }
      )
      // Обработка DELETE - удаление игрока
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'players'
        },
        (payload) => {
          const oldPlayerData = payload.old as any;
          const playerId = oldPlayerData?.id;
          
          if (playerId) {
            console.log(`🗑️ Realtime: Игрок удален: ${playerId}`);
            
            // Очищаем кеш всех игроков
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            AsyncStorage.multiRemove([...ALL_PLAYERS_LIST_CACHE_KEYS]).catch(err => {
              console.error('❌ Ошибка очистки кеша списка игроков:', err);
            });
            
            // Удаляем игрока из списка
            setPlayers((prev) => {
              const filtered = prev.filter(p => p.id !== playerId);
              if (filtered.length !== prev.length) {
                console.log(`✅ Realtime: Игрок удален из списка: ${playerId}`);
              }
              return filtered;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Обработчик drag - мемоизирован для оптимизации
  const handleDrag = useCallback((id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => {
    updatePuckPosition(id, x, y, vx, vy, isDragging);
  }, [updatePuckPosition]);

  // Обработчик нажатия на шайбу (навигация в профиль) - мемоизирован для оптимизации
  const handlePuckPress = useCallback((playerId: string) => {
    if (playerId === GAME_PUCK_ID) {
      setShowGame(true);
      return;
    }
    if (playerId === QUIZ_GAME_PUCK_ID) {
      setShowQuizGame(true);
      return;
    }
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const named =
      allVisiblePlayersRef.current.find((p) => p.id === playerId) ||
      players.find((p) => p.id === playerId);
    navigateToPlayerProfile(router, {
      playerId,
      name: named?.name,
      lang: language,
      returnTo: 'home',
    });
  }, [router, currentUser, players, language]);

  // Компоненты получают позиции через shared values, которые обновляются каждый кадр
  // React state обновляется только при изменении списка игроков (добавление/удаление)
  // Используем puckPlayersForScene — тот же набор, что и в физике (без двойной инициализации)
  const renderedPucks = useMemo(() => {
    // Карта позиций по ID для быстрого доступа
    const positionMap = new Map<string, PuckPosition>();
    puckPositions.forEach(p => {
      positionMap.set(p.id, p);
    });

    return puckPlayersForScene.map((player) => {
      // Берём существующую позицию, а если её нет (например, из‑за рассинхрона),
      // используем безопасную стартовую точку по центру.
      const leaderRank = homeLeaderRanks.get(player.id);
      const fallbackPosition: PuckPosition = {
        id: player.id,
        x: (boundaries.left + boundaries.right) / 2,
        y: (boundaries.top + boundaries.bottom) / 2,
        vx: 0,
        vy: 0,
        size: scaledPuckSize,
        isDragging: false,
      };

      const initialPosition = positionMap.get(player.id) || fallbackPosition;
      
      return (
        <OriginalPuckAnimator
          key={player.id}
          player={player}
          position={initialPosition}
          leaderRank={leaderRank}
          onNav={() => handlePuckPress(player.id)}
          onDrag={isDesktopLayout ? undefined : handleDrag}
          enableDrag={!isDesktopLayout}
          getAndroidPerformanceLevel={() => performanceLevel}
          registerSharedPosition={registerSharedPosition}
        />
      );
    });
  }, [puckPositions.length, puckPlayersForScene, homeLeaderRanks, handlePuckPress, handleDrag, performanceLevel, registerSharedPosition, boundaries, scaledPuckSize, isDesktopLayout]);

  // Анимация запущена если есть шайбы
  const isRunning = puckPositions.length > 0;

  // A inactive home tab must not paint over deep-linked /ru/player on mobile web Tabs.
  if (!isFocused) {
    return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
  }

    return (
      <View style={[styles.container, isDesktopLayout && styles.containerDesktop]}>
        <HomeSeoHead />
        <CachedBackground
        style={[styles.background, isDesktopLayout && styles.backgroundDesktop]}
          resizeMode="cover"
          vignette={false}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setIceSize({ width, height });
          }}
      >
        {/* Разметка хоккейного поля */}
        {iceSize.width > 0 && iceSize.height > 0 && (
          <IceRinkMarkings 
            width={iceSize.width} 
            height={iceSize.height} 
            opacity={0.15}
            topInset={0}  // Без отступа - ворота вплотную к краю
          />
        )}
        
        {/* Шайбы рендерятся через мемоизированный список для оптимизации производительности */}
        <PuckSceneFade ready={puckPositions.length > 0}>{renderedPucks}</PuckSceneFade>

        {/* Внутренняя граница - ТОЛЬКО для визуального эффекта, не блокирует touch */}
        <View style={styles.innerBorder} pointerEvents="box-none"></View>

        {/* Фильтры */}
        <View style={styles.filtersWrapper}>
          <View style={styles.filtersContainer}>
            <CountryFilter players={players} />
            <YearFilter players={players} />
          </View>
        </View>

        <InviteFriendsPill bottomInset={isDesktopLayout ? 24 : 16} />

      </CachedBackground>

      <PuckGame
        visible={showGame}
        onClose={() => {
          setShowGame(false);
          setGameOpenToResults(false);
        }}
        openToResults={gameOpenToResults}
        visiblePlayers={gamePlayers}
        currentUser={currentUser}
      />

      <HockeyStarQuizGame
        visible={showQuizGame}
        onClose={() => {
          setShowQuizGame(false);
          setQuizOpenToResults(false);
        }}
        openToResults={quizOpenToResults}
        currentUser={currentUser}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Тёмная сцена вокруг коробки — иначе скругление бортов не видно на льду из _layout
    backgroundColor: colors.scene,
  },
  containerDesktop: {
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 44, // скругление бортов хоккейной коробки
    overflow: 'hidden',
  },
  backgroundDesktop: {
    borderRadius: 32,
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  puckContainer: {
    position: 'absolute',
    zIndex: 1,
  },
  iceTrail: {
    position: 'absolute',
    overflow: 'hidden',
  },
  filtersWrapper: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1000,
    elevation: 1000,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 10,
    zIndex: 1000,
  },
  controlPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(22, 22, 26, 0.86)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
  },
});