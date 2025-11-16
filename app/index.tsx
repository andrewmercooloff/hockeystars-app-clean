import React, { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import { View, StyleSheet, Dimensions, ImageBackground, Text, TouchableOpacity, Platform, Vibration } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Puck from '../components/Puck';
import { useUser } from '../contexts/UserContext';
import { useScreenContext } from '../contexts/ScreenContext';
import { Player, loadPlayers, getSmartPlayerSelection } from '../utils/playerStorage';
import CountryFilter from '../components/CountryFilter';
import YearFilter from '../components/YearFilter';
import { useCountryFilter } from '../utils/CountryFilterContext';
import { useYearFilter } from '../utils/YearFilterContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Размер шайбы
const PUCK_SIZE = 70;

// Упрощенная версия usePuckCollisionSystem для тестового экрана
const usePuckCollisionSystem = (players: Player[], currentUserId?: string, currentScreen?: string, screenWidth?: number, screenHeight?: number) => {
  const puckSize = 70;
  const [puckPositions, setPuckPositions] = useState<PuckPosition[]>([]);
  const collisionDetectedRef = useRef(false);
  const lastHapticTimeRef = useRef(0);
  const isInitializedRef = useRef(false);
  const previousPlayersRef = useRef<Player[]>([]);
  
  // Для максимальной плавности используем useFrameCallback
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef(0);
  
  // Для интерполяции между кадрами
  const renderPositionsRef = useRef<PuckPosition[]>([]);
  const physicsPositionsRef = useRef<PuckPosition[]>([]);
  const alphaRef = useRef(1); // Интерполяционный коэффициент
  
  // Константы для плавной физики
  const STEP_MS = 1000 / 120; // 120 FPS для максимальной плавности
  const FIXED_DT = 1 / 120; // Фиксированный timestep в секундах
  const MAX_STEPS = 2; // Максимум шагов за кадр

  const windowDimensions = Dimensions.get('window');
  const width = screenWidth ?? windowDimensions.width;
  const height = screenHeight ?? windowDimensions.height;

  const boundaries = useMemo(() => ({
    left: 10, // Отступ 10 пикселей слева
    top: 10, // Отступ 10 пикселей сверху
    right: width - puckSize - 10, // Отступ 10 пикселей справа
    bottom: height - 200 - puckSize - 15, // Вычитаем место для таб-бара и отступ 15 пикселей снизу
  }), [width, height, puckSize]);

  // Инициализация позиций
  useEffect(() => {
    if (players.length === 0) {
      setPuckPositions([]);
      return;
    }

    // Определяем, это первая инициализация или смена фильтра
    const isFirstInit = !isInitializedRef.current;
    // Проверяем, изменился ли список игроков (сравниваем по ID)
    const previousPlayerIds = previousPlayersRef.current.map(p => p.id).sort().join(',');
    const currentPlayerIds = players.map(p => p.id).sort().join(',');
    const isFilterChange = isInitializedRef.current && previousPlayerIds !== currentPlayerIds;
    
    // При смене фильтра используем меньшую скорость и сбрасываем скорости для плавного перехода
    // Снижаем скорость на 50%: обычная скорость 0.7, при смене фильтра 0.35 (0.7 * 0.5)
    const speedMultiplier = isFilterChange ? 0.35 : 0.7;

    // Генерируем позиции с проверкой коллизий, чтобы шайбы не накладывались друг на друга
    const positions: PuckPosition[] = [];
    const minDistance = puckSize;
    const minDistSq = minDistance * minDistance;
    const maxAttempts = 100; // Максимальное количество попыток для размещения каждой шайбы

    for (const player of players) {
      let x: number, y: number;
      let attempts = 0;
      let validPosition = false;

      // Пытаемся найти валидную позицию без коллизий
      while (!validPosition && attempts < maxAttempts) {
        x = Math.random() * (boundaries.right - boundaries.left - 100) + boundaries.left + 50;
        y = Math.random() * (boundaries.bottom - boundaries.top - 100) + boundaries.top + 50;
        
        // Проверяем коллизии с уже размещенными шайбами
        validPosition = true;
        for (const existingPos of positions) {
          const dx = x - existingPos.x;
          const dy = y - existingPos.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < minDistSq) {
            validPosition = false;
            break;
          }
        }
        
        attempts++;
      }

      // Если не удалось найти позицию без коллизий, используем последнюю попытку
      // (в этом случае коллизии будут разрешены физикой на следующем кадре)
      if (!validPosition) {
        x = Math.random() * (boundaries.right - boundaries.left - 100) + boundaries.left + 50;
        y = Math.random() * (boundaries.bottom - boundaries.top - 100) + boundaries.top + 50;
      }

      positions.push({
        id: player.id,
        x: x!,
        y: y!,
        vx: (Math.random() - 0.5) * speedMultiplier,
        vy: (Math.random() - 0.5) * speedMultiplier,
        size: puckSize,
        isDragging: false,
      });
    }

    setPuckPositions(positions);
    physicsPositionsRef.current = positions;
    renderPositionsRef.current = positions;
    previousPlayersRef.current = players;
    isInitializedRef.current = true;
  }, [players, boundaries]);

  // Физический шаг с оптимизированными константами
  const stepPhysics = useCallback(() => {
    const currentPositions = physicsPositionsRef.current;
    if (currentPositions.length === 0) return;
    
    const minSpeed = 0.8;
    const friction = 0.999;
    const maxSpeed = 15.0; // Ограничение максимальной скорости шайб

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

      // Интеграция с фиксированным timestep для плавности
      x += vx * FIXED_DT * 60;
      y += vy * FIXED_DT * 60;

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
      const minDistance = puckSize;
      const minDistSq = minDistance * minDistance;

      // Только физика столкновений для автоматических шайб
      if (!pos.isDragging) {
        for (const other of currentPositions) {
          if (other.id === pos.id || other.isDragging) continue;

          const dx = x - other.x;
          const dy = y - other.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDistSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const angle = Math.atan2(dy, dx);
            
            // Физика столкновения
            const relativeVx = vx - other.vx;
            const relativeVy = vy - other.vy;
            const dot = relativeVx * Math.cos(angle) + relativeVy * Math.sin(angle);

            if (dot < 0) {
              const restitution = 0.8;
              const impulse = dot * restitution;
              vx -= impulse * Math.cos(angle);
              vy -= impulse * Math.sin(angle);
            }

            // Более мягкое сглаживание для плавности
            vx *= 0.95;
            vy *= 0.95;

            if (currentUserId && pos.id === currentUserId) {
              collisionDetectedRef.current = true;
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
          const dist = Math.sqrt(distSq);
          const angle = Math.atan2(dy, dx);
          const overlap = minDistance - dist;
          
          // Накопление смещений
          if (pos1.isDragging) {
            // pos1 перетаскивается, двигаем только pos2
            offsets[j].x -= Math.cos(angle) * overlap;
            offsets[j].y -= Math.sin(angle) * overlap;
          } else if (pos2.isDragging) {
            // pos2 перетаскивается, двигаем только pos1
            offsets[i].x += Math.cos(angle) * overlap;
            offsets[i].y += Math.sin(angle) * overlap;
          } else {
            // Обе автоматические - двигаем обе
            const halfOverlap = overlap * 0.5;
            offsets[i].x += Math.cos(angle) * halfOverlap;
            offsets[i].y += Math.sin(angle) * halfOverlap;
            offsets[j].x -= Math.cos(angle) * halfOverlap;
            offsets[j].y -= Math.sin(angle) * halfOverlap;
          }
          
          if (currentUserId && (pos1.id === currentUserId || pos2.id === currentUserId)) {
            collisionDetectedRef.current = true;
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
  }, [boundaries, currentUserId, puckSize]);

  // Используем requestAnimationFrame с интерполяцией для максимальной плавности
  useEffect(() => {
    if (puckPositions.length === 0) return;

    let animationFrameId: number | null = null;

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

      // Интерполяция между кадрами для сверх-плавности
      const alpha = Math.min(accumulatorRef.current / STEP_MS, 1);
      alphaRef.current = alpha;

      // Обновляем позиции с интерполяцией
      setPuckPositions((current) => {
        const physics = physicsPositionsRef.current;
        if (physics.length === 0 || physics.length !== current.length) return current;

        // Линейная интерполяция между текущими и физическими позициями
        const interpolated = physics.map((physicsPos, i) => {
          const currentPos = current[i];
          if (!currentPos) return physicsPos;

          return {
            ...physicsPos,
            x: currentPos.x + (physicsPos.x - currentPos.x) * alpha,
            y: currentPos.y + (physicsPos.y - currentPos.y) * alpha,
          };
        });

        return interpolated;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    lastTimeRef.current = 0;
    accumulatorRef.current = 0;
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
    };
  }, [puckPositions.length, stepPhysics]);

  // Вибрация при столкновениях (без изменений)
  useEffect(() => {
    if (collisionDetectedRef.current && currentScreen === 'home' && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      const now = Date.now();
      const timeDiff = now - lastHapticTimeRef.current;
      if (timeDiff > 100) {
        lastHapticTimeRef.current = now;
        if (Platform.OS === 'ios') {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            try {
              Vibration.vibrate(30);
            } catch {}
          }
        } else {
          try {
            Vibration.vibrate(30);
          } catch {}
        }
      }
      collisionDetectedRef.current = false;
    } else if (collisionDetectedRef.current) {
      collisionDetectedRef.current = false;
    }
  }, [puckPositions, currentScreen]);

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
              
              // Перетаскиваемая шайба остается на месте (или двигается минимально)
              // Другая шайба отталкивается полностью
              const pushX = -Math.cos(angle) * overlap;
              const pushY = -Math.sin(angle) * overlap;
              
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

              if (currentUserId && (id === currentUserId || other.id === currentUserId)) {
                collisionDetectedRef.current = true;
              }
            }
          }

          // Дополнительная проверка: если перетаскиваемая шайба все еще пересекается,
          // немного отодвигаем её назад (используем уже обновленные позиции других шайб)
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

  return {
    puckPositions,
    updatePuckPosition,
    boundaries,
    isInitialized: puckPositions.length > 0,
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
  getAndroidPerformanceLevel
}: {
  player: Player; 
  position: PuckPosition; 
  onNav: () => void; 
  onDrag?: (id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => void;
  getAndroidPerformanceLevel?: () => 'high' | 'medium' | 'low';
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
  
  // Синхронизируем shared values с position при изменении (когда не drag)
  useEffect(() => {
    if (!isDragging) {
      animatedX.value = position.x;
      animatedY.value = position.y;
    }
  }, [position.x, position.y, isDragging]);

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

      // Убираем жесткое ограничение скорости - скорость должна зависеть от скорости движения пальца
      // Оставляем только очень высокий лимит для защиты от ошибок
      const maxReleaseSpeed = 25.0; // Очень высокий лимит (уменьшен в 2 раза: было 50.0)
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
  const { currentUser } = useUser();
  const router = useRouter();
  const { setCurrentScreen, currentScreen } = useScreenContext();

  // Загружаем всех игроков из базы данных
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const filtersInitializedRef = useRef(false); // Флаг, что фильтры были инициализированы

  // Фильтры
  const { selectedCountry, setSelectedCountry, showCountryFilter, setShowCountryFilter } = useCountryFilter();
  const { selectedYear, setSelectedYear, showYearFilter, setShowYearFilter } = useYearFilter();

  // Устанавливаем начальные значения фильтров при первом запуске
  useEffect(() => {
    // Инициализируем фильтры только один раз при первой загрузке
    if (players.length > 0 && !filtersInitializedRef.current && selectedCountry === null && selectedYear === null) {
      // Для неавторизованных пользователей показываем "Все"
      if (!currentUser) {
        setSelectedCountry(null);
        setSelectedYear(null);
        return;
      }

      // Устанавливаем фильтр по стране текущего пользователя
      const defaultCountry = currentUser?.country;
      
      // Проверяем, есть ли игроки в стране пользователя
      if (defaultCountry) {
        const playersInCountry = players.filter(player =>
          player.country === defaultCountry &&
          player.birthDate &&
          player.status === 'player'
        );

        // Если нет игроков в стране пользователя, показываем "Все"
        if (playersInCountry.length === 0) {
          setSelectedCountry(null);
          setSelectedYear(null);
          return;
        }

        setSelectedCountry(defaultCountry);

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

        setSelectedYear(defaultYear);
      } else {
        // Если у пользователя нет страны, показываем "Все"
        setSelectedCountry(null);
        setSelectedYear(null);
      }
      
      // Помечаем, что фильтры были инициализированы
      filtersInitializedRef.current = true;
    }
  }, [players.length, currentUser, selectedCountry, selectedYear, setSelectedCountry, setSelectedYear]);

  // Состояние для управления годами рождения
  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  const birthYears = useMemo(() => {
    const years: number[] = [];
    for (let year = 2019; year >= 2008; year--) {
      years.push(year);
    }
    return years;
  }, []);

  // Ключ для перегенерации случайной части выборки
  const [shuffleKey, setShuffleKey] = useState(0);

  // Загрузка игроков
  useEffect(() => {
    const loadAllPlayers = async () => {
      try {
        setLoading(true);
        const loadedPlayers = await loadPlayers();
        setPlayers(loadedPlayers);
        console.log(`✅ Загружено ${loadedPlayers.length} игроков для главной страницы`);
        } catch (error) {
        console.error('❌ Ошибка загрузки игроков:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllPlayers();
  }, []);

  // Умный отбор игроков с ограничением количества
  const allVisiblePlayers = useMemo(() => {
    if (players.length === 0) return [];

    const selected = getSmartPlayerSelection(
      players, 
      currentUser?.id,
      selectedCountry || undefined,
      selectedYear || undefined,
      shuffleKey
    );
    return selected;
  }, [players, currentUser?.id, selectedCountry, selectedYear, shuffleKey]);

  // Используем полную логику коллизий из основного экрана
  const { puckPositions, updatePuckPosition, boundaries } = usePuckCollisionSystem(
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
      return () => {
        setCurrentScreen(null);
      };
    }, [setCurrentScreen])
  );

  // Обработчик drag - мемоизирован для оптимизации
  const handleDrag = useCallback((id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => {
    updatePuckPosition(id, x, y, vx, vy, isDragging);
  }, [updatePuckPosition]);

  // Обработчик нажатия на шайбу (навигация в профиль) - мемоизирован для оптимизации
  const handlePuckPress = useCallback((playerId: string) => {
    router.push({ pathname: '/player/[id]', params: { id: playerId } });
  }, [router]);

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
          getAndroidPerformanceLevel={() => 'high'}
        />
      );
    }).filter(Boolean);
  }, [puckPositions, allVisiblePlayers, handlePuckPress, handleDrag]);

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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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