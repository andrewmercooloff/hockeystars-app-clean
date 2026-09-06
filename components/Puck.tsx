import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import PressableScale from './PressableScale';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CachedAvatar from './CachedAvatar';
import LeaderShine from './LeaderShine';
import { LEADER_BORDER_COLORS, LEADER_MEDAL_BORDER_WIDTH, type LeaderRank } from '../utils/leaderDisplay';

export const PUCK_SCOUT_LOGO = require('../assets/images/scout.png');
/** Event puck faces: pre-rendered artwork (matte disc, brand red, wordmark along the edge). */
const PUCK_FACE_STAR_GOAL = require('../assets/images/puck-star-goal.png');
const PUCK_FACE_QUIZ = require('../assets/images/puck-quiz.png');

interface PuckProps {
  avatar?: string | null;
  playerId?: string; // Добавляем playerId для кеширования
  onPress: () => void;
  animatedStyle?: any;
  size?: number;
  points?: string;
  isStar?: boolean;
  status?: string;
  isOnline?: boolean; // статус онлайн пользователя
  isNew?: boolean; // новый игрок (зарегистрирован < 2 дней назад)
  leaderRank?: LeaderRank; // топ-1/2/3 лидер — медальная обводка
  /** Много шайб на экране (мини-игра): чуть легче тень на Android — меньше нагрузка на GPU. */
  denseScene?: boolean;
}

const Puck: React.FC<PuckProps> = ({ 
  avatar, 
  playerId,
  onPress,
  animatedStyle, 
  size = 140, 
  points, 
  isStar, 
  status,
  isOnline = false,
  isNew = false,
  leaderRank,
  denseScene = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const avatarCacheKey = useMemo(() => playerId ? `${playerId}-${avatar}` : avatar, [playerId, avatar]);

  // Анимация для тени на льду - отключена для лучшей производительности
  // const shadowOpacity = useSharedValue(0.4);
  
  // useEffect(() => {
  //   shadowOpacity.value = withRepeat(
  //     withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
  //     -1,
  //     true
  //   );
  // }, [shadowOpacity]);
  
  // const animatedShadowStyle = useAnimatedStyle(() => ({
  //   opacity: shadowOpacity.value,
  // }));
  
  const dimensions = useMemo(() => {
    const avatarSize = size * 0.86;
    const borderRadius = size / 2;
    const avatarBorderRadius = avatarSize / 2;
    const iconSize = avatarSize * 0.5;
    
    return {
      avatarSize,
      borderRadius,
      avatarBorderRadius,
      iconSize
    };
  }, [size]);

  const avatarBorderColor = useMemo(() => {
    switch (status) {
      case 'star': return '#FFD700'; // Золотистый для звезд
      case 'coach': return '#FF4444'; // Красный для тренеров
      case 'scout': return '#8B5CF6'; // Фиолетовый для скаутов
      case 'admin': return '#000000'; // Черный для админов
      case 'shop': return '#4CAF50'; // Приглушенный зеленый для магазинов
      case 'skateSharpening': return '#0066CC'; // Синий для заточки коньков
      case 'game':
      case 'quizGame':
        return '#8EC8C8'; // Нежно-бирюзовый для мини-игр
      default: return '#FFFFFF'; // Белый для обычных игроков
    }
  }, [status]);

  const avatarBorderWidth = useMemo(() => {
    if (status === 'star' || status === 'coach' || status === 'scout' || status === 'admin' || status === 'skateSharpening') {
      return 2;
    }
    return 1.5;
  }, [status]);

  const imageSource = useMemo(() => {
    // Эта функция больше не используется, так как мы используем CachedAvatar для кеширования
    // Оставляем для совместимости со старым кодом, но она не должна вызываться
    return null;
  }, []);

  const handleError = useCallback((error: any) => {

    setImageError(true);
  }, [avatar]);

  const handleLoad = useCallback(() => {

  }, [avatar]);

  return (
    <Animated.View
      style={[
        isStar ? styles.starPuck : styles.puck,
        {
          width: size,
          height: size,
          borderRadius: dimensions.borderRadius,
        },
        Platform.OS === 'android' && denseScene ? { elevation: 2 } : null,
        animatedStyle,
      ]}
    >
      {/* Дополнительная тень на льду - отключена для производительности */}
      {/* <Animated.View style={[
        styles.iceShadow,
        {
          width: size * 0.8,
          left: size * 0.1,
        },
        animatedShadowStyle
      ]} /> */}
      
      <PressableScale onPress={onPress} scaleTo={0.92} style={styles.puckTouchable}>
        {leaderRank != null ? (
          <>
            <View
              pointerEvents="none"
              style={[
                styles.leaderMedalRing,
                {
                  width: size,
                  height: size,
                  borderRadius: dimensions.borderRadius,
                  borderWidth: LEADER_MEDAL_BORDER_WIDTH,
                  borderColor: LEADER_BORDER_COLORS[leaderRank],
                },
              ]}
            />
            <LeaderShine
              size={size}
              color={LEADER_BORDER_COLORS[leaderRank]}
              delayMs={(leaderRank - 1) * 450}
            />
          </>
        ) : null}
        {avatar && playerId && status !== 'scout' ? (
          <View style={[
            {
              width: dimensions.avatarSize,
              height: dimensions.avatarSize,
              borderRadius: dimensions.avatarBorderRadius,
              borderWidth: avatarBorderWidth,
              borderColor: avatarBorderColor,
              overflow: 'hidden'
            }
          ]}>
            <CachedAvatar
              playerId={playerId}
              fallbackAvatarUrl={avatar}
              size={dimensions.avatarSize - 4}
              style={{
                borderRadius: dimensions.avatarBorderRadius - 2,
              }}
              onError={() => setImageError(true)}
            />
          </View>
        ) : status === 'scout' ? (
          <View style={[
            {
              width: dimensions.avatarSize,
              height: dimensions.avatarSize,
              borderRadius: dimensions.avatarBorderRadius,
              borderWidth: 3,
              borderColor: avatarBorderColor,
              overflow: 'hidden',
              backgroundColor: '#2d1f4e',
            }
          ]}>
            <Image
              source={PUCK_SCOUT_LOGO}
              style={{
                width: dimensions.avatarSize - 4,
                height: dimensions.avatarSize - 4,
                borderRadius: dimensions.avatarBorderRadius - 2,
              }}
              contentFit="cover"
              transition={0}
              cachePolicy="memory-disk"
            />
          </View>
        ) : status === 'quizGame' || status === 'game' ? (
          <View
            style={{
              width: dimensions.avatarSize,
              height: dimensions.avatarSize,
              borderRadius: dimensions.avatarBorderRadius,
              overflow: 'hidden',
            }}
          >
            <Image
              source={status === 'game' ? PUCK_FACE_STAR_GOAL : PUCK_FACE_QUIZ}
              style={{ width: dimensions.avatarSize, height: dimensions.avatarSize }}
              contentFit="cover"
              transition={0}
              cachePolicy="memory-disk"
            />
          </View>
        ) : (
            <View style={[
              styles.avatarPlaceholder,
              {
                width: dimensions.avatarSize,
                height: dimensions.avatarSize,
                borderRadius: dimensions.avatarBorderRadius,
                borderWidth: avatarBorderWidth,
                borderColor: avatarBorderColor,
                backgroundColor: '#2C3E50',
              }
            ]}>
              <Ionicons
                name={status === 'shop' ? 'storefront' : 'person'}
                size={dimensions.iconSize}
                color="#FFFFFF"
              />
            </View>
        )}
        
        {isOnline && (
          <View style={[
            styles.onlineIndicator,
            {
              width: size * 0.08,
              height: size * 0.08,
              borderRadius: (size * 0.08) / 2,
              top: (size * 0.05) + 3,
              right: (size * 0.05) + 5,
            }
          ]} />
        )}
        
        {isNew && (
          <View style={[
            styles.newBadge,
            {
              bottom: size * 0.02,
              left: size * 0.15,
            }
          ]}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

        {points && status === 'player' && points !== 'NaN' && points !== 'undefined' && typeof points === 'string' && points.length > 0 && (
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{points}</Text>
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
};

// Лёгкие тени для эффекта "шайба на льду" - оптимизированы для производительности
// Используем минимальный blur и opacity для снижения нагрузки на GPU
const styles = StyleSheet.create({
  puck: {
    position: 'absolute',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      // iOS: без CALayer-тени. Тень на слое без готового shadowPath рисуется
      // прямоугольником на первых кадрах после монтирования (серые "полосы").
      android: {
        // elevation аппаратно ускорен на Android
        elevation: 4,
      },
      web: {
        boxShadow: '2px 3px 4px rgba(0, 0, 0, 0.4)',
      },
    }),
    borderWidth: 1.5,
    // Непрозрачный цвет (white 75% поверх чёрного): Fabric рисует такую рамку
    // средствами CoreAnimation, а не битмапом — без кадра "квадрат без скругления".
    borderColor: '#bfbfbf',
  },
  starPuck: {
    position: 'absolute',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '2px 3px 4px rgba(0, 0, 0, 0.4)',
      },
    }),
    borderWidth: 1.5,
    borderColor: '#bfbfbf',
  },
  puckTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderMedalRing: {
    position: 'absolute',
    zIndex: 0,
  },
  avatar: {
    // Аватар не нуждается в отдельной тени - тень уже на контейнере
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsContainer: {
    position: 'absolute',
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#333333',
    bottom: -2,
    right: 8,
    minWidth: 18,
    minHeight: 14,
    zIndex: 20,
    ...Platform.select({
      android: { elevation: 8 },
    }),
  },
  pointsText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 12,
  },
  starContainer: {
    position: 'absolute',
    alignSelf: 'center',
  },
  starText: {
    textAlign: 'center',
  },
  // Лёгкая тень на льду (не используется в рендере, но оставлена для совместимости)
  iceShadow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    width: '80%',
    height: 8,
    backgroundColor: 'transparent',
    borderRadius: 50,
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    borderWidth: 1, // Более тонкая граница для минимализма
    borderColor: '#000',
    zIndex: 10,
  },
  newBadge: {
    position: 'absolute',
    backgroundColor: '#fa2f40',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 10,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: 'bold',
  },
});

export default Puck; 