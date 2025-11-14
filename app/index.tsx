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
  const animationRef = useRef<any>(null);
  const collisionDetectedRef = useRef(false);
  const lastHapticTimeRef = useRef(0);
  const isInitializedRef = useRef(false);
  const previousPlayersRef = useRef<Player[]>([]);
  const wasInBackgroundRef = useRef(false);
  const backgroundReturnFramesRef = useRef(0);
  const cachedPositionsRef = useRef<PuckPosition[]>([]);

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
    // Снижаем скорость на 30%: обычная скорость 0.7, при смене фильтра 0.49 (0.7 * 0.7)
    const speedMultiplier = isFilterChange ? 0.49 : 0.7;

           const positions: PuckPosition[] = players.map(player => ({
            id: player.id,
             x: Math.random() * (boundaries.right - boundaries.left - 100) + boundaries.left + 50,
             y: Math.random() * (boundaries.bottom - boundaries.top - 100) + boundaries.top + 50,
      vx: (Math.random() - 0.5) * speedMultiplier,
      vy: (Math.random() - 0.5) * speedMultiplier,
            size: puckSize,
             isDragging: false,
           }));

    setPuckPositions(positions);
    // Кэшируем начальные позиции
    cachedPositionsRef.current = positions;
    isInitializedRef.current = true; // Отмечаем, что инициализация произошла
    previousPlayersRef.current = players; // Сохраняем текущий список игроков
  }, [players, boundaries]);

  // Анимационный цикл - отключен при большом количестве шайб для производительности
  useEffect(() => {
    if (puckPositions.length === 0) return;

    // Для большого количества шайб используем упрощенную анимацию
    const isHighLoad = puckPositions.length > 20;

    // Адаптивный интервал: реже обновляем при большом количестве шайб
    const interval = isHighLoad ? 20 : 12;

    // Очищаем предыдущий интервал, если он существует
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    animationRef.current = setInterval(() => {
      setPuckPositions(currentPositions => {
        // Проверяем, есть ли шайбы для обновления (не все в drag)
        const hasNonDraggingPucks = currentPositions.some(p => !p.isDragging);
        if (!hasNonDraggingPucks) {
          return currentPositions; // Если все в drag, просто возвращаем текущие позиции
        }

        const updatedPositions = currentPositions.map(pos => {
          // Пропускаем шайбы, которые перетаскиваются (они обновляются через updatePuckPosition)
          if (pos.isDragging) {
            return pos;
          }

          let { x, y, vx, vy } = pos;

          // Оптимизация возврата из фона - пропускаем коллизии на 3 кадра для быстрого восстановления
          const skipCollisions = backgroundReturnFramesRef.current > 0;
          if (skipCollisions) {
            backgroundReturnFramesRef.current--;
          }

          // Для большого количества шайб упрощаем физику
          const simplifiedPhysics = isHighLoad;

          // Шайбы никогда не останавливаются полностью - поддерживаем минимальную скорость
          if (!simplifiedPhysics) {
            const minSpeed = 0.8;
            const currentSpeed = Math.sqrt(vx * vx + vy * vy);

            if (currentSpeed < minSpeed) {
              if (currentSpeed > 0.001) {
                const speedRatio = minSpeed / currentSpeed;
                vx *= speedRatio;
                vy *= speedRatio;
              } else {
                const randomAngle = Math.random() * Math.PI * 2;
                vx = Math.cos(randomAngle) * minSpeed;
                vy = Math.sin(randomAngle) * minSpeed;
              }
            }
          }

          x += vx;
          y += vy;

          // Проверяем границы
          if (x <= boundaries.left) {
            x = boundaries.left;
            vx = Math.abs(vx) * (simplifiedPhysics ? 1.0 : 1.02);
          } else if (x >= boundaries.right) {
            x = boundaries.right;
            vx = -Math.abs(vx) * (simplifiedPhysics ? 1.0 : 1.02);
          }

          if (y <= boundaries.top) {
            y = boundaries.top;
            vy = Math.abs(vy) * (simplifiedPhysics ? 1.0 : 1.02);
          } else if (y >= boundaries.bottom) {
            y = boundaries.bottom;
            vy = -Math.abs(vy) * (simplifiedPhysics ? 1.0 : 1.02);
          }

          // Коллизии включены для небольшого количества шайб
          if (!skipCollisions) {
            const maxCollisionsToCheck = 8;
            const minDistanceSquared = puckSize * puckSize;

            let collisionsChecked = 0;
            currentPositions.forEach(otherPos => {
              if (otherPos.id === pos.id || pos.isDragging || otherPos.isDragging) return;
              if (collisionsChecked >= maxCollisionsToCheck) return;

              const dx = x - otherPos.x;
              const dy = y - otherPos.y;
              const distanceSquared = dx * dx + dy * dy;

              if (distanceSquared < minDistanceSquared && distanceSquared > 0) {
                collisionsChecked++;
                const distance = Math.sqrt(distanceSquared);
                const angle = Math.atan2(dy, dx);
                const minDistance = puckSize;
                const overlap = minDistance - distance;

                const pushDistance = overlap * 0.5;
                x += Math.cos(angle) * pushDistance;
                y += Math.sin(angle) * pushDistance;

                const relativeVx = vx - otherPos.vx;
                const relativeVy = vy - otherPos.vy;
                const dotProduct = relativeVx * Math.cos(angle) + relativeVy * Math.sin(angle);

                if (dotProduct < 0) {
                  const restitution = 0.8;
                  const impulse = dotProduct * restitution;
                  vx -= impulse * Math.cos(angle);
                  vy -= impulse * Math.sin(angle);

                  const collisionBoost = 0.6;
                  vx += Math.cos(angle) * collisionBoost;
                  vy += Math.sin(angle) * collisionBoost;
                }

                const separationForce = overlap * 0.9;
                vx += Math.cos(angle) * separationForce;
                vy += Math.sin(angle) * separationForce;

                if (currentUserId && pos.id === currentUserId) {
                  collisionDetectedRef.current = true;
                }
              }
            });
          }
          
          // Финальная проверка границ
          x = Math.max(boundaries.left, Math.min(boundaries.right, x));
          y = Math.max(boundaries.top, Math.min(boundaries.bottom, y));

          // При упрощенной физике пропускаем трение и ограничение скорости
          if (!simplifiedPhysics) {
            const friction = 0.999;
            vx *= friction;
            vy *= friction;

            const maxSpeed = 3.0;
            const currentSpeedLimit = Math.sqrt(vx * vx + vy * vy);
            if (currentSpeedLimit > maxSpeed) {
              const speedRatio = maxSpeed / currentSpeedLimit;
              vx *= speedRatio;
              vy *= speedRatio;
            }
          }

          return { ...pos, x, y, vx, vy };
        });

        // Всегда обновляем кэш для надежности
        cachedPositionsRef.current = updatedPositions;

        return updatedPositions;
      });
    }, interval);

    // Отслеживаем переход в фон для кэширования состояния (только для мобильных платформ)
    // На веб AppState не используется, так как нет концепции фонового режима
    let appStateSubscription: { remove: () => void } | null = null;
    
    // Используем только на мобильных платформах, полностью исключаем на веб
    // Ранний return для веб-платформы, чтобы Metro bundler не пытался разрешить require('react-native')
    if (Platform.OS === 'web') {
      // На веб не используем AppState, просто пропускаем этот блок
    } else {
      // Только для iOS и Android
      try {
        // Используем проверку доступности модуля через typeof для избежания проблем на веб
        let AppStateModule: any = null;
        try {
          // Пытаемся получить AppState только если мы не на веб-платформе
          if (typeof require !== 'undefined') {
            const ReactNative = require('react-native');
            AppStateModule = ReactNative?.AppState;
          }
        } catch (e) {
          // Игнорируем ошибки при загрузке модуля
        }
        
        if (AppStateModule) {
          appStateSubscription = AppStateModule.addEventListener('change', (nextAppState: string) => {
            if (nextAppState.match(/inactive|background/)) {
              // Сохраняем текущее состояние при уходе в фон
              wasInBackgroundRef.current = true;
              cachedPositionsRef.current = [...puckPositions];
            } else if (nextAppState === 'active' && wasInBackgroundRef.current) {
              // Возвращаемся из фона - сразу восстанавливаем позиции из кэша для мгновенного отображения
              if (cachedPositionsRef.current.length > 0) {
                setPuckPositions(cachedPositionsRef.current);
              }
              // Пропускаем коллизии на несколько кадров для быстрого восстановления
              backgroundReturnFramesRef.current = 3; // Уменьшено с 5 до 3 для более быстрого восстановления
              wasInBackgroundRef.current = false;
            }
          });
        }
      } catch (e) {
        // AppState недоступен, игнорируем
      }
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      appStateSubscription?.remove();
    };
  }, [puckPositions.length, boundaries, currentUserId]); // Добавили currentUserId для вибрации

  // Обработка вибрации при столкновениях (отдельный эффект)
  // Вибрация работает только на главном экране и только для текущего пользователя
  useEffect(() => {
    if (collisionDetectedRef.current && currentScreen === 'home' && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      const now = Date.now();
      const timeDiff = now - lastHapticTimeRef.current;
      if (timeDiff > 100) {
        lastHapticTimeRef.current = now;
        
        // Легкая вибрация для столкновений шайб
        if (Platform.OS === 'ios') {
          try {
            // Используем легкую вибрацию для iOS
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (error) {
            // Если не сработало, пробуем Vibration
            try {
              Vibration.vibrate(30); // Короткая легкая вибрация
            } catch (vibError) {
              // Игнорируем ошибки
            }
          }
        } else {
          // Для Android используем короткую легкую вибрацию
          try {
            Vibration.vibrate(30);
          } catch (vibError) {
            // Игнорируем ошибки
          }
        }
      }
      // Сбрасываем флаг после проверки
      collisionDetectedRef.current = false;
    } else if (collisionDetectedRef.current) {
      // Сбрасываем флаг, если не на главном экране
      collisionDetectedRef.current = false;
    }
  }, [puckPositions, currentScreen]);

  // Функция для обновления позиции при drag
  const updatePuckPosition = useCallback((id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => {
    setPuckPositions(current => {
      let finalX = Math.max(boundaries.left, Math.min(boundaries.right, x));
      let finalY = Math.max(boundaries.top, Math.min(boundaries.bottom, y));

      // Если шайба в drag, проверяем коллизии и корректируем позицию
      let dragVx = vx;
      let dragVy = vy;

      // Проверка коллизий для перетаскиваемой шайбы (чтобы не проходила сквозь другие)
      if (isDragging) {
        // Проверяем только ближайшие шайбы
        const maxCollisionsToCheck = current.length;
        let collisionsChecked = 0;

        current.forEach(otherPos => {
        if (otherPos.id === id) return;
          if (collisionsChecked >= maxCollisionsToCheck) return;

          const dx = finalX - otherPos.x;
          const dy = finalY - otherPos.y;
          const distanceSquared = dx * dx + dy * dy;
          const minDistance = 70;
          const minDistanceSquared = minDistance * minDistance;

          if (distanceSquared < minDistanceSquared && distanceSquared > 0) {
            const distance = Math.sqrt(distanceSquared);
            collisionsChecked++;
            const angle = Math.atan2(dy, dx);

            const overlap = minDistance - distance;
            finalX += Math.cos(angle) * overlap;
            finalY += Math.sin(angle) * overlap;

            if (currentUserId && id === currentUserId) {
              collisionDetectedRef.current = true;
            }
          }
        });
      }

      // Ограничиваем финальную позицию границами
      finalX = Math.max(boundaries.left, Math.min(boundaries.right, finalX));
      finalY = Math.max(boundaries.top, Math.min(boundaries.bottom, finalY));

      return current.map(pos => {
        if (pos.id === id) {
          // Обновляем позицию перетаскиваемой шайбы
          return {
            ...pos,
            x: finalX,
            y: finalY,
            vx: dragVx ?? pos.vx,
            vy: dragVy ?? pos.vy,
            isDragging: isDragging ?? false,
          };
        }

        // ВРЕМЕННО ОТКЛЮЧЕНО: проверка коллизий с перетаскиваемой шайбой для тестирования производительности
        // Проверяем коллизии с перетаскиваемой шайбой и отталкиваем другую шайбу
        // Оптимизация: проверяем только если шайба близко (быстрая проверка без sqrt)
        // if (isDragging && pushChecksCount < maxPushChecks) {
        //   const dx = finalX - pos.x;
        //   const dy = finalY - pos.y;
        //   const distanceSquared = dx * dx + dy * dy;
        //   const minDistance = 70; // puckSize
        //   const minDistanceSquared = minDistance * minDistance;

        //   if (distanceSquared < minDistanceSquared && distanceSquared > 0) {
        //     pushChecksCount++;
        //     const distance = Math.sqrt(distanceSquared); // Вычисляем только если нужно
        //     // Отталкиваем другую шайбу - угол должен быть от перетаскиваемой к неподвижной
        //     const angle = Math.atan2(dy, dx); // dy = finalY - pos.y, dx = finalX - pos.x

        //     // Вычисляем скорость отталкивания на основе скорости перетаскиваемой шайбы (уменьшено)
        //   const dragSpeed = Math.sqrt(vx * vx + vy * vy);
        //     const pushForce = Math.min(dragSpeed * 0.5, 4.0); // Уменьшаем силу отталкивания

        //     // Также добавляем силу отталкивания для предотвращения прилипания (уменьшено)
        //     const separationForce = 0.8; // Уменьшаем

        //     // Добавляем ускорение при столкновении (уменьшено)
        //     const collisionBoost = 0.3; // Уменьшаем для мягкого отталкивания

        //     // Вторая шайба должна отталкиваться в направлении от перетаскиваемой
        //     return {
        //       ...pos,
        //       vx: pos.vx + Math.cos(angle) * (pushForce + separationForce + collisionBoost),
        //       vy: pos.vy + Math.sin(angle) * (pushForce + separationForce + collisionBoost),
        //     };
        //   }
        // }

        return pos;
      });
    });
  }, [boundaries, currentUserId]);

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

  const animatedStyle = useAnimatedStyle(() => ({
    left: position.x,
    top: position.y,
  }), [position.x, position.y]);

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
    setIsDragging(true);
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging || !onDrag) return;
    
    const touch = e.nativeEvent;
    const now = Date.now();
    
    // Увеличиваем throttle для оптимизации при большом количестве шайб
    const throttleInterval = Platform.OS === 'android' ? 20 : 20; // Оптимизированная частота обновлений

    if (now - lastUpdateTimeRef.current < throttleInterval) return;
    lastUpdateTimeRef.current = now;
    
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
    let vx = (newX - lastPositionRef.current.x) * 0.4;
    let vy = (newY - lastPositionRef.current.y) * 0.4;

    // Ограничиваем максимальную скорость для натурального движения
    const maxSpeed = 8.0; // Максимальная скорость при drag (увеличена)
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > maxSpeed) {
      vx = (vx / speed) * maxSpeed;
      vy = (vy / speed) * maxSpeed;
    }

    dragVelocityRef.current.vx += vx;
    dragVelocityRef.current.vy += vy;
    
    // Сохраняем последнюю скорость движения для использования при отпускании
    lastDragVelocityRef.current = { vx, vy };
    
    dragHistoryRef.current.push({ x: newX, y: newY, time: now });
    if (dragHistoryRef.current.length > 10) {
      dragHistoryRef.current.shift();
    }
    
    lastPositionRef.current = { x: newX, y: newY };
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
        
        // Используем среднее значение из последних 3-4 позиций для более плавной скорости
        const samplesToUse = Math.min(4, history.length - 1);
        let totalDx = 0;
        let totalDy = 0;
        let totalTime = 0;
        
        for (let i = history.length - 1; i > history.length - samplesToUse - 1; i--) {
          const current = history[i];
          const previous = history[i - 1];
          totalDx += current.x - previous.x;
          totalDy += current.y - previous.y;
          totalTime += Math.max(1, current.time - previous.time);
        }
        
        const pixelsPerMsX = totalDx / totalTime;
        const pixelsPerMsY = totalDy / totalTime;
        const frameTime = 16; // миллисекунды на кадр
        // Увеличиваем скорость при отпускании для более энергичного движения
        const speedMultiplier = 1.5; // Увеличиваем скорость в 1.5 раза
        finalVx = pixelsPerMsX * frameTime * speedMultiplier;
        finalVy = pixelsPerMsY * frameTime * speedMultiplier;
      } else {
        // Если истории недостаточно, используем последнюю сохраненную скорость
        // Компенсируем коэффициент 0.4, который был применен при вычислении
        // Увеличиваем скорость при отпускании для более энергичного движения
        const speedMultiplier = 1.5; // Увеличиваем скорость в 1.5 раза
        finalVx = (lastDragVelocityRef.current.vx / 0.4) * speedMultiplier;
        finalVy = (lastDragVelocityRef.current.vy / 0.4) * speedMultiplier;
      }

      // Увеличиваем максимальную скорость при отпускании для более энергичного движения
      const maxReleaseSpeed = 4.5; // Увеличено с 3.0 для более быстрого движения при отпускании
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

  // Фильтры
  const { selectedCountry, setSelectedCountry, showCountryFilter, setShowCountryFilter } = useCountryFilter();
  const { selectedYear, setSelectedYear, showYearFilter, setShowYearFilter } = useYearFilter();

  // Устанавливаем начальные значения фильтров при первом запуске
  useEffect(() => {
    if (players.length > 0 && selectedCountry === null && selectedYear === null) {
      // Устанавливаем фильтр по стране текущего пользователя или "Беларусь" по умолчанию
      const defaultCountry = currentUser?.country || 'Беларусь';
      setSelectedCountry(defaultCountry);

      // Устанавливаем фильтр по году рождения текущего пользователя
      // Если год не указан - находим год с максимальным количеством игроков в выбранной стране
      let defaultYear: number;

      if (currentUser?.birthDate) {
        // Используем год рождения текущего пользователя
        defaultYear = parseInt(currentUser.birthDate.split('-')[0]);
      } else {
        // Находим год с максимальным количеством игроков в выбранной стране
        const playersInCountry = players.filter(player =>
          player.country === defaultCountry &&
          player.birthDate &&
          player.status === 'player' // Только игроки, не админы/тренеры
        );

        if (playersInCountry.length > 0) {
          // Группируем игроков по году рождения
          const yearCounts: { [year: string]: number } = {};
          playersInCountry.forEach(player => {
            const year = player.birthDate!.split('-')[0];
            yearCounts[year] = (yearCounts[year] || 0) + 1;
          });

          // Находим год с максимальным количеством игроков
          const mostPopularYear = Object.keys(yearCounts).reduce((a, b) =>
            yearCounts[a] > yearCounts[b] ? a : b
          );

          defaultYear = parseInt(mostPopularYear);
        } else {
          // Если нет игроков в этой стране, используем 2012 как запасной вариант
          defaultYear = 2012;
        }
      }

      setSelectedYear(defaultYear);
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