import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface PuckProps {
  avatar?: string | null;
  onPress: () => void;
  animatedStyle?: any;
  size?: number;
  points?: string;
  isStar?: boolean;
  status?: string;
}

const Puck: React.FC<PuckProps> = ({ 
  avatar, 
  onPress, 
  animatedStyle, 
  size = 140, 
  points, 
  isStar, 
  status 
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Анимация для тени на льду
  const shadowOpacity = useSharedValue(0.4);
  
  useEffect(() => {
    shadowOpacity.value = withRepeat(
      withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shadowOpacity]);
  
  const animatedShadowStyle = useAnimatedStyle(() => ({
    opacity: shadowOpacity.value,
  }));
  
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
      case 'scout': return '#FF4444'; // Красный для скаутов
      case 'admin': return '#000000'; // Черный для админов
      case 'shop': return '#4CAF50'; // Приглушенный зеленый для магазинов
      case 'skateSharpening': return '#0066CC'; // Синий для заточки коньков
      default: return '#FFFFFF'; // Белый для обычных игроков
    }
  }, [status]);

  const imageSource = useMemo(() => {
    if (!avatar || imageError) {
      return null;
    }
    
    if (typeof avatar === 'string') {
      // Проверяем корректные URI
      if (avatar.startsWith('data:image/') || 
          avatar.startsWith('http') || 
          avatar.startsWith('file://') || 
          avatar.startsWith('content://')) {
        return { 
          uri: avatar,
          cache: 'force-cache', // Используем кэш для лучшей производительности
        };
      }
      
      // Проверяем старые пути к файлам
      if (avatar.includes('me.jpg')) {
        return require('../assets/images/me.jpg');
      }
      
      // Если это просто строка, но не URI, попробуем как URI
      if (avatar.trim().length > 0) {
        return { 
          uri: avatar,
          cache: 'force-cache',
        };
      }
    }
    
    // Для всех остальных случаев показываем силуэт
    return null;
  }, [avatar, imageError]);

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
      {/* Дополнительная тень на льду */}
      <Animated.View style={[
        styles.iceShadow,
        {
          width: size * 0.8,
          left: size * 0.1,
        },
        animatedShadowStyle
      ]} />
      
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {imageSource ? (
          <Image 
            source={imageSource} 
            style={[
              styles.avatar,
              {
                width: dimensions.avatarSize,
                height: dimensions.avatarSize,
                borderRadius: dimensions.avatarBorderRadius,
                borderWidth: status === 'star' || status === 'coach' || status === 'scout' || status === 'admin' || status === 'skateSharpening' ? 3 : 2,
                borderColor: avatarBorderColor
              }
            ]}
            onError={handleError}
            onLoad={handleLoad}
          />
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
            {status === 'scout' ? (
              <Image 
                source={require('../assets/images/scout.png')} 
                style={{
                  width: dimensions.iconSize,
                  height: dimensions.iconSize,
                }}
              />
            ) : (
              <Ionicons 
                name={status === 'shop' ? 'storefront' : 'person'} 
                size={dimensions.iconSize} 
                color="#FFFFFF" 
              />
            )}
          </View>
        )}
        
        {points && status === 'player' && points !== 'NaN' && points !== 'undefined' && typeof points === 'string' && points.length > 0 && (
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{points}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  puck: {
    position: 'absolute',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 3px 4px rgba(0, 0, 0, 0.8)',
      },
    }),
    borderWidth: 2,
    borderColor: '#333333',
  },
  starPuck: {
    position: 'absolute',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 3px 4px rgba(0, 0, 0, 0.8)',
      },
    }),
    borderWidth: 2,
    borderColor: '#333333',
  },
  avatar: {
    // Базовый стиль для аватара
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.6,
        shadowRadius: 1,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 1px 1px rgba(0, 0, 0, 0.6)',
      },
    }),
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
  // Дополнительная тень для эффекта "лежания на льду"
  iceShadow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    width: '80%',
    height: 8,
    backgroundColor: 'transparent',
    borderRadius: 50,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.7,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.7)',
      },
    }),
  },
});

export default Puck; 