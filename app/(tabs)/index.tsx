
import '../utils/logSilencer';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { Suspense, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  AppState,
  Dimensions,
  ImageBackground,
  Modal,
  PixelRatio,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import Animated, {
  useAnimatedStyle
} from 'react-native-reanimated';
import CountryFilter from '../../components/CountryFilter';
import YearFilter from '../../components/YearFilter';
import { useCountryFilter } from '../../utils/CountryFilterContext';
import { useYearFilter } from '../../utils/YearFilterContext';
import { countryCodeToCountryName, detectCountryFromIP } from '../../utils/countryUtils';
import { Player, checkDatabaseStatus, fixCorruptedData, initializeStorage, loadCurrentUser, loadPlayers, getSmartPlayerSelection, clearAllPlayersCache } from '../../utils/playerStorage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useScreenContext } from '../../contexts/ScreenContext';
import { useUser } from '../../contexts/UserContext';
import NetInfo from '@react-native-community/netinfo';
import { forceGilroyFont } from '../../utils/forceGilroyFont';
import { dataCache, CACHE_KEYS } from '../../utils/DataCache';
// Lazy load Puck component to improve initial render performance
const Puck = React.lazy(() => import('../../components/Puck'));

const { width, height } = Dimensions.get('window');

// Диагностическое логирование размеров экрана (отключено для производительности)
// Раскомментируйте при необходимости отладки
// const windowDims = Dimensions.get('window');
// const screenDims = Dimensions.get('screen');
// const pixelRatio = PixelRatio.get();
// const fontScale = PixelRatio.getFontScale();
// console.log('📐 [PUCK PHYSICS] Screen dimensions initialized:', {...});

interface PuckPosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isDragging?: boolean; // Флаг для перетаскиваемой шайбы
}

const usePuckCollisionSystem = (players: Player[], currentUserId?: string, currentScreen?: string) => {
  // ВАЖНО: Проверяем, не изменился ли scale factor, который может влиять на размеры
  const currentPixelRatio = PixelRatio.get();
  const currentScale = Dimensions.get('window').scale || 1;
  
  // Размер шайбы в логических единицах (points)
  // Если scale factor изменился, реальный размер на экране может отличаться
  const puckSize = 70; // Размер шайбы в points
  
  // Логирование размера шайбы отключено для производительности
  // const puckSizeLoggedRef = useRef(false);
  // if (__DEV__ && Platform.OS === 'ios' && !puckSizeLoggedRef.current) {
  //   console.log('📐 [PUCK PHYSICS] Puck size calculation:', {...});
  //   puckSizeLoggedRef.current = true;
  // }
  const [puckPositions, setPuckPositions] = useState<PuckPosition[]>([]);
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousLengthRef = useRef<number>(0);
  const lastHapticTimeRef = useRef<number>(0);
  const collisionDetectedRef = useRef<boolean>(false);
  const [animationRestartTrigger, setAnimationRestartTrigger] = useState<number>(0); // Триггер для принудительного перезапуска анимации
  
  // Определяем производительность устройства для Android
  const getAndroidPerformanceLevel = useCallback(() => {
    if (Platform.OS !== 'android') return 'high';
    
    // Простая эвристика на основе количества ядер и памяти
    // В реальном приложении можно использовать react-native-device-info
    const deviceInfo = {
      // Примерные значения для разных типов устройств
      cores: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory || 4
    };
    
    // Определяем уровень производительности
    if (deviceInfo.cores >= 8 && deviceInfo.memory >= 6) {
      return 'high'; // Флагманы и мощные устройства
    } else if (deviceInfo.cores >= 4 && deviceInfo.memory >= 4) {
      return 'medium'; // Средние устройства
    } else {
      return 'low'; // Старые/слабые устройства
    }
  }, []);
  
  // Получаем оптимальную частоту обновления
  // Восстановлено оригинальное значение для iOS
  const getOptimalFrameRate = useCallback(() => {
    if (Platform.OS === 'ios') {
      // Вернули оригинальные 60 FPS для iOS - максимальная плавность
      return 16; // 60 FPS для iOS (оригинальное значение)
    } else if (Platform.OS === 'web') {
      return 16; // 60 FPS для Web (обычно мощные устройства)
    } else if (Platform.OS === 'android') {
      const performanceLevel = getAndroidPerformanceLevel();
      switch (performanceLevel) {
        case 'high':
          return 16; // 60 FPS для мощных Android
        case 'medium':
          return 20; // 50 FPS для средних Android
        case 'low':
        default:
          return 33; // 30 FPS для слабых Android
      }
    }
    return 16; // По умолчанию 60 FPS
  }, [getAndroidPerformanceLevel]);
  
  // Отладочная информация (только при изменении currentUserId)
  // console.log('🎯 ВИБРАЦИЯ: usePuckCollisionSystem инициализирован с currentUserId =', currentUserId);

  // Мемоизируем границы, чтобы они не пересчитывались постоянно
  const boundaries = useMemo(() => {
    let boundaries;
      if (Platform.OS === 'ios') {
        // Для iPhone используем границы от самых краев экрана (льда)
        // Используем те же значения, что работают в Expo Go
        boundaries = {
          leftOffset: -25, // Установлено -25px для отступа слева
          topOffset: -25, // Установлено -25px для отступа сверху
          rightOffset: 7, // Значение из Expo Go
          bottomOffset: 218 // Значение из Expo Go
        };
    } else if (Platform.OS === 'web') {
      // Для Web используем более строгие границы (дополнительные отступы справа и снизу)
      boundaries = {
        leftOffset: 5,   // Уменьшено на 5 для увеличения пространства слева
        topOffset: 5,    // Уменьшено на 5 для увеличения пространства сверху
        rightOffset: 450,  // Значительно увеличено для предотвращения вылета справа (было 350)
        bottomOffset: 650  // Значительно увеличено для предотвращения вылета снизу (было 550)
      };
    } else {
      // Для Android используем фиксированные границы (сбалансированное пространство по горизонтали)
      boundaries = {
        leftOffset: 5,   // Уменьшено на 5 для увеличения пространства слева
        topOffset: 5,    // Уменьшено на 5 для увеличения пространства сверху
        rightOffset: 165,  // Уменьшено чтобы шайбы долетали до края
        bottomOffset: 415  // Уменьшено чтобы шайбы долетали до края
      };
    }
    
    // Диагностическое логирование границ
    // ВАЖНО: puckSize - диаметр шайбы (70px), радиус = puckSize/2
    // Центр шайбы не должен заходить дальше чем screen - offset - radius
    const wallMaxX = width - boundaries.rightOffset - puckSize / 2;
    const wallMaxY = height - boundaries.bottomOffset - puckSize / 2;
    // Логирование границ для диагностики в production (если включены логи)
    const enableLogsInProduction = typeof process !== 'undefined' &&
      process.env?.EXPO_PUBLIC_ENABLE_LOGS === 'true';
    if (enableLogsInProduction && Platform.OS === 'ios') {
      console.log('📐 [PUCK PHYSICS] iOS Boundaries calculated:', {
        width,
        height,
        puckSize,
        boundaries,
        wallMaxX,
        wallMaxY,
        rightOffset: boundaries.rightOffset,
        bottomOffset: boundaries.bottomOffset
      });
    }
    
    return boundaries;
  }, [width, height, puckSize]);

  useEffect(() => {
    if (players.length === 0) return;

    setPuckPositions(currentPositions => {
      const positionsMap = new Map(currentPositions.map(p => [p.id, p]));
      const nextPositions: PuckPosition[] = [];

      players.forEach(player => {
        if (positionsMap.has(player.id)) {
          nextPositions.push(positionsMap.get(player.id)!);
        } else {
          // Генерация позиции с проверкой на наложение с существующими шайбами
          let attempts = 0;
          let newX: number, newY: number;
          const maxAttempts = 50;
          const minDistance = puckSize * 1.05; // Минимальное расстояние при инициализации
          
          do {
            newX = boundaries.leftOffset + Math.random() * (width - boundaries.rightOffset - puckSize);
            newY = boundaries.topOffset + Math.random() * (height - boundaries.bottomOffset - puckSize);
            attempts++;
            
            // Проверяем расстояние до всех существующих шайб
            let tooClose = false;
            nextPositions.forEach(existingPos => {
              const dx = newX - existingPos.x;
              const dy = newY - existingPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < minDistance) {
                tooClose = true;
              }
            });
            
            if (!tooClose) break;
          } while (attempts < maxAttempts);
          
          // Если не удалось найти подходящую позицию, используем случайную
          if (attempts >= maxAttempts) {
            newX = boundaries.leftOffset + Math.random() * (width - boundaries.rightOffset - boundaries.leftOffset - puckSize);
            newY = boundaries.topOffset + Math.random() * (height - boundaries.bottomOffset - boundaries.topOffset - puckSize);
          }
          
          // Логирование для веб-платформы
          
          // Адаптивная скорость в зависимости от производительности устройства
          let speedMultiplier;
          if (Platform.OS === 'ios') {
            speedMultiplier = 1.0; // Оптимизировано для лучшей производительности
          } else if (Platform.OS === 'web') {
            speedMultiplier = 1.0; // Снижено с 1.2 для более стабильной работы границ
          } else if (Platform.OS === 'android') {
            const performanceLevel = getAndroidPerformanceLevel();
            switch (performanceLevel) {
              case 'high':
                speedMultiplier = 1.0; // Высокая скорость для мощных Android
                break;
              case 'medium':
                speedMultiplier = 0.7; // Средняя скорость для средних Android
                break;
              case 'low':
              default:
                speedMultiplier = 0.5; // Низкая скорость для слабых Android
                break;
            }
          } else {
            speedMultiplier = 1.2;
          }
          nextPositions.push({
            id: player.id,
            x: newX,
            y: newY,
            vx: (Math.random() - 0.5) * speedMultiplier,
            vy: (Math.random() - 0.5) * speedMultiplier,
            size: puckSize,
          });
        }
      });

      return nextPositions;
    });
  }, [players, boundaries.leftOffset, boundaries.rightOffset, boundaries.topOffset, boundaries.bottomOffset, width, height, puckSize]);

  useEffect(() => {
    if (puckPositions.length === 0) return;

    // Проверяем, что мы на главном экране перед запуском анимации
    if (currentScreen !== 'index') {
      // Очищаем интервал при уходе с главного экрана
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      return;
    }

    // Запускаем анимацию только при первой инициализации или изменении количества
    // Используем строгое сравнение - запускаем только когда длина реально изменилась
    const hasLengthChanged = previousLengthRef.current !== puckPositions.length;
    const shouldRestart = animationRestartTrigger > 0;
    
    // Если анимация уже запущена и количество шайб не изменилось, и нет принудительного перезапуска, не перезапускаем
    if (animationIntervalRef.current && !hasLengthChanged && !shouldRestart) {
      return;
    }
    
    previousLengthRef.current = puckPositions.length;

    // Очищаем предыдущие интервалы, если они есть
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    if (startDelayRef.current) {
      clearTimeout(startDelayRef.current);
      startDelayRef.current = null;
    }

    // Запускаем анимацию сразу без задержки
    animationIntervalRef.current = setInterval(() => {
        // Проверяем, что мы на главном экране перед обработкой физики
        if (currentScreen !== 'index') {
          return; // Не обрабатываем физику, если не на главном экране
        }
        
      setPuckPositions(currentPositions => {
          // Создаем массив обновлений для хранения изменений скоростей от коллизий
          const velocityChanges = currentPositions.map(() => ({ dvx: 0, dvy: 0 }));
          
          return currentPositions.map((pos, posIndex) => {
          // Пропускаем физику для перетаскиваемых шайб
          if (pos.isDragging) {
            return pos;
          }
          
          // КРИТИЧНО: Ограничиваем скорость ДО применения к позиции
          // Это предотвращает вылет за границы из-за слишком большой скорости
          const currentSpeed = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy);
          let newVx = pos.vx;
          let newVy = pos.vy;
          
          // Определяем maxSpeed в зависимости от платформы (временно, будет переопределено позже)
          let maxSpeed = 4.5;
          
          // Ограничиваем скорость ДО применения к позиции
          if (currentSpeed > maxSpeed) {
            newVx = (newVx / currentSpeed) * maxSpeed;
            newVy = (newVy / currentSpeed) * maxSpeed;
          }
          
          // Более плавное движение
          let newX = pos.x + newVx;
          let newY = pos.y + newVy;
          
          // Убираем трение для постоянного движения
          // const friction = 0.999; // Убираем трение
          // newVx *= friction;
          // newVy *= friction;


          // Обработка коллизий со стенами (платформо-зависимые границы)
          // Оптимизация: кешируем вычисления границ
          // ВАЖНО: puckSize - диаметр шайбы (70px), радиус = puckSize/2
          // Центр шайбы не должен заходить дальше чем screen - offset - radius
          const puckRadius = puckSize / 2;
          const wallMaxX = width - boundaries.rightOffset - puckRadius;
          const wallMaxY = height - boundaries.bottomOffset - puckRadius;
          
          // Физика отскока - унифицирована для всех платформ
          // Маленький отскок для реализма, но не слишком сильный чтобы не вылетать
          const bounceMultiplier = 0.95; // Незначительное уменьшение скорости при отскоке
          
          // СТРОГАЯ проверка границ ДО логирования - исправляем проблему с вылетом
          // Проверяем и корректируем позицию ПЕРЕД применением физики отскока
          // puckRadius уже объявлен выше
          const wasOutOfBoundsBefore = newX < boundaries.leftOffset + puckRadius ||
                                     newX > wallMaxX - puckRadius ||
                                     newY < boundaries.topOffset + puckRadius ||
                                     newY > wallMaxY - puckRadius;
          
          // Логирование выхода за границы отключено для производительности
          // if (Platform.OS === 'ios' && __DEV__ && wasOutOfBoundsBefore) {
          //   console.warn('🚨 [PUCK PHYSICS] iOS Puck out of bounds BEFORE correction:', {...});
          // }
          
          // СТРОГАЯ коррекция позиции - сначала ограничиваем, потом отскок
          // ВАЖНО: Проверяем ДО коррекции, была ли шайба за границами
          const wasOutOfBounds = newX < boundaries.leftOffset || newX > wallMaxX || newY < boundaries.topOffset || newY > wallMaxY;
          
          // ВАЖНО: Исправляем направление скорости правильно
          if (newX < boundaries.leftOffset) {
            newX = boundaries.leftOffset;
            newVx = Math.abs(newVx) * bounceMultiplier; // Отскок вправо (положительная скорость)
          } else if (newX > wallMaxX) {
            newX = wallMaxX;
            newVx = -Math.abs(newVx) * bounceMultiplier; // Отскок влево (отрицательная скорость)
          }
          
          if (newY < boundaries.topOffset) {
            newY = boundaries.topOffset;
            newVy = Math.abs(newVy) * bounceMultiplier; // Отскок вниз (положительная скорость)
          } else if (newY > wallMaxY) {
            newY = wallMaxY;
            newVy = -Math.abs(newVy) * bounceMultiplier; // Отскок вверх (отрицательная скорость)
          }
          
          // КРИТИЧНО: Уменьшаем скорость на 30% при выходе за границы для большей стабильности
          // Это предотвращает вылет в следующем кадре
          if (wasOutOfBounds) {
            newVx *= 0.7; // Уменьшаем скорость на 30%
            newVy *= 0.7;
          }
          
          const speedAfterWallBounce = Math.sqrt(newVx * newVx + newVy * newVy);
          if (speedAfterWallBounce > maxSpeed) {
            newVx = (newVx / speedAfterWallBounce) * maxSpeed;
            newVy = (newVy / speedAfterWallBounce) * maxSpeed;
          }
          
          // Дополнительная проверка после коррекции (на случай если что-то пошло не так)
          // Логирование отключено для производительности, но коррекция остается
          const stillOutOfBounds = newX < boundaries.leftOffset || newX > wallMaxX || newY < boundaries.topOffset || newY > wallMaxY;
          if (stillOutOfBounds) {
            // Принудительная коррекция без логирования
            newX = Math.max(boundaries.leftOffset, Math.min(wallMaxX, newX));
            newY = Math.max(boundaries.topOffset, Math.min(wallMaxY, newY));
          }

          // Дополнительная защита для веб-платформы - принудительное ограничение позиции
          if (Platform.OS === 'web') {
            // Исправляем расчет максимальных координат с учетом размера шайбы
            const maxX = width - boundaries.rightOffset - puckSize;
            const maxY = height - boundaries.bottomOffset - puckSize;
            
            // Проверяем, если шайба вылетает за границы (с учетом размера)
            // Логирование отключено для производительности
            if (newX < boundaries.leftOffset || newX > maxX || newY < boundaries.topOffset || newY > maxY) {
              // console.warn('🚨 Puck out of bounds BEFORE correction:', {...});
              
              // Если шайба вылетает, сбрасываем скорость в противоположную сторону
              if (newX < boundaries.leftOffset || newX > maxX) {
                newVx = -newVx * 0.5; // Сбрасываем скорость
              }
              if (newY < boundaries.topOffset || newY > maxY) {
                newVy = -newVy * 0.5; // Сбрасываем скорость
              }
            }
            
            // Строгая коррекция с учетом размера шайбы
            const correctedX = Math.max(boundaries.leftOffset, Math.min(maxX, newX));
            const correctedY = Math.max(boundaries.topOffset, Math.min(maxY, newY));
            
            newX = correctedX;
            newY = correctedY;
            
            // Если шайба прижалась к границе, отражаем скорость
            if (newX <= boundaries.leftOffset || newX >= maxX - puckSize) {
              newVx = -newVx * 0.85; // Web - улучшенный коэффициент
            }
            if (newY <= boundaries.topOffset || newY >= maxY - puckSize) {
              newVy = -newVy * 0.85; // Web - улучшенный коэффициент
            }
          }

          // Жесткая система коллизий - шайбы не могут накладываться
          // Оптимизация: проверяем только близкие шайбы (квадрат расстояния быстрее чем sqrt)
          // ВАЖНО: Исправляем расчет минимального расстояния для столкновений
           // puckSize = 70 - это диаметр шайбы, радиус = 35
           // В Expo Go используется радиус для расчета столкновений, чтобы шайбы не отталкивались слишком далеко
           // Для соответствия Expo Go используем радиус вместо диаметра
           // puckRadius уже объявлен выше (строка 347), используем его
           // Используем радиус * 1.5 вместо диаметра для более мягких столкновений (как в Expo Go)
           const minDistance = puckRadius * 1.5; // 35 * 1.5 = 52.5 (вместо 70)
          const minDistanceSq = minDistance ** 2;
          
          // Логирование настроек столкновений отключено для производительности
          // if (Platform.OS === 'ios' && __DEV__ && !collisionSettingsLoggedRef.current) {
          //   console.log('📐 [PUCK PHYSICS] Collision settings:', {...});
          //   collisionSettingsLoggedRef.current = true;
          // }
          
          currentPositions.forEach((otherPos, otherIndex) => {
            if (otherPos.id === pos.id || otherPos.isDragging) return;
            
            const dx = newX - otherPos.x;
            const dy = newY - otherPos.y;
            const distanceSq = dx * dx + dy * dy; // Используем квадрат расстояния - быстрее
            
            // Минимальное расстояние между центрами шайб (диаметр шайбы)
            if (distanceSq < minDistanceSq && distanceSq > 0) {
              const distance = Math.sqrt(distanceSq); // Вычисляем sqrt только при коллизии
              const angle = Math.atan2(dy, dx);
              
              // Логирование столкновений отключено для производительности (вызывается очень часто!)
              // if (Platform.OS === 'ios' && __DEV__) {
              //   console.log('💥 [PUCK PHYSICS] Collision detected:', {...});
              // }
              
               // Коррекция позиции: отталкиваем на безопасное расстояние (как в Expo Go)
               // Уменьшаем коэффициент коррекции для соответствия Expo Go
               const correctionDistance = (minDistance - distance) * 0.5; // Уменьшено с 1.15 до 0.5 для соответствия Expo Go
              newX += Math.cos(angle) * correctionDistance;
              newY += Math.sin(angle) * correctionDistance;
              
              // Физика отталкивания - настройки для соответствия Expo Go
              const overlap = minDistance - distance;
              // Уменьшаем силу отталкивания для соответствия Expo Go
              const pushForce = overlap * (Platform.OS === 'ios' ? 0.3 : ((Platform.OS === 'android' || Platform.OS === 'web') ? 0.2 : 0.25));
              
              // Оптимизированная передача импульса - баланс между реализмом и производительностью
              const currentSpeedSq = pos.vx * pos.vx + pos.vy * pos.vy;
              const otherSpeedSq = otherPos.vx * otherPos.vx + otherPos.vy * otherPos.vy;
              
              // Передаем импульс только если скорости достаточно высокие (быстрая проверка)
              if (currentSpeedSq > 0.09 || otherSpeedSq > 0.09) { // 0.3^2 = 0.09
                const currentSpeed = Math.sqrt(currentSpeedSq);
                const otherSpeed = Math.sqrt(otherSpeedSq);
                const combinedSpeed = (currentSpeed + otherSpeed) * 0.5;
                const impulseTransfer = Math.min(combinedSpeed * 0.55, 3.5); // Восстановлено для более плавной физики
                const impulseX = Math.cos(angle) * impulseTransfer;
                const impulseY = Math.sin(angle) * impulseTransfer;
                
                // Сбалансированная передача импульса
                const speedFactor = currentSpeed > otherSpeed ? 1.15 : 0.85;
                velocityChanges[otherIndex].dvx += impulseX * speedFactor;
                velocityChanges[otherIndex].dvy += impulseY * speedFactor;
              }
              
              // Текущая шайба отталкивается от другой с усилением при столкновении
              newVx += Math.cos(angle) * pushForce;
              newVy += Math.sin(angle) * pushForce;
              
              // Другая шайба отталкивается от текущей с той же силой
              velocityChanges[otherIndex].dvx -= Math.cos(angle) * pushForce;
              velocityChanges[otherIndex].dvy -= Math.sin(angle) * pushForce;
              
              // Отмечаем столкновение для вибрации только если это шайба пользователя
              if (currentUserId && pos.id === currentUserId) {
                collisionDetectedRef.current = true;
              }
            }
          });
          
          // Применяем изменения скорости от коллизий ПЕРЕД ограничениями
          // Упрощенная обработка коллизий для лучшей производительности
          const hasCollision = velocityChanges[posIndex].dvx !== 0 || velocityChanges[posIndex].dvy !== 0;
          if (hasCollision) {
            // Убрано дополнительное ускорение - экономит вычисления и улучшает стабильность
            // newVx и newVy уже имеют изменения от velocityChanges
          }
          
          newVx += velocityChanges[posIndex].dvx;
          newVy += velocityChanges[posIndex].dvy;
          
              // Адаптивные ограничения скорости в зависимости от производительности устройства
          // Оптимизировано для плавности и производительности
          // ВАЖНО: maxSpeed уже объявлен выше, только переопределяем значение
          let minSpeed;
          if (Platform.OS === 'ios') {
            // Оптимизированные скорости для iOS - баланс между плавностью и производительностью
            maxSpeed = 4.5; // Восстановлено для более плавного движения
            minSpeed = 0.7; // Восстановлено
          } else if (Platform.OS === 'web') {
            maxSpeed = 5.5;
            minSpeed = 0.8;
          } else if (Platform.OS === 'android') {
            const performanceLevel = getAndroidPerformanceLevel();
            switch (performanceLevel) {
              case 'high':
                maxSpeed = 4.0; // Восстановлено для плавности
                minSpeed = 0.6;
                break;
              case 'medium':
                maxSpeed = 2.5; // Восстановлено
                minSpeed = 0.4;
                break;
              case 'low':
              default:
                maxSpeed = 1.5; // Восстановлено
                minSpeed = 0.3;
                break;
            }
          } else {
            maxSpeed = 4.5;
            minSpeed = 0.7;
          }

          // Ограничиваем скорость ПОСЛЕ применения всех изменений
          const speedAfterCollisions = Math.sqrt(newVx * newVx + newVy * newVy);
          if (speedAfterCollisions > maxSpeed) {
            newVx = (newVx / speedAfterCollisions) * maxSpeed;
            newVy = (newVy / speedAfterCollisions) * maxSpeed;
          }
          
          // Минимальная скорость для предотвращения остановки - применяем всегда
          if (currentSpeed < minSpeed) {
            const angle = Math.random() * 2 * Math.PI;
            newVx = Math.cos(angle) * minSpeed;
            newVy = Math.sin(angle) * minSpeed;
          }
          
          // КРИТИЧЕСКИ ВАЖНО: Проверка границ ПОСЛЕ всех столкновений между шайбами
          // Столкновения могут сдвинуть шайбу за границы, поэтому проверяем еще раз
          if (newX < boundaries.leftOffset + puckRadius) {
            newX = boundaries.leftOffset + puckRadius;
            newVx = Math.abs(newVx) * bounceMultiplier; // Отскок вправо (положительная скорость)
          } else if (newX > wallMaxX) {
            newX = wallMaxX;
            newVx = -Math.abs(newVx) * bounceMultiplier; // Отскок влево (отрицательная скорость)
          }

          if (newY < boundaries.topOffset + puckRadius) {
            newY = boundaries.topOffset + puckRadius;
            newVy = Math.abs(newVy) * bounceMultiplier; // Отскок вниз (положительная скорость)
          } else if (newY > wallMaxY) {
            newY = wallMaxY;
            newVy = -Math.abs(newVy) * bounceMultiplier; // Отскок вверх (отрицательная скорость)
          }
          
          // Финальная проверка на всякий случай - ГАРАНТИРУЕМ что позиция в пределах границ
          const beforeFinalCheck = { x: newX, y: newY };
          
          // КРИТИЧНО: Если позиция все еще за границами, принудительно корректируем
          // и исправляем направление скорости с учетом радиуса шайбы

          if (newX < boundaries.leftOffset + puckRadius) {
            newX = boundaries.leftOffset + puckRadius;
            newVx = Math.abs(newVx) * bounceMultiplier; // Отскок вправо
          } else if (newX > wallMaxX - puckRadius) {
            newX = wallMaxX - puckRadius;
            newVx = -Math.abs(newVx) * bounceMultiplier; // Отскок влево
          }

          if (newY < boundaries.topOffset + puckRadius) {
            newY = boundaries.topOffset + puckRadius;
            newVy = Math.abs(newVy) * bounceMultiplier; // Отскок вниз
          } else if (newY > wallMaxY - puckRadius) {
            newY = wallMaxY - puckRadius;
            newVy = -Math.abs(newVy) * bounceMultiplier; // Отскок вверх
          }
          
          // Дополнительная гарантия - принудительное ограничение с учетом радиуса
          newX = Math.max(boundaries.leftOffset + puckRadius, Math.min(wallMaxX, newX));
          newY = Math.max(boundaries.topOffset + puckRadius, Math.min(wallMaxY, newY));
          
          // КРИТИЧНО: Ограничиваем скорость ПОСЛЕ отскока от стен
          // Это предотвращает превышение maxSpeed после bounceMultiplier
          const speedAfterBounce = Math.sqrt(newVx * newVx + newVy * newVy);
          if (speedAfterBounce > maxSpeed) {
            newVx = (newVx / speedAfterBounce) * maxSpeed;
            newVy = (newVy / speedAfterBounce) * maxSpeed;
          }
          
          // СТРОГАЯ проверка после финальной коррекции - если все еще за границами, это критическая ошибка
          const stillOutOfBoundsFinal = newX < boundaries.leftOffset + puckRadius ||
                                 newX > wallMaxX - puckRadius ||
                                 newY < boundaries.topOffset + puckRadius ||
                                 newY > wallMaxY - puckRadius;
          if (stillOutOfBoundsFinal) {
            // Принудительная коррекция - это последняя линия защиты (без логирования для производительности)
            newX = Math.max(boundaries.leftOffset + puckRadius, Math.min(wallMaxX - puckRadius, newX));
            newY = Math.max(boundaries.topOffset + puckRadius, Math.min(wallMaxY - puckRadius, newY));
          }
          
          // Логирование финальной проверки отключено для производительности
          // if (Platform.OS === 'ios' && __DEV__ && !stillOutOfBounds) {
          //   const afterFinalCheck = { x: newX, y: newY };
          //   if (beforeFinalCheck.x !== afterFinalCheck.x || beforeFinalCheck.y !== afterFinalCheck.y) {
          //     console.log('✅ [PUCK PHYSICS] Final check corrected position:', {...});
          //   }
          // }
          
          // АБСОЛЮТНАЯ ЗАЩИТА: Финальная принудительная коррекция перед возвратом
          // Гарантируем что шайба НИКОГДА не выйдет за границы экрана
          if (newX < boundaries.leftOffset + puckRadius) {
            newX = boundaries.leftOffset + puckRadius;
          } else if (newX > wallMaxX) {
            newX = wallMaxX;
          }

          if (newY < boundaries.topOffset + puckRadius) {
            newY = boundaries.topOffset + puckRadius;
          } else if (newY > wallMaxY) {
            newY = wallMaxY;
          }
          
          return {
            ...pos,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy
          };
        });
      });
        
        // Вызываем вибрацию если было столкновение (с дебаунсом) и мы на главном экране
        if (collisionDetectedRef.current && currentScreen === 'index' && (Platform.OS === 'ios' || Platform.OS === 'android')) {
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
          collisionDetectedRef.current = false;
        }
    }, getOptimalFrameRate()); // Адаптивная частота обновления в зависимости от производительности устройства

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
      if (startDelayRef.current) {
        clearTimeout(startDelayRef.current);
      }
    };
  }, [puckPositions.length, boundaries.leftOffset, boundaries.rightOffset, boundaries.topOffset, boundaries.bottomOffset, width, height, puckSize, currentScreen, animationRestartTrigger]);

  // Обработчик AppState для перезапуска анимации при возврате из фона
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && currentScreen === 'index' && puckPositions.length > 0) {
        // Приложение вернулось из фона - перезапускаем анимацию немедленно
        // Очищаем старый интервал, если он есть
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current);
          animationIntervalRef.current = null;
        }
        
        // Устанавливаем флаг принудительного перезапуска
        // Это заставит основной useEffect перезапустить анимацию
        setAnimationRestartTrigger(Date.now());
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [puckPositions.length, currentScreen]);

  // Функция для обновления позиции и скорости конкретной шайбы (для drag)
  const updatePuckPosition = useCallback((id: string, x: number, y: number, vx: number, vy: number, isDragging: boolean = true) => {
    setPuckPositions(currentPositions => {
      // Оптимизация: проверяем коллизии только с близкими шайбами
      let adjustedX = x;
      let adjustedY = y;
      const updatedPositions = [...currentPositions];
      
      // Предварительно вычисляем значения для оптимизации
      const minDistance = puckSize;
      const minDistanceSq = minDistance * minDistance;
      const dragSpeedSq = vx * vx + vy * vy;
      const dragSpeed = dragSpeedSq > 0 ? Math.sqrt(dragSpeedSq) : 0;
      
      // Базовые коэффициенты (вычисляем один раз)
      const basePushStrength = Platform.OS === 'ios' ? 0.6 : (Platform.OS === 'android' ? 0.5 : 0.65);
      const speedFactor = dragSpeed > 0 ? Math.min(dragSpeed / 2.0, 2.0) : 0;
      const dynamicPushStrength = basePushStrength * (0.5 + speedFactor * 0.5);
      
      currentPositions.forEach((otherPos, index) => {
        if (otherPos.id === id || otherPos.isDragging) return; // Пропускаем перетаскиваемые шайбы
        
        const dx = adjustedX - otherPos.x;
        const dy = adjustedY - otherPos.y;
        const distanceSq = dx * dx + dy * dy; // Используем квадрат расстояния - быстрее
        
        // Быстрая проверка: если шайба слишком далеко, пропускаем
        const maxCheckDistanceSq = isDragging ? minDistanceSq : (minDistance * 1.5) ** 2;
        if (distanceSq > maxCheckDistanceSq || distanceSq === 0) return;
        
        // Только теперь вычисляем sqrt для точного расчета
        const distance = Math.sqrt(distanceSq);
        
        if (distance < minDistance) {
          // Столкновение обнаружено
          const angle = Math.atan2(dy, dx);
          
          // Агрессивная коррекция: отталкиваем перетаскиваемую шайбу
          const correctionDistance = (minDistance - distance) * 1.2;
          adjustedX += Math.cos(angle) * correctionDistance;
          adjustedY += Math.sin(angle) * correctionDistance;
          
          // Передаем импульс при столкновении
          if (dragSpeed > 0.3) {
            const pushAngle = angle + Math.PI; // Инвертируем направление
            const pushVx = Math.cos(pushAngle) * dragSpeed * dynamicPushStrength;
            const pushVy = Math.sin(pushAngle) * dragSpeed * dynamicPushStrength;
            
            updatedPositions[index] = {
              ...otherPos,
              vx: otherPos.vx + pushVx,
              vy: otherPos.vy + pushVy
            };
          }
        } else if (!isDragging && dragSpeed > 0.5) {
          // При отпускании: передаем небольшой импульс близким шайбам
          const proximityFactor = 1.0 - (distance - minDistance) / (minDistance * 0.5);
          
          if (proximityFactor > 0) {
            const basePushStrengthProx = Platform.OS === 'ios' ? 0.4 : (Platform.OS === 'android' ? 0.35 : 0.45);
            const dynamicPushStrengthProx = basePushStrengthProx * (0.5 + speedFactor * 0.5) * proximityFactor;
            
            const pushAngle = Math.atan2(dy, dx) + Math.PI;
            const pushVx = Math.cos(pushAngle) * dragSpeed * dynamicPushStrengthProx;
            const pushVy = Math.sin(pushAngle) * dragSpeed * dynamicPushStrengthProx;
            
            updatedPositions[index] = {
              ...otherPos,
              vx: otherPos.vx + pushVx,
              vy: otherPos.vy + pushVy
            };
          }
        }
      });
      
      return updatedPositions.map(pos => 
        pos.id === id ? { ...pos, x: adjustedX, y: adjustedY, vx, vy, isDragging } : pos
      );
    });
  }, [puckSize, currentUserId]);

  return { puckPositions, puckSize, updatePuckPosition, getAndroidPerformanceLevel };
};

const PuckAnimator = ({ player, position, onNav, onDrag, getAndroidPerformanceLevel }: { 
  player: Player; 
  position: PuckPosition; 
  onNav: () => void; 
  onDrag?: (id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => void;
  getAndroidPerformanceLevel: () => 'high' | 'medium' | 'low';
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, pageX: 0, pageY: 0, time: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const dragVelocityRef = useRef({ vx: 0, vy: 0 });
  const lastVelocityRef = useRef({ vx: 0, vy: 0 }); // Последняя скорость для использования при отпускании
  const dragHistoryRef = useRef<{x: number, y: number, time: number}[]>([]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: position.x },
        { translateY: position.y }
      ]
    };
  }, [position.x, position.y]);

  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent;
    dragStartRef.current = {
      x: touch.pageX - position.x,
      y: touch.pageY - position.y,
      pageX: touch.pageX,
      pageY: touch.pageY,
      time: Date.now()
    };
    lastPositionRef.current = { x: position.x, y: position.y };
    hasDraggedRef.current = false;
    dragVelocityRef.current = { vx: 0, vy: 0 };
    lastVelocityRef.current = { vx: 0, vy: 0 }; // Сбрасываем последнюю скорость
    dragHistoryRef.current = []; // Очищаем историю
    setIsDragging(true);
    
    // Таймаут отключен - можно держать шайбу сколько угодно
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging || !onDrag) return;
    
    const touch = e.nativeEvent;
    const now = Date.now();
    
    // Адаптивный throttling в зависимости от производительности устройства
    // Увеличиваем интервал для лучшей производительности при перетаскивании
    const throttleInterval = Platform.OS === 'android' ? 
      (getAndroidPerformanceLevel() === 'high' ? 20 : 
       getAndroidPerformanceLevel() === 'medium' ? 25 : 40) : 20;
    
    if (now - lastUpdateTimeRef.current < throttleInterval) {
      return;
    }
    lastUpdateTimeRef.current = now;
    
    // Проверяем, что палец сдвинулся достаточно для drag (минимум 5 пикселей)
    const dx = touch.pageX - dragStartRef.current.pageX;
    const dy = touch.pageY - dragStartRef.current.pageY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (!hasDraggedRef.current && distance < 5) {
      return; // Слишком маленькое движение - это tap, а не drag
    }
    
    hasDraggedRef.current = true;
    
    const newX = touch.pageX - dragStartRef.current.x;
    const newY = touch.pageY - dragStartRef.current.y;
    
    // Вычисляем скорость на основе изменения позиции для толчка других шайб
    // Восстановлены коэффициенты для более отзывчивого движения
    let speedMultiplier;
    if (Platform.OS === 'android') {
      const performanceLevel = getAndroidPerformanceLevel();
      switch (performanceLevel) {
        case 'high':
          speedMultiplier = 1.0; // Восстановлено для отзывчивости
          break;
        case 'medium':
          speedMultiplier = 0.9; // Восстановлено
          break;
        case 'low':
        default:
          speedMultiplier = 0.8; // Восстановлено
          break;
      }
    } else {
      speedMultiplier = 1.0; // Восстановлено для iOS - полная отзывчивость
    }
    const vx = (newX - lastPositionRef.current.x) * speedMultiplier;
    const vy = (newY - lastPositionRef.current.y) * speedMultiplier;
    
    // Сохраняем последнюю скорость для использования при отпускании
    lastVelocityRef.current = { vx, vy };
    
    // Накапливаем скорость для финального импульса (для совместимости, но не используем)
    dragVelocityRef.current.vx += vx;
    dragVelocityRef.current.vy += vy;
    
    // Записываем историю движения (последние 5 точек)
    dragHistoryRef.current.push({ x: newX, y: newY, time: now });
    if (dragHistoryRef.current.length > 5) {
      dragHistoryRef.current.shift(); // Удаляем старые точки
    }
    
    lastPositionRef.current = { x: newX, y: newY };
    onDrag(position.id, newX, newY, vx, vy, true);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Используем последнюю скорость движения для финального импульса
    if (onDrag) {
      // Применяем множитель импульса к последней скорости
      let impulseMultiplier;
      if (Platform.OS === 'android') {
        const performanceLevel = getAndroidPerformanceLevel();
        switch (performanceLevel) {
          case 'high':
            impulseMultiplier = 0.7;
            break;
          case 'medium':
            impulseMultiplier = 0.6;
            break;
          case 'low':
          default:
            impulseMultiplier = 0.5;
            break;
        }
      } else {
        impulseMultiplier = 0.7; // iOS - более сильный импульс
      }
      
      // Используем последнюю сохраненную скорость (правильное направление)
      const finalVx = lastVelocityRef.current.vx * impulseMultiplier;
      const finalVy = lastVelocityRef.current.vy * impulseMultiplier;
      
      onDrag(position.id, position.x, position.y, finalVx, finalVy, false);
    }
    
    // Сбрасываем накопленную скорость и историю
    dragVelocityRef.current = { vx: 0, vy: 0 };
    lastVelocityRef.current = { vx: 0, vy: 0 };
    dragHistoryRef.current = [];
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
          onPress={hasDraggedRef.current ? () => {} : onNav}
          animatedStyle={animatedStyle}
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
        isOnline={player.isOnline}
        />
      </Suspense>
    </Animated.View>
  );
};

const iceBg = require('../assets/images/led.jpg');

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser, setCurrentUser, refreshUser } = useUser();
  const params = useLocalSearchParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const { selectedCountry, setSelectedCountry, showCountryFilter, setShowCountryFilter } = useCountryFilter();
  const { selectedYear, setSelectedYear, showYearFilter, setShowYearFilter } = useYearFilter();

  // Состояние для управления годами рождения
  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  const birthYears = useMemo(() => {
    const years: number[] = [];
    for (let year = 2019; year >= 2008; year--) {
      years.push(year);
    }
    return years;
  }, []);

  // Группировка игроков по годам рождения
  const playersByYear = useMemo(() => {
    const grouped: Record<number, Player[]> = {};
    
    // Инициализируем все годы
    birthYears.forEach((year: number) => {
      grouped[year] = [];
    });
    
    // Группируем игроков по годам рождения
    players.forEach(player => {
      if (player.birthDate) {
        try {
          // Парсим дату рождения (формат: YYYY-MM-DD из базы данных)
          if (/^\d{4}-\d{2}-\d{2}$/.test(player.birthDate)) {
            const birthYear = parseInt(player.birthDate.split('-')[0]);
            if (birthYear >= 2008 && birthYear <= 2019) {
              if (!grouped[birthYear]) {
                grouped[birthYear] = [];
              }
              grouped[birthYear].push(player);
            }
          }
          // Также поддерживаем старый формат DD.MM.YYYY для обратной совместимости
          else if (player.birthDate.includes('.')) {
            const parts = player.birthDate.split('.');
            if (parts.length === 3) {
              const birthYear = parseInt(parts[2]);
              if (birthYear >= 2008 && birthYear <= 2019) {
                if (!grouped[birthYear]) {
                  grouped[birthYear] = [];
                }
                grouped[birthYear].push(player);
              }
            }
          }
        } catch (error) {
          console.error('Ошибка парсинга даты рождения:', error);
        }
      } else {
      }
    });
    
    // Выводим статистику по группам
    Object.keys(grouped).forEach(year => {
      const yearNum = parseInt(year);
      if (grouped[yearNum].length > 0) {
      }
    });
    
    return grouped;
  }, [players, birthYears]);



  // Ключ для перегенерации случайной части выборки
  const [shuffleKey, setShuffleKey] = useState(0);

  // Умный отбор игроков с ограничением количества
  const allVisiblePlayers = useMemo(() => {
    const selected = getSmartPlayerSelection(
      players, 
      currentUser?.id,
      selectedCountry || undefined,
      selectedYear || undefined,
      shuffleKey // Передаем shuffleKey как seed для детерминированного рандома
    );
    return selected;
  }, [players, currentUser?.id, selectedCountry, selectedYear, shuffleKey]);

  // Автоматическое обновление рандомных участников каждый час
  useEffect(() => {
    const ONE_HOUR_MS = 60 * 60 * 1000; // 1 час в миллисекундах
    
    // Устанавливаем интервал для автоматического обновления
    const autoUpdateInterval = setInterval(() => {
      console.log('🔄 Автоматическое обновление рандомных участников (каждый час)');
      setShuffleKey(prev => prev + 1);
    }, ONE_HOUR_MS);
    
    return () => {
      clearInterval(autoUpdateInterval);
    };
  }, []);

  // Детектор тряски: «потряси, чтобы обновить рандомных игроков»
  useEffect(() => {
    let lastShakeTs = 0;
    let subscription: any;

    const SHAKE_THRESHOLD = 2.2; // сила тряски
    const SHAKE_DEBOUNCE_MS = 1200; // защита от повторов

    (async () => {
      try {
        // @ts-ignore: optional dependency at runtime, types may be missing in dev env
        const sensors: any = await import('expo-sensors');
        const Accelerometer = sensors?.Accelerometer;
        if (!Accelerometer) return;
        Accelerometer.setUpdateInterval(100);
        subscription = Accelerometer.addListener(({ x, y, z }: any) => {
          const magnitude = Math.abs(x) + Math.abs(y) + Math.abs(z);
          const now = Date.now();
          if (magnitude > SHAKE_THRESHOLD && now - lastShakeTs > SHAKE_DEBOUNCE_MS) {
            lastShakeTs = now;
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setShuffleKey(prev => prev + 1);
          }
        });
      } catch {}
    })();

    return () => {
      try { subscription && subscription.remove && subscription.remove(); } catch {}
    };
  }, []);

  // Автоматически сбрасываем фильтр по годам, если в выбранной стране нет игроков указанного года
  useEffect(() => {
    if (selectedCountry && selectedYear && players.length > 0) {
      const hasPlayersInYear = players.some(player => {
        if (player.country === selectedCountry && player.birthDate) {
          try {
            // Парсим дату рождения (формат: YYYY-MM-DD из базы данных)
            if (/^\d{4}-\d{2}-\d{2}$/.test(player.birthDate)) {
              const birthYear = parseInt(player.birthDate.split('-')[0]);
              return birthYear === selectedYear;
            }
            // Также поддерживаем старый формат DD.MM.YYYY для обратной совместимости
            else if (player.birthDate.includes('.')) {
              const parts = player.birthDate.split('.');
              if (parts.length === 3) {
                const birthYear = parseInt(parts[2]);
                return birthYear === selectedYear;
              }
            }
          } catch (error) {
            console.error('Ошибка парсинга даты рождения:', error);
          }
        }
        return false;
      });
      
      if (!hasPlayersInYear) {
        setSelectedYear(null);
      }
    }
  }, [selectedCountry, selectedYear, players.length]); // Зависим только от длины массива игроков, а не от самого массива

  // Auto-detect country on first load if not already selected
  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        if (selectedCountry) return;
        const code = await detectCountryFromIP();
        if (code && mounted) {
          const countryName = countryCodeToCountryName(code) ?? code;
          if (countryName) {
            setSelectedCountry(countryName);
          }
        }
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [selectedCountry, setSelectedCountry]);



  const { isMainScreen, currentScreen } = useScreenContext();
  const { puckPositions = [], puckSize, updatePuckPosition, getAndroidPerformanceLevel } = usePuckCollisionSystem(allVisiblePlayers, currentUser?.id, currentScreen || undefined);
  
  // Отладочная функция для проверки состояния экрана
  // Функция отладки отключена




  const refreshPlayers = useCallback(async (forceRefresh = false) => {
    try {
      let loadedPlayers: Player[];
      
      if (forceRefresh) {
        // Принудительная загрузка без кэша
        loadedPlayers = await loadPlayers();
        // Обновляем кэш с новыми данными
        dataCache.set(CACHE_KEYS.PLAYERS, loadedPlayers, 5 * 60 * 1000);
      } else {
        // Используем кеширование для загрузки игроков
        loadedPlayers = await dataCache.getOrLoad(
          CACHE_KEYS.PLAYERS,
          () => loadPlayers(),
          5 * 60 * 1000 // 5 минут
        );
      }
      
      setPlayers(loadedPlayers);
      
    } catch (error) {
      console.error('❌ Ошибка обновления игроков:', error);
    }
  }, []);

  const checkForNewUser = useCallback(async () => {
    try {
      const user = await loadCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('❌ Ошибка загрузки пользователя:', error);
    }
  }, []);

  // Функция инициализации приложения
  const initializeApp = useCallback(async () => {
    try {
      // Принудительно применяем шрифт Gilroy
      forceGilroyFont();
      
      setLoading(true);
      setImageLoaded(false); // Сбрасываем флаг загрузки изображения
      
      // Используем кеширование для быстрой загрузки
      const [loadedPlayers, user] = await Promise.all([
        dataCache.getOrLoad(
          CACHE_KEYS.PLAYERS,
          () => loadPlayers(),
          5 * 60 * 1000 // 5 минут
        ),
        dataCache.getOrLoad(
          CACHE_KEYS.USER_PROFILE,
          () => loadCurrentUser(),
          2 * 60 * 1000 // 2 минуты
        )
      ]);
      
      // Предзагружаем дополнительные данные пользователя в фоне
      if (user?.id) {
        import('../utils/playerStorage').then(({ preloadUserData }) => 
          preloadUserData(user.id).catch(err => 
            console.warn('⚠️ Предзагрузка данных пользователя не удалась:', err)
          )
        );
      }
      
      setPlayers(loadedPlayers);
      setCurrentUser(user);
      
      // Предзагружаем аватары всех игроков для мгновенного отображения в профилях
      import('../utils/AvatarCache').then(({ avatarCache }) => {
        avatarCache.preloadPlayerAvatars(loadedPlayers).catch(err => 
          console.warn('⚠️ Предзагрузка аватаров не удалась:', err)
        );
      });
      
      // Устанавливаем значения по умолчанию только если они не установлены
      if (!selectedCountry) {
        if (user?.country) {
          setSelectedCountry(user.country);
        } else {
          setSelectedCountry('Беларусь');
        }
      }
      
      if (!selectedYear) {
        if (user?.birthDate) {
          try {
            if (/^\d{4}-\d{2}-\d{2}$/.test(user.birthDate)) {
              const birthYear = parseInt(user.birthDate.split('-')[0]);
              if (birthYear >= 2008 && birthYear <= 2019) {
                setSelectedYear(birthYear);
              } else {
                setSelectedYear(2012);
              }
            } else if (user.birthDate.includes('.')) {
              const parts = user.birthDate.split('.');
              if (parts.length === 3) {
                const birthYear = parseInt(parts[2]);
                if (birthYear >= 2008 && birthYear <= 2019) {
                  setSelectedYear(birthYear);
                } else {
                  setSelectedYear(2012);
                }
              }
            }
          } catch (error) {
            console.error('Ошибка парсинга даты рождения пользователя:', error);
            setSelectedYear(2012);
          }
        } else {
          setSelectedYear(2012);
        }
      }
      
      setImageLoaded(true);
      setLoading(false);
    } catch (error) {
      console.error('❌ Ошибка инициализации приложения:', error);
      setLoading(false);
    }
  }, []); // Убираем зависимости, чтобы избежать циклов

  // Отслеживание подключения к интернету
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected ?? false);
      setIsCheckingConnection(false);
      
      // Если подключение восстановлено и были загружены игроки - перезагружаем данные
      if (connected && !loading && players.length === 0) {
        setLoading(true);
        initializeApp();
      }
    });

    return () => unsubscribe();
  }, [players.length, loading]);

  useEffect(() => {
    initializeApp();
  }, []); // Запускаем только один раз при монтировании

  // Функция для принудительного обновления игроков
  const forceRefreshPlayers = useCallback(async () => {
    // Принудительно инвалидируем кэш перед обновлением
    dataCache.invalidate(CACHE_KEYS.PLAYERS);
    // Очищаем AsyncStorage кэш всех игроков
    await clearAllPlayersCache();
    // Принудительно обновляем данные без использования кэша
    const loadedPlayers = await loadPlayers(true); // forceRefresh = true
    setPlayers(loadedPlayers);
    checkForNewUser();
  }, []);

  const lastRefreshTimeRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      // Устанавливаем, что мы на главном экране
      setCurrentScreen('index');
      
      // Если есть параметр refresh или прошло больше 2 секунд с последнего обновления - обновляем
      const now = Date.now();
      const shouldRefresh = params.refresh || (now - lastRefreshTimeRef.current > 2000);
      
      if (shouldRefresh) {
        lastRefreshTimeRef.current = now;
        forceRefreshPlayers().then(() => {
          // Очищаем параметр refresh после использования
          if (params.refresh) {
            setTimeout(() => {
              router.setParams({ refresh: undefined });
            }, 100);
          }
        });
      }
      
      // Возвращаем функцию очистки
      return () => {
        setCurrentScreen(null);
      };
    }, [setCurrentScreen, params.refresh, forceRefreshPlayers, router])
  );

  // Отдельный useEffect для обработки параметра refresh (работает даже если мы уже на главном экране)
  useEffect(() => {
    if (params.refresh) {
      forceRefreshPlayers().then(() => {
        // Очищаем параметр refresh после использования
        setTimeout(() => {
          router.setParams({ refresh: undefined });
        }, 100);
      });
    }
  }, [params.refresh, forceRefreshPlayers, router]);

  // Убираем частую проверку обновлений данных - только при необходимости
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     refreshPlayers();
  //   }, 10000);
  //   return () => clearInterval(interval);
  // }, [refreshPlayers]);

  // Проверяем пользователя реже
  useEffect(() => {
    const interval = setInterval(() => {
      checkForNewUser();
    }, 300000); // 5 минут

    return () => clearInterval(interval);
  }, [checkForNewUser]);

  // Сбрасываем состояние dropdown фильтров при загрузке или когда игроков нет
  useEffect(() => {
    if (loading || players.length === 0) {
      setShowCountryFilter(false);
      setShowYearFilter(false);
    }
  }, [loading, players.length, setShowCountryFilter, setShowYearFilter]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground 
          source={iceBg} 
          style={styles.hockeyRink} 
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
        >
          {imageLoaded && <View style={[styles.innerBorder, { pointerEvents: 'none' }]} />}
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('home.loadingPlayers')}</Text>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={iceBg} 
        style={styles.hockeyRink} 
        resizeMode="cover"
        onLoad={() => setImageLoaded(true)}
      >
        {/* Внутренняя граница */}
        <View style={[styles.innerBorder, { pointerEvents: 'none' }]} />

        {/* Фильтры - показываем только когда данные загружены */}
        {players.length > 0 && (
        <View style={styles.filtersWrapper}>
        <View style={styles.filtersContainer}>
          <CountryFilter players={players} />
          <YearFilter players={players} />
        </View>
        </View>
        )}


        {/* Показываем сообщение, если нет подключения к интернету */}
        {!isConnected && !isCheckingConnection && (
          <View style={styles.noPlayersContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color="#fa2f40" style={{ marginBottom: 10 }} />
            <Text style={styles.noPlayersText}>
              {t('home.waitingForConnection') || 'Ожидание подключения'}
            </Text>
            <Text style={styles.noPlayersSubtext}>
              {t('home.checkInternetConnection') || 'Проверьте подключение к интернету'}
            </Text>
          </View>
        )}

        {/* Показываем сообщение, если нет игроков по выбранным фильтрам */}
        {isConnected && allVisiblePlayers.length === 0 && (selectedCountry || selectedYear) && (
          <View style={styles.noPlayersContainer}>
            <Text style={styles.noPlayersText}>
              {selectedCountry && selectedYear 
                ? t('home.noPlayersCountryYear', { country: selectedCountry, year: selectedYear })
                : selectedCountry 
                  ? t('home.noPlayersCountry', { country: selectedCountry })
                  : t('home.noPlayersYear', { year: selectedYear })
              }
            </Text>
            <Text style={styles.noPlayersSubtext}>
              {t('home.iceEmpty')}
            </Text>
          </View>
        )}

        {puckPositions.map((position) => {
          const player = allVisiblePlayers.find(p => p.id === position.id);
          if (!player) return null;
          
          return (
            <PuckAnimator
              key={player.id}
              player={player}
              position={position}
              onNav={() => {
                if (currentUser) {
                  router.push({ pathname: '/player/[id]', params: { id: player.id } });
                } else {
                  setShowAuthModal(true);
                }
              }}
              onDrag={updatePuckPosition}
              getAndroidPerformanceLevel={getAndroidPerformanceLevel}
            />
          );
        })}

        <Modal
          visible={showAuthModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAuthModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('auth.required')}</Text>
              <Text style={styles.modalMessage}>
                {t('auth.loginRequired')}
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalButton} 
                  onPress={() => {
                    setShowAuthModal(false);
                    router.push('/login');
                  }}
                >
                  <Ionicons name="log-in" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>{t('auth.login')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonSecondary]} 
                  onPress={() => setShowAuthModal(false)}
                >
                  <Text style={styles.modalButtonTextSecondary}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
    overflow: 'hidden', // Добавляем overflow: hidden
  },
  hockeyRink: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 50,
    overflow: 'hidden',
    // Убираем border
    // borderWidth: 6,
    // borderColor: 'rgba(102, 102, 102, 0.5)',
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 42,
    borderWidth: 1, // Толщина 1 пиксель
    borderColor: 'rgba(255, 255, 255, 1)', // Полностью белый, без прозрачности
  },
  logoPuckContainer: {
    position: 'absolute',
    top: 0,
    left: width / 2 - 100,
    zIndex: 1000,
  },
  logoPuck: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgb(1,0,0)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fa2f40',
    boxShadow: '0 8px 8px rgba(1, 0, 0, 0.4)',
    elevation: 12,
  },
  logoImage: {
    width: 160,
    height: 160,
  },
  logoImageContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminPuckContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    backgroundColor: '#fa2f40',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 8,
  },
  modalButtonTextSecondary: {
    color: '#fa2f40',
  },


  noPlayersContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -150,
    marginTop: -50,
    backgroundColor: 'rgba(1, 0, 0, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 25,
    paddingVertical: 20,
    alignItems: 'center',
    zIndex: 10,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 6px rgba(1, 0, 0, 0.3)',
    elevation: 6,
  },
  noPlayersText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginBottom: 8,
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  noPlayersSubtext: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 1,
  },

  puckContainer: {
    position: 'absolute',
  },

  filtersWrapper: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8, // Уменьшаем отступ между фильтрами
  },
  // Стили кнопки отладки удалены
  filterButton: {
    // Удалено
  },
  filterButtonText: {
    // Удалено
  },
  filterButtonIcon: {
    // Удалено
  },
  filtersHint: {
    // Удалено
  },
  filtersHintText: {
    // Удалено
  },
  filtersHintSubtext: {
    // Удалено
  },



});
