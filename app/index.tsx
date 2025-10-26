
import '../utils/logSilencer';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { Suspense, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Dimensions,
  ImageBackground,
  Modal,
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
import CountryFilter from '../components/CountryFilter';
import YearFilter from '../components/YearFilter';
import { useCountryFilter } from '../utils/CountryFilterContext';
import { useYearFilter } from '../utils/YearFilterContext';
import { countryCodeToCountryName, detectCountryFromIP } from '../utils/countryUtils';
import { Player, checkDatabaseStatus, fixCorruptedData, initializeStorage, loadCurrentUser, loadPlayers } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { useScreenContext } from '../contexts/ScreenContext';
import { useUser } from '../contexts/UserContext';
import NetInfo from '@react-native-community/netinfo';
import { forceGilroyFont } from '../utils/forceGilroyFont';
import { dataCache, CACHE_KEYS } from '../utils/DataCache';
// Lazy load Puck component to improve initial render performance
const Puck = React.lazy(() => import('../components/Puck'));

const { width, height } = Dimensions.get('window');

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
  const puckSize = 70; // Размер шайбы
  const [puckPositions, setPuckPositions] = useState<PuckPosition[]>([]);
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousLengthRef = useRef<number>(0);
  const lastHapticTimeRef = useRef<number>(0);
  const collisionDetectedRef = useRef<boolean>(false);
  
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
  const getOptimalFrameRate = useCallback(() => {
    if (Platform.OS === 'ios') {
      return 8; // 120 FPS для iOS
    } else if (Platform.OS === 'web') {
      return 16; // 60 FPS для Web
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
    if (Platform.OS === 'ios') {
      // Для iPhone используем границы от самых краев экрана (льда)
      return {
        leftOffset: 5,
        topOffset: 5,
        rightOffset: 5,
        bottomOffset: 218 // Уменьшено на 7px чтобы шайбы долетали до нижней границы
      };
    } else if (Platform.OS === 'web') {
      // Для Web используем более строгие границы
      const webRightOffset = Math.max(300, width * 0.35);
      const webBottomOffset = Math.max(450, height * 0.45);
      const boundaries = {
        leftOffset: 20,
        topOffset: 20,
        rightOffset: webRightOffset,
        bottomOffset: webBottomOffset
      };
      return boundaries;
    } else {
      // Для Android используем фиксированные границы (сбалансированное пространство по горизонтали)
      return {
        leftOffset: 5,   // Уменьшено на 5 для увеличения пространства слева
        topOffset: 5,    // Уменьшено на 5 для увеличения пространства сверху
        rightOffset: 165,  // Уменьшено чтобы шайбы долетали до края
        bottomOffset: 415  // Уменьшено чтобы шайбы долетали до края
      };
    }
  }, [width, height]);

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
            speedMultiplier = 1.2;
          } else if (Platform.OS === 'web') {
            speedMultiplier = 1.2;
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
    
    // Если анимация уже запущена и количество шайб не изменилось, не перезапускаем
    if (animationIntervalRef.current && !hasLengthChanged) {
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
          
          // Более плавное движение
          let newX = pos.x + pos.vx;
          let newY = pos.y + pos.vy;
          let newVx = pos.vx;
          let newVy = pos.vy;
          
          // Убираем трение для постоянного движения
          // const friction = 0.999; // Убираем трение
          // newVx *= friction;
          // newVy *= friction;


          // Обработка коллизий со стенами (платформо-зависимые границы)
          const wallMaxX = width - boundaries.rightOffset - puckSize;
          const wallMaxY = height - boundaries.bottomOffset - puckSize;
          
          if (newX <= boundaries.leftOffset || newX >= wallMaxX) {
            newVx = -newVx * (Platform.OS === 'android' ? 1.1 : 1.05); // Увеличиваем скорость при отскоке от стен
            newX = Math.max(boundaries.leftOffset, Math.min(wallMaxX, newX));
          }
          if (newY <= boundaries.topOffset || newY >= wallMaxY) {
            newVy = -newVy * (Platform.OS === 'android' ? 1.1 : 1.05); // Увеличиваем скорость при отскоке от стен
            newY = Math.max(boundaries.topOffset, Math.min(wallMaxY, newY));
          }

          // Дополнительная защита для веб-платформы - принудительное ограничение позиции
          if (Platform.OS === 'web') {
            // Исправляем расчет максимальных координат
            const maxX = width - boundaries.rightOffset;
            const maxY = height - boundaries.bottomOffset;
            
            // Проверяем, если шайба вылетает за границы
            if (newX < boundaries.leftOffset || newX > maxX || newY < boundaries.topOffset || newY > maxY) {
              console.warn('🚨 Puck out of bounds BEFORE correction:', { 
                id: pos.id, 
                position: { x: newX, y: newY },
                limits: { maxX, maxY },
                boundaries,
                velocity: { vx: newVx, vy: newVy },
                screenSize: { width, height }
              });
            }
            
            const correctedX = Math.max(boundaries.leftOffset, Math.min(maxX - puckSize, newX));
            const correctedY = Math.max(boundaries.topOffset, Math.min(maxY - puckSize, newY));
            
            
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
          currentPositions.forEach((otherPos, otherIndex) => {
            if (otherPos.id === pos.id) return;
            
            const dx = newX - otherPos.x;
            const dy = newY - otherPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Минимальное расстояние между центрами шайб (диаметр шайбы)
            const minDistance = Platform.OS === 'android' ? puckSize * 0.5 : puckSize;
            
            if (distance < minDistance && distance > 0) {
              const angle = Math.atan2(dy, dx);
              
              // ЖЕСТКАЯ ГРАНИЦА: принудительно отодвигаем шайбу на минимальное расстояние
              const correctionDistance = minDistance - distance;
              newX += Math.cos(angle) * correctionDistance;
              newY += Math.sin(angle) * correctionDistance;
              
              // ПРОСТАЯ ФИЗИКА: более плавное отталкивание на основе overlap
              const overlap = minDistance - distance;
              const pushForce = overlap * (Platform.OS === 'ios' ? 0.6 : (Platform.OS === 'android' ? 0.05 : 0.18)); // Еще более минимальная сила отталкивания для Android
              
              // ДОБАВЛЯЕМ ПЕРЕДАЧУ ИМПУЛЬСА: учитываем скорость движущейся шайбы
              const currentSpeed = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy);
              
              // Передаем импульс если текущая шайба движется (независимо от скорости другой)
              if (currentSpeed > 0.3) {
                const impulseTransfer = Math.min(currentSpeed * 0.4, 3.0); // Увеличиваем передачу импульса
                const impulseX = Math.cos(angle) * impulseTransfer;
                const impulseY = Math.sin(angle) * impulseTransfer;
                
                // Другая шайба получает импульс от движущейся
                velocityChanges[otherIndex].dvx += impulseX;
                velocityChanges[otherIndex].dvy += impulseY;
                
                // Убираем логи передачи импульса для чистоты консоли
              }
              
              // Текущая шайба отталкивается от другой
              newVx += Math.cos(angle) * pushForce;
              newVy += Math.sin(angle) * pushForce;
              
              // Другая шайба отталкивается от текущей (в обратном направлении) с той же силой
              velocityChanges[otherIndex].dvx -= Math.cos(angle) * pushForce;
              velocityChanges[otherIndex].dvy -= Math.sin(angle) * pushForce;
              
              // Отмечаем столкновение для вибрации только если это шайба пользователя
              if (currentUserId && pos.id === currentUserId) {
                collisionDetectedRef.current = true;
              }
            }
          });
          
          // Применяем изменения скорости от коллизий ПЕРЕД ограничениями
          // Добавляем небольшое ускорение при столкновениях для динамичности
          const hasCollision = velocityChanges[posIndex].dvx !== 0 || velocityChanges[posIndex].dvy !== 0;
          if (hasCollision) {
            const speedBoost = 1.05; // 5% ускорение при столкновениях
            newVx *= speedBoost;
            newVy *= speedBoost;
          }
          
          newVx += velocityChanges[posIndex].dvx;
          newVy += velocityChanges[posIndex].dvy;
          
          // Адаптивные ограничения скорости в зависимости от производительности устройства
          let maxSpeed, minSpeed;
          if (Platform.OS === 'ios') {
            maxSpeed = 5.0;
            minSpeed = 0.8;
          } else if (Platform.OS === 'web') {
            maxSpeed = 5.5;
            minSpeed = 0.8;
          } else if (Platform.OS === 'android') {
            const performanceLevel = getAndroidPerformanceLevel();
            switch (performanceLevel) {
              case 'high':
                maxSpeed = 4.0; // Высокая максимальная скорость для мощных Android
                minSpeed = 0.6;
                break;
              case 'medium':
                maxSpeed = 2.5; // Средняя максимальная скорость для средних Android
                minSpeed = 0.4;
                break;
              case 'low':
              default:
                maxSpeed = 1.5; // Низкая максимальная скорость для слабых Android
                minSpeed = 0.3;
                break;
            }
          } else {
            maxSpeed = 5.0;
            minSpeed = 0.8;
          }
          const currentSpeed = Math.sqrt(newVx * newVx + newVy * newVy);
          if (currentSpeed > maxSpeed) {
            newVx = (newVx / currentSpeed) * maxSpeed;
            newVy = (newVy / currentSpeed) * maxSpeed;
          }
          
          // Минимальная скорость для предотвращения остановки - применяем всегда
          if (currentSpeed < minSpeed) {
            const angle = Math.random() * 2 * Math.PI;
            newVx = Math.cos(angle) * minSpeed;
            newVy = Math.sin(angle) * minSpeed;
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
  }, [puckPositions.length, boundaries.leftOffset, boundaries.rightOffset, boundaries.topOffset, boundaries.bottomOffset, width, height, puckSize, currentScreen]);

  // Функция для обновления позиции и скорости конкретной шайбы (для drag)
  const updatePuckPosition = useCallback((id: string, x: number, y: number, vx: number, vy: number, isDragging: boolean = true) => {
    let hasCollision = false;
    
    setPuckPositions(currentPositions => {
      // Проверяем коллизии с другими шайбами при перетаскивании
      let adjustedX = x;
      let adjustedY = y;
      const updatedPositions = [...currentPositions];
      
      currentPositions.forEach((otherPos, index) => {
        if (otherPos.id === id) return;
        
        const dx = adjustedX - otherPos.x;
        const dy = adjustedY - otherPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Минимальное расстояние между центрами шайб
        const minDistance = puckSize;
        
        if (distance < minDistance && distance > 0) {
          hasCollision = true; // Обнаружено столкновение
          const angle = Math.atan2(dy, dx);
          
          // ЖЕСТКАЯ ГРАНИЦА: отодвигаем перетаскиваемую шайбу
          const targetDistance = minDistance;
          const correctionDistance = targetDistance - distance;
          adjustedX += Math.cos(angle) * correctionDistance;
          adjustedY += Math.sin(angle) * correctionDistance;
          
          // ТОЛКАЕМ ДРУГУЮ ШАЙБУ только при реальном столкновении
          // Но не при каждом движении пальца - только когда есть столкновение
          const pushStrength = Platform.OS === 'ios' ? 0.8 : (Platform.OS === 'android' ? 0.1 : 0.2); // Еще более минимальная сила толчка для Android
          
          // Вычисляем общую скорость перетаскивания
          const dragSpeed = Math.sqrt(vx * vx + vy * vy);
          
          // Толкаем только если есть реальная скорость (не при каждом движении пальца)
          if (dragSpeed > 1.0) { // Еще больше увеличиваем порог для более точного толчка
            // angle - это угол ОТ другой шайбы К перетаскиваемой
            // Нужно инвертировать, чтобы толкать ДРУГУЮ шайбу ОТ перетаскиваемой
            const pushAngle = angle + Math.PI; // Инвертируем направление на 180°
            const pushVx = Math.cos(pushAngle) * dragSpeed * pushStrength;
            const pushVy = Math.sin(pushAngle) * dragSpeed * pushStrength;
            
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
    
    // Вибрация при перетаскивании отключена - только при столкновениях
    // Вибрация при drag отключена по запросу пользователя
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
    dragHistoryRef.current = []; // Очищаем историю
    setIsDragging(true);
    
    // Таймаут отключен - можно держать шайбу сколько угодно
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging || !onDrag) return;
    
    const touch = e.nativeEvent;
    const now = Date.now();
    
    // Адаптивный throttling в зависимости от производительности устройства
    const throttleInterval = Platform.OS === 'android' ? 
      (getAndroidPerformanceLevel() === 'high' ? 16 : 
       getAndroidPerformanceLevel() === 'medium' ? 20 : 33) : 16;
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
    // Адаптивный коэффициент в зависимости от производительности устройства
    let speedMultiplier;
    if (Platform.OS === 'android') {
      const performanceLevel = getAndroidPerformanceLevel();
      switch (performanceLevel) {
        case 'high':
          speedMultiplier = 0.8; // Высокий коэффициент для мощных Android
          break;
        case 'medium':
          speedMultiplier = 0.6; // Средний коэффициент для средних Android
          break;
        case 'low':
        default:
          speedMultiplier = 0.5; // Низкий коэффициент для слабых Android
          break;
      }
    } else {
      speedMultiplier = 0.8;
    }
    const vx = (newX - lastPositionRef.current.x) * speedMultiplier;
    const vy = (newY - lastPositionRef.current.y) * speedMultiplier;
    
    // Накапливаем скорость для финального импульса
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
    
    // Рассчитываем финальную скорость на основе направления движения пальца
    if (onDrag) {
      const now = Date.now();
      const timeDiff = now - dragStartRef.current.time;
      
      // Простое решение: используем накопленную скорость, но с правильным направлением
      // Адаптивный финальный импульс в зависимости от производительности устройства
      let impulseMultiplier;
      if (Platform.OS === 'android') {
        const performanceLevel = getAndroidPerformanceLevel();
        switch (performanceLevel) {
          case 'high':
            impulseMultiplier = 0.5; // Высокий импульс для мощных Android
            break;
          case 'medium':
            impulseMultiplier = 0.4; // Средний импульс для средних Android
            break;
          case 'low':
          default:
            impulseMultiplier = 0.3; // Низкий импульс для слабых Android
            break;
        }
      } else {
        impulseMultiplier = 0.5;
      }
      const finalVx = dragVelocityRef.current.vx * impulseMultiplier;
      const finalVy = dragVelocityRef.current.vy * impulseMultiplier;
      
      // Убираем логи направления для чистоты консоли
      
      onDrag(position.id, position.x, position.y, finalVx, finalVy, false);
    }
    
    // Сбрасываем накопленную скорость
    dragVelocityRef.current = { vx: 0, vy: 0 };
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



  // Фильтрация игроков
  const filteredPlayers = useMemo(() => {
    const filtered = players.filter(player => {
      // Администратор всегда виден
      if (player.status === 'admin') return true;
    
    // Фильтр по стране
      const matchesCountry = !selectedCountry || player.country === selectedCountry;
      
      // Фильтр по году (только для игроков и звезд, у которых есть birthDate)
      const matchesYear = !selectedYear || 
        (player.birthDate && player.birthDate.startsWith(selectedYear.toString())) ||
        // Для заточки коньков, магазинов и скаутов показываем во всех годах
        (player.status === 'skateSharpening' || player.status === 'shop' || player.status === 'scout');
      
      return matchesCountry && matchesYear;
    });

    return filtered;
  }, [players, selectedCountry, selectedYear]);

  // Объединяем отфильтрованных игроков с тренерами, звездами и магазинами
  const allVisiblePlayers = useMemo(() => {
    const filtered = [...filteredPlayers];
    
    // Добавляем тренеров - только если их страна совпадает И год тренировки подходит
    const coachesList = players.filter(player => {
      if (player.status !== 'coach') return false;
      
      // Проверяем страну
      const matchesCountry = !selectedCountry || player.country === selectedCountry;
      if (!matchesCountry) return false;
      
      // Проверяем год - если у тренера есть coach_years, показываем только в этих годах
      if (player.coach_years && Array.isArray(player.coach_years) && player.coach_years.length > 0) {
        // Если выбран год, проверяем что он есть в списке годов тренера
        if (selectedYear) {
          const yearNum = typeof selectedYear === 'string' ? parseInt(selectedYear) : selectedYear;
          const isIncluded = player.coach_years.includes(yearNum);
          return isIncluded;
        }
        // Если год не выбран, не показываем тренера
        return false;
      }
      
      // Если у тренера нет coach_years, показываем его везде (для обратной совместимости)
      return true;
    });
    
    // Добавляем звезд только если их страна совпадает с выбранной
    const starsList = players.filter(player => 
      player.status === 'star' &&
      (!selectedCountry || player.country === selectedCountry)
    );
    
    // Объединяем тренеров и звезд
    const coachesAndStarsList = [...coachesList, ...starsList];
    
    // Добавляем магазины - они отображаются во всех возрастных категориях для своего региона
    const shopsList = players.filter(player => 
      player.status === 'shop' &&
      (!selectedCountry || player.country === selectedCountry)
    );
    
    coachesAndStarsList.forEach(player => {
      if (!filtered.find(p => p.id === player.id)) {
        filtered.push(player);
      }
    });
    
    shopsList.forEach(player => {
      if (!filtered.find(p => p.id === player.id)) {
        filtered.push(player);
      }
    });
    
    return filtered;
  }, [filteredPlayers, players, selectedCountry]);

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




  const refreshPlayers = useCallback(async () => {
    try {
      // Используем кеширование для загрузки игроков
      const loadedPlayers = await dataCache.getOrLoad(
        CACHE_KEYS.PLAYERS,
        () => loadPlayers(),
        5 * 60 * 1000 // 5 минут
      );
      
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
  }, [selectedCountry, selectedYear, setSelectedCountry, setSelectedYear]);

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
  }, [players.length, loading, initializeApp]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useFocusEffect(
    useCallback(() => {
      // Устанавливаем, что мы на главном экране
      setCurrentScreen('index');
      
      // Возвращаем функцию очистки
      return () => {
        setCurrentScreen(null);
      };
    }, [setCurrentScreen])
  );

  // Обработка параметра refresh для принудительного обновления
  useEffect(() => {
    if (params.refresh) {
      refreshPlayers();
      checkForNewUser();
      // Очищаем параметр refresh после использования
      setTimeout(() => {
        router.setParams({ refresh: undefined });
      }, 1000);
    }
  }, [params.refresh, refreshPlayers, checkForNewUser, router]);

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

        {/* Фильтры */}
        <View style={styles.filtersWrapper}>
        <View style={styles.filtersContainer}>
          <CountryFilter players={players} />
          <YearFilter players={players} />
          {/* Кнопка отладки отключена */}
        </View>
        </View>

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
        {isConnected && filteredPlayers.length === 0 && (selectedCountry || selectedYear) && (
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
