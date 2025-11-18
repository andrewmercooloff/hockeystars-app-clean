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

  const windowDimensions = Dimensions.get('window');
  const width = screenWidth ?? windowDimensions.width;
  const height = screenHeight ?? windowDimensions.height;

  const boundaries = useMemo(() => ({
    left: 0,
    top: 0,
    right: width - puckSize,
    bottom: height - 200 - puckSize, // Вычитаем место для таб-бара
  }), [width, height, puckSize]);

  // Инициализация позиций
  useEffect(() => {
    if (players.length === 0) return;

           const positions: PuckPosition[] = players.map(player => ({
             id: player.id,
             x: Math.random() * (boundaries.right - boundaries.left - 100) + boundaries.left + 50,
             y: Math.random() * (boundaries.bottom - boundaries.top - 100) + boundaries.top + 50,
              vx: (Math.random() - 0.5) * 5, // Сделаны более активными
              vy: (Math.random() - 0.5) * 5,
             size: puckSize,
             isDragging: false,
           }));

    setPuckPositions(positions);
  }, [players, boundaries]);

  // Анимационный цикл
  useEffect(() => {
    if (puckPositions.length === 0) return;

    animationRef.current = setInterval(() => {
      setPuckPositions(currentPositions => {
        return currentPositions.map(pos => {
          // Пропускаем шайбы, которые перетаскиваются
          if (pos.isDragging) {
            return pos;
          }

          let { x, y, vx, vy } = pos;

          // Обновляем позицию только если есть скорость (очень маленький порог для постоянного плавания)
          if (Math.abs(vx) > 0.0001 || Math.abs(vy) > 0.0001) {
            x += vx;
            y += vy;
          } else {
            // Останавливаем шайбу только при крайне малой скорости
            vx = 0;
            vy = 0;
          }

          // Проверяем границы
          if (x <= boundaries.left) {
            x = boundaries.left;
            vx = Math.abs(vx) * 0.8;
          } else if (x >= boundaries.right) {
            x = boundaries.right;
            vx = -Math.abs(vx) * 0.8;
          }

          if (y <= boundaries.top) {
            y = boundaries.top;
            vy = Math.abs(vy) * 0.8;
          } else if (y >= boundaries.bottom) {
            y = boundaries.bottom;
            vy = -Math.abs(vy) * 0.8;
          }

          // Проверяем коллизии только между шайбами, которые не в drag
          currentPositions.forEach(otherPos => {
            if (otherPos.id === pos.id || pos.isDragging || otherPos.isDragging) return;

            const dx = x - otherPos.x;
            const dy = y - otherPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = puckSize;

            if (distance < minDistance && distance > 0) {
              const angle = Math.atan2(dy, dx);
              const overlap = minDistance - distance;
              
              // Разделяем перекрытие поровну между двумя шайбами
              const pushDistance = overlap * 0.5;
              
              // Отталкиваем текущую шайбу
              x += Math.cos(angle) * pushDistance;
              y += Math.sin(angle) * pushDistance;

              // Вычисляем относительную скорость
              const relativeVx = vx - otherPos.vx;
              const relativeVy = vy - otherPos.vy;
              
              // Вычисляем компонент относительной скорости вдоль линии столкновения
              const dotProduct = relativeVx * Math.cos(angle) + relativeVy * Math.sin(angle);
              
              // Если шайбы сближаются, меняем их скорости
              if (dotProduct < 0) {
                // Коэффициент упругости столкновения
                const restitution = 0.9;
                
                // Меняем скорости обеих шайб
                const impulse = dotProduct * restitution;
                vx -= impulse * Math.cos(angle);
                vy -= impulse * Math.sin(angle);
                
                // Добавляем небольшое ускорение при столкновении
                const collisionBoost = 0.3;
                vx += Math.cos(angle) * collisionBoost;
                vy += Math.sin(angle) * collisionBoost;
              }
              
              // Всегда добавляем силу отталкивания для предотвращения прилипания
              // Чем ближе шайбы, тем сильнее отталкивание
              const separationForce = (overlap / minDistance) * 1.0;
              vx += Math.cos(angle) * separationForce;
              vy += Math.sin(angle) * separationForce;

              // Отмечаем столкновение для вибрации только если это шайба пользователя
              if (currentUserId && pos.id === currentUserId) {
                collisionDetectedRef.current = true;
              }
            }
          });

          // Финальная проверка границ
          x = Math.max(boundaries.left, Math.min(boundaries.right, x));
          y = Math.max(boundaries.top, Math.min(boundaries.bottom, y));

          // Трение минимальное - шайбы плавают постоянно
          vx *= 0.99995;
          vy *= 0.99995;

          return { ...pos, x, y, vx, vy };
        });
      });
    }, 16);

    // Вызываем вибрацию если было столкновение (с дебаунсом)
    if (collisionDetectedRef.current && currentScreen === 'puck-test') {
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

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [puckPositions.length, boundaries, currentUserId]);

  // Функция для обновления позиции при drag
  const updatePuckPosition = useCallback((id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => {
    setPuckPositions(current => {
      let finalX = Math.max(boundaries.left, Math.min(boundaries.right, x));
      let finalY = Math.max(boundaries.top, Math.min(boundaries.bottom, y));

      // Если шайба в drag, проверяем коллизии и корректируем позицию
      let dragVx = vx;
      let dragVy = vy;

      if (isDragging) {
        current.forEach(otherPos => {
          if (otherPos.id === id) return;

          const dx = finalX - otherPos.x;
          const dy = finalY - otherPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = 70; // puckSize

          if (distance < minDistance && distance > 0) {
            // Вычисляем угол столкновения
            const angle = Math.atan2(dy, dx);
            // Корректируем позицию перетаскиваемой шайбы, чтобы она не проходила сквозь другую
            const overlap = minDistance - distance;
            finalX += Math.cos(angle) * overlap;
            finalY += Math.sin(angle) * overlap;

            // Добавляем небольшой отскок перетаскиваемой шайбы для более натурального движения
            const bounceBack = overlap * 0.3;
            finalX += Math.cos(angle) * bounceBack;
            finalY += Math.sin(angle) * bounceBack;

            // Перетаскиваемая шайба тоже получает импульс от столкновения
            const dragSpeed = Math.sqrt(dragVx * dragVx + dragVy * dragVy);
            const collisionImpulse = Math.min(dragSpeed * 0.3, 2.0);
            dragVx += Math.cos(angle) * collisionImpulse;
            dragVy += Math.sin(angle) * collisionImpulse;

            // Отмечаем столкновение для вибрации
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

        // Проверяем коллизии с перетаскиваемой шайбой и отталкиваем другую шайбу
        if (isDragging) {
          const dx = finalX - pos.x;
          const dy = finalY - pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = 70; // puckSize

          if (distance < minDistance && distance > 0) {
            // Отталкиваем другую шайбу
            const angle = Math.atan2(dy, dx);
            // Вычисляем скорость отталкивания на основе скорости перетаскиваемой шайбы
            const dragSpeed = Math.sqrt(vx * vx + vy * vy);
            const pushForce = Math.min(dragSpeed * 0.9, 5.0); // Значительно увеличена сила отталкивания

            // Также добавляем силу отталкивания для предотвращения прилипания
            const separationForce = 1.2;

            // Добавляем ускорение при столкновении (увеличено)
            const collisionBoost = 0.8;

            return {
              ...pos,
              vx: pos.vx + Math.cos(angle) * (pushForce + separationForce + collisionBoost),
              vy: pos.vy + Math.sin(angle) * (pushForce + separationForce + collisionBoost),
            };
          }
        }

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
const OriginalPuckAnimator = ({
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

    const throttleInterval = Platform.OS === 'android' ? 32 : 32; // Увеличиваем throttle для уменьшения нагрузки

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
    const maxSpeed = 5.0; // Максимальная скорость при drag
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > maxSpeed) {
      vx = (vx / speed) * maxSpeed;
      vy = (vy / speed) * maxSpeed;
    }

    dragVelocityRef.current.vx += vx;
    dragVelocityRef.current.vy += vy;

    dragHistoryRef.current.push({ x: newX, y: newY, time: now });
    if (dragHistoryRef.current.length > 5) {
      dragHistoryRef.current.shift();
    }

    lastPositionRef.current = { x: newX, y: newY };
    onDrag(position.id, newX, newY, vx, vy, true);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (onDrag && hasDraggedRef.current) {
      // Это был drag - применяем импульс
      const now = Date.now();
      const timeDiff = now - dragStartRef.current.time;
      
      // Импульс соответствует скорости движения пальца - тихонько толкаешь = тихонько плывет
      const finalVx = dragVelocityRef.current.vx * 0.6; // Умеренный коэффициент для естественного движения
      const finalVy = dragVelocityRef.current.vy * 0.6;

      // Максимальная скорость ограничена для предотвращения слишком быстрого движения
      const maxReleaseSpeed = 6.0; // Разумное ограничение скорости
      const releaseSpeed = Math.sqrt(finalVx * finalVx + finalVy * finalVy);
      let clampedVx = finalVx;
      let clampedVy = finalVy;
      if (releaseSpeed > maxReleaseSpeed) {
        clampedVx = (finalVx / releaseSpeed) * maxReleaseSpeed;
        clampedVy = (finalVy / releaseSpeed) * maxReleaseSpeed;
      }

      onDrag(position.id, position.x, position.y, clampedVx, clampedVy, false);
    }

    // Сбрасываем накопленную скорость
    dragVelocityRef.current = { vx: 0, vy: 0 };
    
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
};

export default function PuckTestScreen() {
  const { currentUser } = useUser();
  const router = useRouter();
  const { setCurrentScreen, currentScreen } = useScreenContext();

  // Загружаем всех игроков из базы данных
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Фильтры
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

  // Ключ для перегенерации случайной части выборки
  const [shuffleKey, setShuffleKey] = useState(0);

  // Загрузка игроков
  useEffect(() => {
    const loadAllPlayers = async () => {
      try {
        setLoading(true);
        const loadedPlayers = await loadPlayers();
        setPlayers(loadedPlayers);
        console.log(`✅ Загружено ${loadedPlayers.length} игроков для тестового экрана`);
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
      currentUser?.status,
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
      setCurrentScreen('puck-test');
      return () => {
        setCurrentScreen(null);
      };
    }, [setCurrentScreen])
  );

  // Обработчик drag
  const handleDrag = useCallback((id: string, x: number, y: number, vx: number, vy: number, isDragging?: boolean) => {
    updatePuckPosition(id, x, y, vx, vy, isDragging);
  }, [updatePuckPosition]);

  // Обработчик нажатия на шайбу (навигация в профиль)
  const handlePuckPress = useCallback((playerId: string) => {
    router.push({ pathname: '/player/[id]', params: { id: playerId } });
  }, [router]);

  // Анимация запущена если есть шайбы
  const isRunning = puckPositions.length > 0;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/images/led.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Шайбы рендерятся напрямую как в основном экране - НЕ внутри innerBorder с pointerEvents: 'none' */}
        {puckPositions.map((position) => {
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
        })}

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
