import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import PressableScale from './PressableScale';

const PuckTouchable: React.ComponentType<any> = Platform.OS === 'web' ? View : PressableScale;
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CachedAvatar from './CachedAvatar';
import LeaderShine from './LeaderShine';
import Svg, { Circle } from 'react-native-svg';
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
  /** Аватар декодирован (или его нет / ошибка) — шайбу можно показывать без «чёрной дырки». */
  onAvatarReady?: () => void;
  /** Родитель (OriginalPuckAnimator) сам ловит pointer-события на web. */
  suppressWebTap?: boolean;
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
  onAvatarReady,
  suppressWebTap = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const readyNotifiedRef = useRef(false);
  const notifyAvatarReady = useCallback(() => {
    if (readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    onAvatarReady?.();
  }, [onAvatarReady]);
  const handleAvatarError = useCallback(() => {
    setImageError(true);
    notifyAvatarReady();
  }, [notifyAvatarReady]);
  const hasRemoteAvatar = !!avatar && !!playerId && status !== 'scout';
  useEffect(() => {
    if (!hasRemoteAvatar) notifyAvatarReady();
  }, [hasRemoteAvatar, notifyAvatarReady]);
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

  // Web: шайба непрерывно движется под курсором/пальцем, и браузерный click (на него
  // опирается Pressable RN-web) часто не рождается. Считаем тап сами по pointerdown/up:
  // короткое нажатие с малым смещением. Состояние в ref, поэтому переживает перерисовки.
  const tapStartRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const webTapProps = useMemo(() => {
    if (Platform.OS !== 'web' || suppressWebTap) return null;
    return {
      onPointerDown: (e: any) => {
        const ne = e?.nativeEvent || e || {};
        tapStartRef.current = { t: Date.now(), x: ne.clientX ?? 0, y: ne.clientY ?? 0 };
      },
      onPointerUp: (e: any) => {
        const start = tapStartRef.current;
        tapStartRef.current = null;
        if (!start) return;
        const ne = e?.nativeEvent || e || {};
        const dx = (ne.clientX ?? start.x) - start.x;
        const dy = (ne.clientY ?? start.y) - start.y;
        if (Date.now() - start.t < 500 && dx * dx + dy * dy < 24 * 24) {
          onPress();
        }
      },
    } as any;
  }, [onPress, suppressWebTap]);

  return (
    <Animated.View
      style={[
        isStar ? styles.starPuck : styles.puck,
        {
          width: size,
          height: size,
          borderRadius: dimensions.borderRadius,
        },
        animatedStyle,
      ]}
    >
      {/* Диск и тень — SVG-круги: View с backgroundColor+borderRadius на Fabric первый кадр
          рисуется квадратом («чёрные прямоугольники» при возврате на главную). */}
      <Svg
        pointerEvents="none"
        style={styles.puckDisc}
        width={size + 2}
        height={size + 4}
        viewBox={`0 0 ${size + 2} ${size + 4}`}
      >
        <Circle cx={size / 2 + 2} cy={size / 2 + 4} r={size / 2} fill="rgba(0,0,0,0.20)" />
        <Circle cx={size / 2 + 1} cy={size / 2 + 1} r={size / 2 - 0.75} fill="#000000" stroke="#26262b" strokeWidth={1.5} />
      </Svg>
      {/* Дополнительная тень на льду - отключена для производительности */}
      {/* <Animated.View style={[
        styles.iceShadow,
        {
          width: size * 0.8,
          left: size * 0.1,
        },
        animatedShadowStyle
      ]} /> */}
      
      <PuckTouchable
        {...(webTapProps ?? { onPress, scaleTo: 0.92 })}
        style={PUCK_TOUCHABLE_STYLE}
      >
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
              onLoad={notifyAvatarReady}
              onError={handleAvatarError}
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
            {/* Приглушаем логотипы игр: они не должны перебивать аватары игроков */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: dimensions.avatarBorderRadius,
                backgroundColor: 'rgba(0, 0, 0, 0.32)',
              }}
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
      </PuckTouchable>
    </Animated.View>
  );
};

// Лёгкие тени для эффекта "шайба на льду" - оптимизированы для производительности
// Используем минимальный blur и opacity для снижения нагрузки на GPU
const styles = StyleSheet.create({
  puck: {
    position: 'absolute',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    // Без CALayer-тени и без elevation: обе рисуются прямоугольником на первых
    // кадрах после монтирования (серые/чёрные "полосы"). Тень — отдельными View.
  },
  starPuck: {
    position: 'absolute',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Лицевая сторона диска: чёрная резина, кромка почти чёрная (непрозрачный цвет —
  // Fabric рисует рамку через CoreAnimation, без кадра "квадрат без скругления").
  puckDisc: {
    position: 'absolute',
    top: -1,
    left: -1,
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
  // Лёгкая тень на льду: чуть вниз, без объёма
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

/** Stable reference: an inline array here would re-render PressableScale on every puck render. */
const PUCK_TOUCHABLE_STYLE =
  Platform.OS === 'web'
    ? [styles.puckTouchable, { cursor: 'pointer' } as any]
    : styles.puckTouchable;

export default Puck; 