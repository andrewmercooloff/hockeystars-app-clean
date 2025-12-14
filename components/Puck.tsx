import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CachedAvatar from './CachedAvatar';

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
  isOnline = false
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
      default: return '#FFFFFF'; // Белый для обычных игроков
    }
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
    <Animated.View style={[
      isStar ? styles.starPuck : styles.puck,
      { 
        width: size, 
        height: size, 
        borderRadius: dimensions.borderRadius 
      },
      animatedStyle
    ]}>
      {/* Дополнительная тень на льду - отключена для производительности */}
      {/* <Animated.View style={[
        styles.iceShadow,
        {
          width: size * 0.8,
          left: size * 0.1,
        },
        animatedShadowStyle
      ]} /> */}
      
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {avatar && playerId && status !== 'scout' ? (
          <View style={[
            {
              width: dimensions.avatarSize,
              height: dimensions.avatarSize,
              borderRadius: dimensions.avatarBorderRadius,
              borderWidth: status === 'star' || status === 'coach' || status === 'scout' || status === 'admin' || status === 'skateSharpening' ? 3 : 2,
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
              overflow: 'hidden'
            }
          ]}>
            <Image
              source={require('../assets/images/scout.png')}
              style={{
                width: dimensions.avatarSize - 4,
                height: dimensions.avatarSize - 4,
                borderRadius: dimensions.avatarBorderRadius - 2,
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
              borderWidth: status === 'star' || status === 'coach' || status === 'scout' || status === 'admin' || status === 'skateSharpening' ? 3 : 2,
              borderColor: avatarBorderColor,
              backgroundColor: '#2C3E50'
            }
          ]}>
            <Ionicons
              name={status === 'shop' ? 'storefront' : 'person'}
              size={dimensions.iconSize}
              color="#FFFFFF"
            />
          </View>
        )}
        
        {points && status === 'player' && points !== 'NaN' && points !== 'undefined' && typeof points === 'string' && points.length > 0 && (
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{points}</Text>
          </View>
        )}
        
        {/* Зеленая точка для онлайн пользователей */}
        {isOnline && (
          <View style={[
            styles.onlineIndicator,
            {
              width: size * 0.08, // Уменьшен размер для минимализма
              height: size * 0.08,
              borderRadius: (size * 0.08) / 2,
              top: (size * 0.05) + 3, // Сдвигаем вниз: увеличиваем top
              right: (size * 0.05) + 5, // Сдвигаем влево: увеличиваем right
            }
          ]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ОПТИМИЗАЦИЯ: Тени отключены на всех платформах для экономии батареи
// Рендеринг теней очень ресурсоёмкий, особенно на 40+ шайбах
const styles = StyleSheet.create({
  puck: {
    position: 'absolute',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    // ОПТИМИЗАЦИЯ: Тени отключены на всех платформах для снижения нагрузки на GPU
    borderWidth: 2,
    borderColor: '#333333',
  },
  starPuck: {
    position: 'absolute',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    // ОПТИМИЗАЦИЯ: Тени отключены на всех платформах для снижения нагрузки на GPU
    borderWidth: 2,
    borderColor: '#333333',
  },
  avatar: {
    // ОПТИМИЗАЦИЯ: Тени отключены для экономии батареи
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
  // ОПТИМИЗАЦИЯ: Тень на льду отключена для экономии батареи
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
});

export default Puck; 