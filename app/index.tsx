import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import { View, StyleSheet, Dimensions, ImageBackground, Text, TouchableOpacity, Platform, Vibration } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Puck from '../components/Puck';
import { useUser } from '../contexts/UserContext';
import { useScreenContext } from '../contexts/ScreenContext';
import { Player, loadPlayers, getSmartPlayerSelection, getBlockedUsers } from '../utils/playerStorage';
import { supabase } from '../utils/supabase';
import CountryFilter from '../components/CountryFilter';
import YearFilter from '../components/YearFilter';
import { useCountryFilter } from '../utils/CountryFilterContext';
import { useYearFilter } from '../utils/YearFilterContext';
import * as Device from 'expo-device';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Размер шайбы
const PUCK_SIZE = 70;

// Определение уровня производительности устройства
const getPerformanceLevel = (): 'high' | 'medium' | 'low' => {
  const yearClass = Device.deviceYearClass ?? null;
  const totalMemory = Device.totalMemory ?? null;
  const modelName = (Device.modelName || '').toLowerCase();

  if (Platform.OS === 'ios') {
    if (yearClass && yearClass < 2020) {
      return 'medium';
    }
    return 'high';
  }
  
  if (Platform.OS === 'android') {
    const lowEndModels = [
      'redmi note 9',
      'redminote 9',
      'redmi note9',
      'm2002j2g',
      'm2002j2i',
      'note 9'
    ];

    if (lowEndModels.some(name => modelName.includes(name))) {
      return 'low';
    }

    const memoryInGb = totalMemory ? totalMemory / (1024 ** 3) : null;
    if (memoryInGb && memoryInGb < 3.5) {
      return 'low';
    }

    if (yearClass && yearClass < 2019) {
      return 'low';
    }

    if (yearClass && yearClass < 2021) {
      return 'medium';
    }

    return 'high';
  }
  
  return 'high';
};

// Упрощенная версия usePuckCollisionSystem для тестового экрана
const usePuckCollisionSystem = (players: Player[], currentUserId?: string, currentScreen?: string, screenWidth?: number, screenHeight?: number) => {
  const puckSize = 70;
  const [puckPositions, setPuckPositions] = useState<PuckPosition[]>([]);
  const collisionDetectedRef = useRef(false);
  const lastHapticTimeRef = useRef(0);
  const isInitializedRef = useRef(false);
  const previousPlayersRef = useRef<Player[]>([]);
  // Отслеживаем активные столкновения для предотвращения повторной вибрации
  const activeCollisionsRef = useRef<Set<string>>(new Set());
  // Защита от переинициализации в первые секунды после загрузки
  const initializationTimeRef = useRef<number>(0);
  const INITIALIZATION_PROTECTION_MS = 3000; // 3 секунды защиты
  
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
  const sharedPositionsRef = useRef<Map<string, { x: { value: number }, y: { value: number } }>>(new Map());
  
  // Адаптивные константы для плавной физики в зависимости от производительности
  const { STEP_MS, FIXED_DT, MAX_STEPS, TARGET_FPS } = useMemo(() => {
    let config;
    switch (performanceLevel) {
      case 'high':
        config = {
          STEP_MS: 1000 / 120, // 120 FPS для мощных устройств
          FIXED_DT: 1 / 120,
          MAX_STEPS: 2,
          TARGET_FPS: 120,
        };
        break;
      case 'medium':
        config = {
          STEP_MS: 1000 / 60, // 60 FPS для средних устройств
          FIXED_DT: 1 / 60,
          MAX_STEPS: 2,
          TARGET_FPS: 60,
        };
        break;
      case 'low':
      default:
        config = {
          STEP_MS: 1000 / 30, // 30 FPS для слабых устройств (было 60, но слишком тяжело)
          FIXED_DT: 1 / 30,
          MAX_STEPS: 1, // Меньше шагов для слабых устройств
          TARGET_FPS: 30, // 30 FPS для слабых устройств
        };
        break;
    }
    
    return config;
  }, [performanceLevel]);

  const reactUpdateInterval = useMemo(() => {
    switch (performanceLevel) {
      case 'high':
        return 1;
      case 'medium':
        return 2;
      case 'low':
      default:
        return 4;
    }
  }, [performanceLevel]);

  // Получаем безопасные зоны для учета системных элементов
  const insets = useSafeAreaInsets();

  const windowDimensions = Dimensions.get('window');
  const width = screenWidth ?? windowDimensions.width;
  const height = screenHeight ?? windowDimensions.height;

  // Динамическое вычисление высоты таб-бара на основе Platform.OS
  // Значения из app/_layout.tsx: height: 80, paddingTop: 10, paddingBottom: 0 (Android) или 10 (iOS)
  const tabBarHeight = useMemo(() => {
    const baseHeight = 80; // height из tabBarStyle
    const paddingTop = 10; // paddingTop из tabBarStyle
    const paddingBottom = Platform.OS === 'android' ? 0 : 10; // paddingBottom из tabBarStyle
    return baseHeight + paddingTop + paddingBottom;
  }, []);

  const boundaries = useMemo(() => {
    // Платформо-зависимая корректировка отступа снизу
    // iOS: шайбы залетают ниже, нужно значительно увеличить отступ
    // Android: шайбы выше на ~20px, нужно уменьшить отступ на 20px
    const bottomPaddingAdjustment = Platform.OS === 'ios' ? 67 : -20;
    const baseBottomPadding = 15;
    const adjustedBottomPadding = baseBottomPadding + bottomPaddingAdjustment;
    
    // Вычисляем нижнюю границу с учетом реальной высоты таб-бара и безопасных зон
    // Для iOS: возможно insets.bottom уже большой, но все равно добавляем дополнительный отступ
    const bottomOffset = tabBarHeight + insets.bottom + puckSize + adjustedBottomPadding;
    
    return {
    left: 10, // Отступ 10 пикселей слева
    top: 10, // Отступ 10 пикселей сверху
    right: width - puckSize - 10, // Отступ 10 пикселей справа
      bottom: height - bottomOffset, // Динамическая нижняя граница
    };
  }, [width, height, puckSize, tabBarHeight, insets.bottom]);

  // Инициализация и обновление позиций
  useEffect(() => {
    if (!players || players.length === 0) {
      setPuckPositions([]);
      previousPlayersRef.current = [];
      physicsPositionsRef.current = [];
      renderPositionsRef.current = [];
      isInitializedRef.current = false;
      sharedPositionsRef.current.clear();
      initializationTimeRef.current = 0;
      return;
    }

    const now = Date.now();
    const timeSinceInit = initializationTimeRef.current > 0 ? now - initializationTimeRef.current : Infinity;
    const isInProtectionPeriod = timeSinceInit < INITIALIZATION_PROTECTION_MS;

    if (isInitializedRef.current) {
      const previousIds = new Set(previousPlayersRef.current.map(p => p.id));
      const currentIds = new Set(players.map(p => p.id));
      const sameSize = previousIds.size === currentIds.size;
      let samePlayers = sameSize;

      if (sameSize) {
        for (const id of currentIds) {
          if (!previousIds.has(id)) {
            samePlayers = false;
            break;
          }
        }
      }

      if (samePlayers) {
        // Если список игроков по ID не изменился, просто обновляем ref без переинициализации
        // Это предотвращает остановку анимации при обновлении blockedUsers или других фильтров
        // Также проверяем, не изменился ли статус игроков (может влиять на отображение)
        const statusChanged = previousPlayersRef.current.some(prevPlayer => {
          const currentPlayer = players.find(p => p.id === prevPlayer.id);
          return !currentPlayer || currentPlayer.status !== prevPlayer.status;
        });
        
        // В период защиты (первые 3 секунды) игнорируем изменения статуса, чтобы не переинициализировать
        if (!statusChanged || isInProtectionPeriod) {
          // Ничего не изменилось или мы в периоде защиты - просто обновляем ref
          if (statusChanged && isInProtectionPeriod) {
            console.log(`✅ [ANIMATION] usePuckCollisionSystem: статус изменился, но в периоде защиты - игнорируем`);
          }
          previousPlayersRef.current = players;
          return;
        }
        // Если статус изменился и период защиты прошел, продолжаем обновление позиций ниже
        console.log(`⚠️ [ANIMATION] usePuckCollisionSystem: статус изменился, будет переинициализация позиций`);
      } else {
        console.log(`⚠️ [ANIMATION] usePuckCollisionSystem: список игроков изменился (${previousIds.size} -> ${currentIds.size}), будет переинициализация`);
      }
    }
    
    const baseSpeedMultiplier = (() => {
      switch (performanceLevel) {
        case 'high':
          return 0.49;
        case 'medium':
          return 0.5;
        case 'low':
        default:
          return 0.4;
      }
    })();
    
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
        
        validPosition = existingPositions.every(pos => {
          const dx = x - pos.x;
          const dy = y - pos.y;
          return (dx * dx + dy * dy) >= minDistSq;
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
      const prevPlayers = previousPlayersRef.current;
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
        Array.from(sharedPositionsRef.current.keys()).forEach(id => {
      if (!currentIds.has(id)) {
        sharedPositionsRef.current.delete(id);
      }
        });

        if (!changed) {
          previousPlayersRef.current = players;
          return prevPositions;
        }

        physicsPositionsRef.current = newPositions;
        renderPositionsRef.current = newPositions;
        previousPlayersRef.current = players;
        return newPositions;
      });
      return;
    }

    const positions: PuckPosition[] = [];
    players.forEach(player => {
      const pos = generatePosition(positions);
      pos.id = player.id;
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

    setPuckPositions(positions);
    physicsPositionsRef.current = positions;
    renderPositionsRef.current = positions;
    previousPlayersRef.current = players;
    isInitializedRef.current = true;
    // Запоминаем время инициализации для защиты от переинициализации
    if (initializationTimeRef.current === 0) {
      initializationTimeRef.current = Date.now();
      console.log(`🚀 [ANIMATION] usePuckCollisionSystem: позиции инициализированы для ${puckPositions.length} шайб`);
    } else {
      console.log(`🔄 [ANIMATION] usePuckCollisionSystem: позиции ПЕРЕИНИЦИАЛИЗИРОВАНЫ для ${puckPositions.length} шайб`);
    }
  }, [players, boundaries, performanceLevel]);

  // Физический шаг с адаптивными константами в зависимости от производительности
  const stepPhysics = useCallback(() => {
    const currentPositions = physicsPositionsRef.current;
    if (currentPositions.length === 0) return;
    
    // Адаптивные параметры физики
    const { minSpeed, maxSpeed, friction } = (() => {
      switch (performanceLevel) {
        case 'high':
          return {
            minSpeed: 0.8,
            maxSpeed: 6.0, // Снижено для предотвращения разгона (было 10.5)
            friction: 0.999,
          };
        case 'medium':
          return {
            minSpeed: 0.6,
            maxSpeed: 6.0, // Снижено для предотвращения разгона (было 10.0)
            friction: 0.998,
          };
        case 'low':
        default:
          return {
            minSpeed: 0.5,
            maxSpeed: 5.0, // Снижено для предотвращения разгона (было 8.0)
            friction: 0.997,
          };
      }
    })();

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

      // Интеграция с фиксированным timestep для плавности (адаптивная)
      x += vx * FIXED_DT * TARGET_FPS;
      y += vy * FIXED_DT * TARGET_FPS;

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

      // Упрощенная проверка коллизий - только физика столкновений
      // Геометрические коллизии решаются после обновления всех позиций
      // Добавляем небольшой зазор (2px) между шайбами, чтобы избежать "примагничивания"
      const minDistance = puckSize;
      const minDistSq = minDistance * minDistance;
      const useSimplifiedPhysics = performanceLevel === 'low';

      // Только физика столкновений для автоматических шайб
      if (!pos.isDragging) {
      for (const other of currentPositions) {
          if (other.id === pos.id || other.isDragging) continue;

        const dx = x - other.x;
        const dy = y - other.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistSq && distSq > 0) {
            if (useSimplifiedPhysics) {
              // Упрощенная физика для слабых устройств - просто отталкивание
              const angle = Math.atan2(dy, dx);
              // Увеличиваем силу отталкивания для предотвращения кучкования
              vx += Math.cos(angle) * 0.2;
              vy += Math.sin(angle) * 0.2;
              // Ограничиваем скорость
              const speed = Math.sqrt(vx * vx + vy * vy);
              if (speed > maxSpeed) {
                const ratio = maxSpeed / speed;
                vx *= ratio;
                vy *= ratio;
              }
            } else {
          const dist = Math.sqrt(distSq);
          const angle = Math.atan2(dy, dx);

              // Физика столкновения
          const relativeVx = vx - other.vx;
          const relativeVy = vy - other.vy;
          const dot = relativeVx * Math.cos(angle) + relativeVy * Math.sin(angle);

          if (dot < 0) {
                // Увеличиваем restitution для лучшего отталкивания и предотвращения кучкования
                // Для iOS: 0.5 (было 0.4), для других: 0.9 (было 0.8)
                const restitution = performanceLevel === 'high' ? 0.5 : 0.9;
            const impulse = dot * restitution;
            vx -= impulse * Math.cos(angle);
            vy -= impulse * Math.sin(angle);
                
                // Добавляем дополнительный импульс отталкивания для предотвращения кучкования
                const additionalPush = 0.2;
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
    const minDistance = puckSize;
    const minDistSq = minDistance * minDistance;
    
    // Для слабых устройств используем упрощенную версию без Math.sqrt
    const useSimplifiedCollisions = performanceLevel === 'low';
    
    // Массив для накопления смещений
    const offsets = new Array(updatedPositions.length).fill(0).map(() => ({ x: 0, y: 0 }));
    
    // Один проход: вычисляем все необходимые смещения
    for (let i = 0; i < updatedPositions.length; i++) {
      const pos1 = updatedPositions[i];
      
      for (let j = i + 1; j < updatedPositions.length; j++) {
        const pos2 = updatedPositions[j];
        
        // Пропускаем если обе перетаскиваются
        if (pos1.isDragging && pos2.isDragging) continue;
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < minDistSq && distSq > 0) {
          let angle: number;
          let overlap: number;
          
          if (useSimplifiedCollisions) {
            // Упрощенная версия для слабых устройств - избегаем Math.sqrt
            // Используем приближение: dist ≈ distSq / minDistance для малых перекрытий
            const distApprox = distSq / minDistance;
            angle = Math.atan2(dy, dx);
            overlap = minDistance - distApprox;
            // Ограничиваем overlap, чтобы избежать слишком больших смещений
            if (overlap > minDistance) overlap = minDistance * 0.5;
          } else {
            const dist = Math.sqrt(distSq);
            angle = Math.atan2(dy, dx);
            overlap = minDistance - dist;
          }
          
          // Увеличиваем силу отталкивания для предотвращения кучкования
          // Используем коэффициент 1.2 для более сильного отталкивания
          const pushStrength = 1.2;
          const adjustedOverlap = overlap * pushStrength;
          
          // Накопление смещений
          if (pos1.isDragging) {
            // pos1 перетаскивается, двигаем только pos2
            offsets[j].x -= Math.cos(angle) * adjustedOverlap;
            offsets[j].y -= Math.sin(angle) * adjustedOverlap;
          } else if (pos2.isDragging) {
            // pos2 перетаскивается, двигаем только pos1
            offsets[i].x += Math.cos(angle) * adjustedOverlap;
            offsets[i].y += Math.sin(angle) * adjustedOverlap;
          } else {
            // Обе автоматические - двигаем обе
            const halfOverlap = adjustedOverlap * 0.5;
            offsets[i].x += Math.cos(angle) * halfOverlap;
            offsets[i].y += Math.sin(angle) * halfOverlap;
            offsets[j].x -= Math.cos(angle) * halfOverlap;
            offsets[j].y -= Math.sin(angle) * halfOverlap;
          }
          
          // Добавляем импульс скорости для лучшего разлета при столкновении
          // Это помогает предотвратить кучкование, придавая шайбам дополнительную скорость
          if (!pos1.isDragging && !pos2.isDragging) {
            const impulseStrength = 0.3; // Сила импульса
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            
            // Придаем скорость в направлении отталкивания
            updatedPositions[i].vx += cosAngle * impulseStrength;
            updatedPositions[i].vy += sinAngle * impulseStrength;
            updatedPositions[j].vx -= cosAngle * impulseStrength;
            updatedPositions[j].vy -= sinAngle * impulseStrength;
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

    // Обновляем референсы для интерполяции
    physicsPositionsRef.current = updatedPositions;
  }, [boundaries, currentUserId, puckSize, performanceLevel, FIXED_DT, TARGET_FPS]);

  // Используем requestAnimationFrame с интерполяцией для максимальной плавности
  const animationRunningRef = useRef(false);
  useEffect(() => {
    if (puckPositions.length === 0) {
      animationRunningRef.current = false;
      return;
    }

    // Если анимация уже запущена, не перезапускаем её
    if (animationRunningRef.current) {
      return;
    }

    animationRunningRef.current = true;

    let animationFrameId: number | null = null;
    let frameCount = 0;

    const tick = (now: number) => {
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

      // Интерполяция между кадрами для сверх-плавности (включена для всех устройств)
      const useInterpolation = true; // Включаем интерполяцию для плавности
      const alpha = useInterpolation ? Math.min(accumulatorRef.current / STEP_MS, 1) : 1;
      alphaRef.current = alpha;

      // ОБНОВЛЯЕМ SHARED VALUES КАЖДЫЙ КАДР для максимальной плавности
        const physics = physicsPositionsRef.current;
      physics.forEach(physicsPos => {
        const shared = sharedPositionsRef.current.get(physicsPos.id);
        if (shared && shared.x && shared.y) {
          // Всегда используем интерполяцию для плавности
          const currentPos = renderPositionsMapRef.current.get(physicsPos.id);
          if (currentPos) {
            // Плавная интерполяция между текущей и физической позицией
            shared.x.value = currentPos.x + (physicsPos.x - currentPos.x) * alpha;
            shared.y.value = currentPos.y + (physicsPos.y - currentPos.y) * alpha;
          } else {
            // Если нет текущей позиции, используем физическую напрямую
            shared.x.value = physicsPos.x;
            shared.y.value = physicsPos.y;
          }
        }
      });
      
      // Обновляем renderPositionsRef для интерполяции каждый кадр
      // Это нужно для плавной интерполяции между кадрами
      const nextRenderPositions = physics.map(p => ({ ...p }));
      renderPositionsRef.current = nextRenderPositions;
      const nextMap = new Map<string, PuckPosition>();
      nextRenderPositions.forEach(pos => {
        nextMap.set(pos.id, pos);
      });
      renderPositionsMapRef.current = nextMap;
      
      // Обновляем React state реже, чтобы не вызывать лишние перерисовки
      // Shared values обновляются каждый кадр, поэтому визуально все плавно
      if (frameCount % reactUpdateInterval === 0) {
        // Используем функциональную форму setState, чтобы избежать зависимости от текущего состояния
        setPuckPositions(() => physics);
      }

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
  }, [puckPositions.length, stepPhysics, STEP_MS, MAX_STEPS, reactUpdateInterval]); // Вернули зависимость от длины, но с защитой от перезапуска

  // Вибрация при столкновениях (только один раз при начале столкновения)
  useEffect(() => {
    // Отключаем вибрацию для слабых устройств для экономии ресурсов
    if (performanceLevel === 'low') {
      collisionDetectedRef.current = false;
      activeCollisionsRef.current.clear();
      return;
    }
    
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
    const currentPositions = physicsPositionsRef.current;
    const clearDistance = puckSize + 3; // Больше, чем для обнаружения столкновений (puckSize)
    const clearDistSq = clearDistance * clearDistance;
    const stillColliding = new Set<string>();
    
    for (let i = 0; i < currentPositions.length; i++) {
      for (let j = i + 1; j < currentPositions.length; j++) {
        const pos1 = currentPositions[i];
        const pos2 = currentPositions[j];
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distSq = dx * dx + dy * dy;
        
        // Считаем столкновение активным только если шайбы действительно близко
        // Используем большее расстояние для очистки, чтобы избежать постоянной вибрации
        if (distSq < clearDistSq && distSq > 0) {
          const collisionKey = [pos1.id, pos2.id].sort().join('-');
          stillColliding.add(collisionKey);
        }
      }
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
  // Используем прямые формулы вместо итераций для производительности
  const updatePuckPosition = useCallback(
    (id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => {
      setPuckPositions((current) => {
        // Находим текущую позицию шайбы
        const currentPuck = current.find(p => p.id === id);
        const prevX = currentPuck?.x ?? x;
        const prevY = currentPuck?.y ?? y;
        
        let finalX = Math.max(boundaries.left, Math.min(boundaries.right, x));
        let finalY = Math.max(boundaries.top, Math.min(boundaries.bottom, y));

        const minDistance = puckSize;
        const minDistSq = minDistance * minDistance;
        
        // Создаем новый массив позиций
        const newPositions = current.map((pos) => ({ ...pos }));

        if (isDragging) {
          // Находим индекс перетаскиваемой шайбы
          const draggedIndex = newPositions.findIndex(p => p.id === id);
          if (draggedIndex === -1) return current;
          
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
          const useSimplifiedDragCollisions = performanceLevel === 'low';
          
          for (let i = 0; i < newPositions.length; i++) {
            if (i === draggedIndex) continue;
            
            const other = newPositions[i];
            const dx = finalX - other.x;
            const dy = finalY - other.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq && distSq > 0) {
              let angle: number;
              let overlap: number;
              
              if (useSimplifiedDragCollisions) {
                // Упрощенная версия для слабых устройств
                const distApprox = distSq / minDistance;
                angle = Math.atan2(dy, dx);
                overlap = minDistance - distApprox;
                if (overlap > minDistance) overlap = minDistance * 0.5;
              } else {
                const dist = Math.sqrt(distSq);
                angle = Math.atan2(dy, dx);
                overlap = minDistance - dist;
          }
          
              // Перетаскиваемая шайба остается на месте (или двигается минимально)
              // Другая шайба отталкивается полностью
              // Увеличиваем силу отталкивания для предотвращения кучкования
              const pushStrength = 1.2;
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

              // Отслеживаем столкновения для вибрации (только один раз при начале столкновения)
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
          // немного отодвигаем её назад (используем уже обновленные позиции других шайб)
          // Пропускаем для слабых устройств для экономии ресурсов
          if (!useSimplifiedDragCollisions) {
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
                finalX -= Math.cos(angle) * overlap * 0.3;
                finalY -= Math.sin(angle) * overlap * 0.3;
                
                // Дополнительно отталкиваем другую шайбу, если она все еще слишком близко
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
          // Если не перетаскиваем, просто обновляем позицию
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

        // Обновляем референсы для интерполяции
        physicsPositionsRef.current = newPositions;
        renderPositionsRef.current = newPositions;

        return newPositions;
      });
    },
    [boundaries, currentUserId, puckSize]
  );

  // Функция для получения shared values (для использования в компонентах)
  const getSharedPosition = useCallback((id: string) => {
    return sharedPositionsRef.current.get(id);
  }, []);

  // Функция для регистрации shared values из компонентов
  const registerSharedPosition = useCallback((id: string, x: { value: number }, y: { value: number }) => {
    sharedPositionsRef.current.set(id, { x, y });
  }, []);

  return {
    puckPositions,
    updatePuckPosition,
    boundaries,
    isInitialized: puckPositions.length > 0,
    getSharedPosition, // Экспортируем функцию для получения shared values
    registerSharedPosition, // Экспортируем функцию для регистрации shared values
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
  onNav,
  onDrag,
  getAndroidPerformanceLevel,
  registerSharedPosition
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
  const dragVelocityRef = useRef({ vx: 0, vy: 0 });
  const lastDragVelocityRef = useRef({ vx: 0, vy: 0 }); // Последняя скорость движения при drag
  const dragHistoryRef = useRef<{x: number, y: number, time: number}[]>([]);
  
  // Используем useSharedValue для максимальной плавности на 120 Гц
  const animatedX = useSharedValue(position.x);
  const animatedY = useSharedValue(position.y);
  
  // Регистрируем shared values в системе коллизий для прямого обновления
  useEffect(() => {
    if (registerSharedPosition) {
      registerSharedPosition(position.id, animatedX, animatedY);
    }
  }, [position.id, animatedX, animatedY, registerSharedPosition]);
  
  // Синхронизируем shared values с position при изменении (когда не drag)
  // ОБНОВЛЕНО: обновляем shared values напрямую, без зависимости от React state
  useEffect(() => {
    if (!isDragging) {
      // Обновляем сразу, без requestAnimationFrame для более быстрой синхронизации
      animatedX.value = position.x;
      animatedY.value = position.y;
    }
  }, [position.x, position.y, isDragging, animatedX, animatedY]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: animatedX.value,
    top: animatedY.value,
  }), []);

  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent;
    // Сохраняем начальную позицию шайбы и смещение касания
    dragStartRef.current = {
      x: touch.locationX, // Смещение от левого края компонента в момент начала drag
      y: touch.locationY, // Смещение от верхнего края компонента в момент начала drag
      pageX: touch.pageX,
      pageY: touch.pageY,
      time: Date.now(),
      startX: position.x, // Начальная позиция шайбы
      startY: position.y,
    };
    lastPositionRef.current = { x: position.x, y: position.y };
    hasDraggedRef.current = false;
    setHasDragged(false);
    dragVelocityRef.current = { vx: 0, vy: 0 };
    dragHistoryRef.current = [];
    
    // Синхронизируем shared values с текущей позицией перед началом drag
    animatedX.value = position.x;
    animatedY.value = position.y;
    
    setIsDragging(true);
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
    
    // Синхронизируем shared values с финальной позицией после drag
    animatedX.value = position.x;
    animatedY.value = position.y;
    
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

      onDrag(position.id, position.x, position.y, finalVx, finalVy, false);
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
        points={player.goals && player.assists ? 
          (() => {
            try {
              const goals = parseInt(player.goals) || 0;
              const assists = parseInt(player.assists) || 0;
              const total = goals + assists;
              return total > 0 && !isNaN(total) ? total.toString() : undefined;
            } catch (error) {
              return undefined;
            }
          })() : undefined}
        isStar={player.status === 'star'}
        status={player.status}
          isOnline={player.isOnline} // Реальный статус онлайн из базы данных
        />
      </Suspense>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации: перерисовываем только при изменении позиции или данных игрока
  return (
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.position.vx === nextProps.position.vx &&
    prevProps.position.vy === nextProps.position.vy &&
    prevProps.position.isDragging === nextProps.position.isDragging &&
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.avatar === nextProps.player.avatar &&
    prevProps.player.status === nextProps.player.status &&
    prevProps.player.isOnline === nextProps.player.isOnline
  );
});

export default function HomeScreen() {
  const { currentUser, isUserLoading } = useUser();
  const router = useRouter();
  const { setCurrentScreen, currentScreen } = useScreenContext();
  const params = useLocalSearchParams();

  // Загружаем всех игроков из базы данных
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const lastBlockedUsersLoadRef = useRef(0);
  const filtersInitializedRef = useRef(false); // Флаг, что фильтры были инициализированы
  const previousVisiblePlayersRef = useRef<Set<string>>(new Set()); // Сохраняем ID видимых игроков для сравнения
  const filterInitTimeRef = useRef<number>(0); // Время инициализации фильтров для защиты от пересчета

  // Фильтры
  const { selectedCountry, setSelectedCountry, showCountryFilter, setShowCountryFilter } = useCountryFilter();
  const { selectedYear, setSelectedYear, showYearFilter, setShowYearFilter } = useYearFilter();

  // Вычисляем начальные значения фильтров СИНХРОННО при первом рендере
  // Это гарантирует, что фильтры будут установлены до вычисления allVisiblePlayers
  const initialFilters = useMemo(() => {
    console.log('🔍 [FILTERS] Пересчет initialFilters:', {
      isUserLoading,
      playersCount: players.length,
      currentUserCountry: currentUser?.country,
      currentUserName: currentUser?.name
    });

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
    
    console.log('🔍 [FILTERS] Проверка инициализации фильтров:', {
      userName: currentUser?.name,
      userCountry: defaultCountry,
      playersCount: players.length,
      isUserLoading,
      filtersInitialized: filtersInitializedRef.current,
      currentSelectedCountry: selectedCountry
    });
    
    // ВАЖНО: Если фильтры уже инициализированы, но страна пользователя изменилась,
    // переинициализируем фильтры независимо от текущего выбора в интерфейсе
    if (filtersInitializedRef.current && currentUser && currentUser.country) {
      const currentUserCountry = currentUser.country;
      if (currentUserCountry !== defaultCountry) {
        console.log('⚠️ [FILTERS] Страна пользователя изменилась!', {
          dbCountry: currentUserCountry,
          calculatedDefault: defaultCountry,
          selectedCountry,
          filtersInitialized: filtersInitializedRef.current
        });
        // Сбрасываем флаг инициализации, чтобы переинициализировать фильтры
        filtersInitializedRef.current = false;
      }
    }

    // Также проверяем несоответствие между выбранной страной и страной пользователя
    if (filtersInitializedRef.current && selectedCountry !== null && defaultCountry && selectedCountry !== defaultCountry) {
      console.log('⚠️ [FILTERS] Обнаружено несоответствие: выбранная страна не совпадает с новой страной пользователя!', {
        contextCountry: selectedCountry,
        userCountry: defaultCountry
      });
      // Сбрасываем флаг инициализации, чтобы переинициализировать фильтры
      filtersInitializedRef.current = false;
    }
    
    // Если фильтры уже инициализированы и страна совпадает, возвращаем текущие значения
    if (filtersInitializedRef.current && selectedCountry !== null && defaultCountry && selectedCountry === defaultCountry) {
      console.log('🔍 [FILTERS] Фильтры уже инициализированы и страна совпадает, возвращаем текущие значения');
      return { country: selectedCountry, year: selectedYear };
    }
    
    if (!defaultCountry) {
      console.log('⚠️ [FILTERS] У пользователя не указана страна, показываем "Все"');
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

    console.log('🔍 [FILTERS] Игроки в стране пользователя:', {
      country: defaultCountry,
      playersInCountry: playersInCountry.length,
      allPlayersInCountry: players.filter(p => p.country === defaultCountry).length,
      allPlayersWithStatus: players.filter(p => p.status === 'player').length
    });

    // Если нет игроков в стране пользователя, показываем "Все"
    if (playersInCountry.length === 0) {
      console.log('⚠️ [FILTERS] Нет игроков в стране пользователя, показываем "Все"');
      return { country: null, year: null };
    }

    // Устанавливаем фильтр по году рождения текущего пользователя
    let defaultYear: number | null = null;

    if (currentUser?.birthDate) {
      // Используем год рождения текущего пользователя
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
      // Находим год с максимальным количеством игроков в выбранной стране
      const yearCounts: { [year: string]: number } = {};
      playersInCountry.forEach(player => {
        const year = player.birthDate!.split('-')[0];
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      });

      if (Object.keys(yearCounts).length > 0) {
        // Находим год с максимальным количеством игроков
        const mostPopularYear = Object.keys(yearCounts).reduce((a, b) =>
          yearCounts[a] > yearCounts[b] ? a : b
        );
        defaultYear = parseInt(mostPopularYear);
      }
    }

    return { country: defaultCountry, year: defaultYear };
  }, [players.length, currentUser?.country, currentUser?.birthDate, currentUser?.status, isUserLoading]);

  // Устанавливаем начальные значения фильтров СРАЗУ при первой загрузке
  // Используем useLayoutEffect для синхронной установки перед отрисовкой
  useLayoutEffect(() => {
    // Ждем завершения загрузки пользователя перед инициализацией фильтров
    if (isUserLoading) {
      return;
    }

    // Если пользователь загрузился, но фильтры еще не инициализированы, сбрасываем флаг
    // Это позволяет переинициализировать фильтры, если они были установлены как null до загрузки пользователя
    if (currentUser && filtersInitializedRef.current && selectedCountry === null && selectedYear === null && initialFilters.country !== null) {
      console.log('🔄 [FILTERS] Пользователь загрузился, переинициализируем фильтры');
      filtersInitializedRef.current = false;
    }

    // ВАЖНО: Переинициализируем фильтры, если страна пользователя изменилась
    // Это должно происходить независимо от текущего состояния фильтров
    if (currentUser && filtersInitializedRef.current && initialFilters.country && selectedCountry !== initialFilters.country) {
      console.log('🔄 [FILTERS] Страна пользователя изменилась, переинициализируем фильтры', {
        oldCountry: selectedCountry,
        newCountry: initialFilters.country
      });
      filtersInitializedRef.current = false;
    }

    // Инициализируем фильтры только один раз при первой загрузке
    // Или переинициализируем только если страна пользователя изменилась И фильтры были инициализированы
    // НЕ переинициализируем, если пользователь вручную выбрал "Все"
    const shouldInitialize = players.length > 0 &&
      !filtersInitializedRef.current &&
      (selectedCountry === null && selectedYear === null ||
       filtersInitializedRef.current === false // Флаг был сброшен из-за изменения страны пользователя
      );
    
    if (shouldInitialize) {
      console.log('🎯 [FILTERS] Инициализация фильтров синхронно:', {
        initialFilters,
        currentUserName: currentUser?.name,
        currentUserCountry: currentUser?.country,
        currentUserBirthDate: currentUser?.birthDate,
        isUserLoading,
        playersCount: players.length,
        filtersInitializedFlag: filtersInitializedRef.current
      });

      setSelectedCountry(initialFilters.country);
      setSelectedYear(initialFilters.year);
      
      if (initialFilters.country) {
        console.log(`✅ [FILTERS] Фильтры инициализированы: страна=${initialFilters.country}, год=${initialFilters.year}`);
      } else {
        console.log('✅ [FILTERS] Фильтры инициализированы: "Все" (страна=null, год=null)');
      }
      
      // Помечаем, что фильтры были инициализированы
      filtersInitializedRef.current = true;
    }
  }, [players.length, currentUser, isUserLoading, selectedCountry, selectedYear, setSelectedCountry, setSelectedYear, initialFilters]);

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

  // Загрузка игроков (с поддержкой принудительного обновления)
  const loadAllPlayers = useCallback(async (forceRefresh = false) => {
      try {
        setLoading(true);
      const loadedPlayers = await loadPlayers(forceRefresh); // Принудительное обновление при необходимости
        setPlayers(loadedPlayers);
        console.log(`✅ Игроки загружены${forceRefresh ? ' (принудительно)' : ''}:`, loadedPlayers.length);
        } catch (error) {
        console.error('❌ Ошибка загрузки игроков:', error);
      } finally {
        setLoading(false);
      }
  }, []);

  // Загружаем игроков при монтировании
  useEffect(() => {
    loadAllPlayers();
  }, [loadAllPlayers]);

  // Обрабатываем параметр refresh для принудительного обновления списка игроков
  useEffect(() => {
    if (params.refresh) {
      console.log('🔄 Принудительное обновление списка игроков после регистрации');
      loadAllPlayers(true); // Принудительное обновление
    }
  }, [params.refresh, loadAllPlayers]);

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
    
    // Загружаем blockedUsers с небольшой задержкой, чтобы не останавливать анимацию при инициализации
    // Но только если пользователь авторизован
    let unblockTimeout: ReturnType<typeof setTimeout> | null = null;
    if (currentUser?.id) {
      unblockTimeout = setTimeout(() => {
        unblockLoadRef.current = true;
        loadBlockedUsers(true);
      }, 1000); // Небольшая задержка для авторизованных пользователей
    }
    
    return () => {
      clearTimers();
      if (unblockTimeout) {
        clearTimeout(unblockTimeout);
      }
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

    // Используем вычисленные начальные фильтры, если фильтры еще не установлены в контексте
    // Это гарантирует, что фильтры применяются с первого рендера
    const effectiveCountry = selectedCountry !== null && selectedCountry !== undefined 
      ? selectedCountry 
      : (initialFilters.country !== undefined ? initialFilters.country : null);
    const effectiveYear = selectedYear !== null && selectedYear !== undefined 
      ? selectedYear 
      : (initialFilters.year !== undefined ? initialFilters.year : null);

    // Проверяем, изменились ли параметры фильтрации
    // Также отслеживаем изменения is_hidden для скрытых игроков
    // Используем Set для быстрого сравнения скрытых игроков по ID
    const hiddenPlayerIds = new Set(players.filter(p => p.is_hidden).map(p => p.id));
    const previousHiddenIds = lastFilterStateRef.current.hiddenPlayerIds || new Set<string>();
    const hiddenChanged = hiddenPlayerIds.size !== previousHiddenIds.size || 
      Array.from(hiddenPlayerIds).some(id => !previousHiddenIds.has(id)) ||
      Array.from(previousHiddenIds).some(id => !hiddenPlayerIds.has(id));
    const currentFilterState = {
      playersLength: players.length,
      hiddenPlayersCount: hiddenPlayerIds.size, // Количество скрытых игроков
      hiddenPlayerIds: hiddenPlayerIds, // Set ID скрытых игроков для точного сравнения
      currentUserId: currentUser?.id,
      currentUserStatus: currentUser?.status,
      selectedCountry: effectiveCountry, // Используем эффективные значения фильтров
      selectedYear: effectiveYear,
      randomSeed: randomSeed,
      blockedUsersLength: blockedUsers.length
    };
    
    const lastState = lastFilterStateRef.current;
    
    // ЗАЩИТА: Игнорируем первое изменение currentUser при инициализации (первые 5 секунд)
    // Это предотвращает остановку анимации при первой загрузке пользователя и инициализации фильтров
    const now = Date.now();
    const INITIALIZATION_PROTECTION_MS = 5000; // 5 секунд защиты - покрывает загрузку игроков, инициализацию фильтров (3.5 сек) и проверку скрытых игроков
    
    // Инициализируем время защиты при первой загрузке игроков или пользователя
    if (filterInitTimeRef.current === 0 && (currentFilterState.currentUserId || players.length > 0)) {
      filterInitTimeRef.current = now;
      console.log('🛡️ [ANIMATION] Период защиты активирован на', INITIALIZATION_PROTECTION_MS, 'мс');
    }
    
    const isInitializationPhase = filterInitTimeRef.current > 0 && (now - filterInitTimeRef.current) < INITIALIZATION_PROTECTION_MS;
    const timeSinceInit = filterInitTimeRef.current > 0 ? now - filterInitTimeRef.current : 0;
    const isFirstUserLoad = lastState.currentUserId === undefined && currentFilterState.currentUserId !== undefined;
    
    // ОПТИМИЗАЦИЯ: В период защиты игнорируем ВСЕ изменения, если список видимых игроков не изменился
    // Это включает: загрузку пользователя, инициализацию фильтров, изменения скрытых игроков
    // Сначала проверяем базовые фильтры без учета hiddenChanged, фильтров и пользователя в период защиты
    const basicFiltersChanged = 
      currentFilterState.playersLength !== lastState.playersLength ||
      // Игнорируем изменения пользователя в период защиты - они не должны вызывать переинициализацию
      (!isInitializationPhase && !isFirstUserLoad && currentFilterState.currentUserId !== lastState.currentUserId) ||
      (!isInitializationPhase && !isFirstUserLoad && currentFilterState.currentUserStatus !== lastState.currentUserStatus) ||
      // Игнорируем изменения фильтров в период защиты - они инициализируются позже
      (!isInitializationPhase && currentFilterState.selectedCountry !== lastState.selectedCountry) ||
      (!isInitializationPhase && currentFilterState.selectedYear !== lastState.selectedYear) ||
      currentFilterState.randomSeed !== lastState.randomSeed ||
      currentFilterState.blockedUsersLength !== lastState.blockedUsersLength;
    
    // КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: В период защиты ВСЕГДА проверяем, изменился ли список видимых игроков
    // перед пересчетом. Это предотвращает ВСЕ переинициализации при:
    // - загрузке пользователя (currentUser) - первая задержка
    // - инициализации фильтров (selectedCountry, selectedYear через 3.5 сек) - вторая задержка
    // - проверке скрытых игроков (hiddenChanged)
    // - любых других изменениях состояния
    if (isInitializationPhase && allVisiblePlayersRef.current.length > 0) {
      // В период защиты используем предыдущие значения фильтров для проверки,
      // чтобы игнорировать изменения, которые не влияют на список видимых игроков
      const checkUserId = lastState.currentUserId || currentUser?.id; // Используем предыдущий ID, если есть
      const checkUserStatus = lastState.currentUserStatus || currentUser?.status;
      // Используем эффективные значения фильтров для проверки
      const checkCountry = effectiveCountry;
      const checkYear = effectiveYear;
      
      // ЛОГИРОВАНИЕ: Отслеживаем изменения в период защиты
      const stateChanged = {
        userId: currentFilterState.currentUserId !== lastState.currentUserId,
        userStatus: currentFilterState.currentUserStatus !== lastState.currentUserStatus,
        country: currentFilterState.selectedCountry !== lastState.selectedCountry,
        year: currentFilterState.selectedYear !== lastState.selectedYear,
        hidden: hiddenChanged,
        playersLength: currentFilterState.playersLength !== lastState.playersLength
      };
      
      if (Object.values(stateChanged).some(v => v)) {
        console.log(`🔄 [ANIMATION] Период защиты (${Math.round(timeSinceInit)}мс): изменения состояния:`, stateChanged);
      }
      
      // Быстро проверяем, изменился ли список видимых игроков
      const visiblePlayersForHome = players.filter(player => !player.is_hidden);
      const selected = getSmartPlayerSelection(
        visiblePlayersForHome,
        checkUserId, // Используем предыдущий ID пользователя для проверки
        checkUserStatus,
        checkCountry, // Используем предыдущие фильтры для проверки
        checkYear,
        randomSeed
      );
      
      let filtered = selected;
      if (blockedUsers.length > 0) {
        const blockedSet = new Set(blockedUsers);
        filtered = filtered.filter(player => !blockedSet.has(player.id));
      }
      
      // Сравниваем по ID - если список не изменился, игнорируем ВСЕ изменения в период защиты
      const currentIds = new Set(filtered.map(p => p.id));
      const previousIds = new Set(allVisiblePlayersRef.current.map(p => p.id));
      const idsEqual = currentIds.size === previousIds.size && 
                       currentIds.size > 0 &&
                       Array.from(currentIds).every(id => previousIds.has(id)) &&
                       Array.from(previousIds).every(id => currentIds.has(id));
      
      if (idsEqual) {
        // Список видимых игроков не изменился - обновляем только состояние, но НЕ пересчитываем
        console.log(`✅ [ANIMATION] Период защиты (${Math.round(timeSinceInit)}мс): список не изменился, игнорируем изменения`);
        lastFilterStateRef.current = currentFilterState;
        return allVisiblePlayersRef.current;
      } else {
        console.log(`⚠️ [ANIMATION] Период защиты (${Math.round(timeSinceInit)}мс): список ИЗМЕНИЛСЯ! Будет переинициализация`);
        console.log(`   Предыдущие ID (${previousIds.size}):`, Array.from(previousIds).slice(0, 5), '...');
        console.log(`   Текущие ID (${currentIds.size}):`, Array.from(currentIds).slice(0, 5), '...');
      }
    }
    
    // Проверяем все фильтры, включая hiddenChanged (но только вне периода защиты)
    const filtersChanged = basicFiltersChanged || 
      (!isInitializationPhase && hiddenChanged);
    
    // ЛОГИРОВАНИЕ: Отслеживаем изменения фильтров
    if (filtersChanged && !isInitializationPhase) {
      console.log(`🔄 [ANIMATION] Вне периода защиты: фильтры изменились, будет пересчет`);
      console.log(`   basicFiltersChanged:`, basicFiltersChanged);
      console.log(`   hiddenChanged:`, hiddenChanged);
    }
    
    // Если параметры фильтрации не изменились, возвращаем старую ссылку
    if (!filtersChanged && allVisiblePlayersRef.current.length > 0) {
      // Обновляем состояние фильтров, но не пересчитываем список
      lastFilterStateRef.current = currentFilterState;
      return allVisiblePlayersRef.current;
    }
    
    // Обновляем состояние фильтров перед пересчетом
    lastFilterStateRef.current = currentFilterState;
    
    // ЛОГИРОВАНИЕ: Пересчет списка видимых игроков
    console.log(`🔄 [ANIMATION] Пересчет allVisiblePlayers:`, {
      isInitializationPhase,
      timeSinceInit: Math.round(timeSinceInit),
      playersCount: players.length,
      currentUserId: currentUser?.id,
      selectedCountry: effectiveCountry, // Логируем эффективные значения
      selectedYear: effectiveYear,
      hiddenCount: hiddenPlayerIds.size,
      fromContext: { country: selectedCountry, year: selectedYear },
      fromInitial: { country: initialFilters.country, year: initialFilters.year },
      effectiveValues: { country: effectiveCountry, year: effectiveYear }
    });

    // Фильтруем скрытые профили ДО вызова getSmartPlayerSelection для главного экрана
    // На главном экране скрытые игроки не показываются никому, включая админов
    // Админы могут видеть скрытые профили в поиске, но не на главном экране
    const visiblePlayersForHome = players.filter(player => !player.is_hidden);

    const selected = getSmartPlayerSelection(
      visiblePlayersForHome, // Передаем уже отфильтрованный список без скрытых игроков
      currentUser?.id,
      currentUser?.status,
      effectiveCountry || undefined, // Используем эффективные значения фильтров
      effectiveYear || undefined,
      randomSeed
    );
    
    // Дополнительная фильтрация не нужна, так как скрытые уже отфильтрованы
    let filtered = selected;
    
    // Фильтруем заблокированных пользователей (не показываем их на льду)
    if (blockedUsers.length > 0) {
      const blockedSet = new Set(blockedUsers);
      filtered = filtered.filter(player => !blockedSet.has(player.id));
    }
    
    // Сравниваем по ID, чтобы не создавать новую ссылку, если список не изменился
    const currentIds = new Set(filtered.map(p => p.id));
    const previousIds = allVisiblePlayersRef.current.length > 0 
      ? new Set(allVisiblePlayersRef.current.map(p => p.id))
      : new Set<string>();
    
    const idsEqual = currentIds.size === previousIds.size && 
                     currentIds.size > 0 &&
                     Array.from(currentIds).every(id => previousIds.has(id)) &&
                     Array.from(previousIds).every(id => currentIds.has(id));
    
    if (idsEqual && allVisiblePlayersRef.current.length > 0) {
      // Список ID не изменился - возвращаем старую ссылку, чтобы избежать переинициализации
      // Это критично для предотвращения остановки анимации
      return allVisiblePlayersRef.current;
    }
    
    // Список изменился - обновляем ref и возвращаем новый массив
    console.log(`✅ [ANIMATION] Список видимых игроков обновлен: ${filtered.length} игроков`);
    allVisiblePlayersRef.current = filtered;
    return filtered;
  }, [players, currentUser?.id, currentUser?.status, selectedCountry, selectedYear, randomSeed, blockedUsers]);

  // Используем полную логику коллизий из основного экрана
  const { puckPositions, updatePuckPosition, boundaries, registerSharedPosition } = usePuckCollisionSystem(
    allVisiblePlayers, // передаем всех видимых игроков
    currentUser?.id,
    currentScreen || undefined, // передаем currentScreen из контекста
    screenWidth,
    screenHeight
  );

  // Перезапускаем анимацию при возвращении на экран
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('home');
      // Перезагружаем игроков при возвращении на главный экран (например, после регистрации)
      loadAllPlayers();
      // Убрали задержку, чтобы избежать остановки анимации
      // blockedUsers уже загружаются при монтировании компонента
      if (unblockLoadRef.current && !hasLoadedBlockedInitiallyRef.current) {
        loadBlockedUsers(true);
        hasLoadedBlockedInitiallyRef.current = true;
      }
      return () => {
        setCurrentScreen(null);
      };
    }, [setCurrentScreen, currentUser?.id, loadBlockedUsers])
  );

  // Realtime подписка на изменения is_hidden для обновления видимости профилей
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('players-visibility-updates')
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
          const playerId = playerData.id;
          const newIsHidden = playerData.is_hidden ?? false;
          const oldIsHidden = oldPlayerData?.is_hidden ?? false;
          
          // Обновляем только если is_hidden действительно изменился
          if (newIsHidden !== oldIsHidden && playerId) {
            console.log(`🔄 Realtime: Обновление is_hidden для игрока ${playerId}: ${oldIsHidden} -> ${newIsHidden}`);
            
            // Очищаем кеш всех игроков для главного экрана при изменении is_hidden
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            AsyncStorage.removeItem('all_players').catch(err => {
              console.error('❌ Ошибка очистки кеша all_players:', err);
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
    if (!currentUser) {
      router.push('/login');
      return;
    }

    router.push({ pathname: '/player/[id]', params: { id: playerId } });
  }, [router, currentUser]);

  // Определяем уровень производительности для передачи в компоненты
  const performanceLevel = useMemo(() => getPerformanceLevel(), []);

  // Мемоизированный список шайб для оптимизации рендеринга
  const renderedPucks = useMemo(() => {
    return puckPositions.map((position) => {
      const player = allVisiblePlayers.find(p => p.id === position.id);
      if (!player) return null;
      
      return (
        <OriginalPuckAnimator
          key={player.id}
          player={player}
          position={position}
          onNav={() => handlePuckPress(player.id)}
          onDrag={handleDrag}
          getAndroidPerformanceLevel={() => performanceLevel}
          registerSharedPosition={registerSharedPosition}
        />
      );
    }).filter(Boolean);
  }, [puckPositions, allVisiblePlayers, handlePuckPress, handleDrag, performanceLevel, registerSharedPosition]);

  // Анимация запущена если есть шайбы
  const isRunning = puckPositions.length > 0;

    return (
      <View style={styles.container}>
        <ImageBackground 
        source={require('../assets/images/led.jpg')}
        style={styles.background}
          resizeMode="cover"
      >
        {/* Шайбы рендерятся через мемоизированный список для оптимизации производительности */}
        {renderedPucks}

        {/* Внутренняя граница - ТОЛЬКО для визуального эффекта, не блокирует touch */}
        <View style={styles.innerBorder} pointerEvents="box-none"></View>

        {/* Фильтры - как в основном экране */}
        <View style={styles.filtersWrapper}>
          <View style={styles.filtersContainer}>
            <CountryFilter players={players} />
            <YearFilter players={players} />
              </View>
            </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 50, // Скругленные углы как у хоккейной коробки
    overflow: 'hidden', // Обрезаем содержимое по скругленным углам
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 50, // Увеличиваем радиус для более скругленных углов хоккейной коробки
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  puckContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  filtersWrapper: {
    position: 'absolute',
    top: 20, // В левом верхнем углу как на главной
    left: 20,
    right: 20,
    alignItems: 'flex-start', // Выравнивание влево
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 15,
  },
  controlPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
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