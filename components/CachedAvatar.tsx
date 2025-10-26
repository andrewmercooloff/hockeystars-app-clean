import React from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvatarCache } from '../utils/AvatarCache';

interface CachedAvatarProps {
  playerId: string;
  fallbackAvatarUrl?: string; // Добавляем fallback URL
  size?: number;
  fallbackIcon?: string;
  fallbackSize?: number;
  fallbackColor?: string;
  style?: any;
  onError?: () => void;
  onLoad?: () => void;
}

const CachedAvatar: React.FC<CachedAvatarProps> = ({
  playerId,
  fallbackAvatarUrl,
  size = 45,
  fallbackIcon = 'person',
  fallbackSize = 25,
  fallbackColor = '#fff',
  style,
  onError,
  onLoad,
}) => {
  const cachedAvatarUrl = useAvatarCache(playerId, fallbackAvatarUrl);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [isPrefetched, setIsPrefetched] = React.useState(false);

  // Используем кешированный аватар или fallback
  const effectiveAvatarUrl = cachedAvatarUrl || fallbackAvatarUrl;

  // Предзагружаем изображение если оно есть и еще не предзагружено
  React.useEffect(() => {
    if (effectiveAvatarUrl && effectiveAvatarUrl.startsWith('http') && !isPrefetched) {
      Image.prefetch(effectiveAvatarUrl)
        .then(() => {
          setIsPrefetched(true);
        })
        .catch(() => {
          setIsPrefetched(false);
        });
    }
  }, [effectiveAvatarUrl, isPrefetched]);

  const handleLoad = React.useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
    onError?.();
  }, [onError]);

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: style?.borderRadius || size / 2,
    ...style
  };

  // Если нет аватара или ошибка загрузки, показываем иконку
  if (!effectiveAvatarUrl || imageError) {
    return (
      <View style={[imageStyle, { 
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center'
      }]}>
        <Ionicons 
          name={fallbackIcon as any} 
          size={fallbackSize} 
          color={fallbackColor} 
        />
      </View>
    );
  }

  return (
    <View style={imageStyle}>
      {/* Показываем изображение */}
      <Image
        source={{ 
          uri: effectiveAvatarUrl,
          cache: isPrefetched ? 'force-cache' : 'default',
          headers: {
            'Cache-Control': 'max-age=3600'
          }
        }}
        style={[imageStyle, { 
          opacity: imageLoaded ? 1 : (isPrefetched ? 0.9 : 0.7)
        }]}
        onError={handleError}
        onLoad={handleLoad}
      />
      
      {/* Показываем индикатор загрузки только если изображение не предзагружено */}
      {!isPrefetched && !imageLoaded && !imageError && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: size / 2
        }}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </View>
  );
};

export default CachedAvatar;
