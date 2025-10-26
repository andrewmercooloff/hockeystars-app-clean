import React from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvatarCache, avatarCache } from '../utils/AvatarCache';
import { useThumbnailUrl, AvatarSize, AVATAR_SIZES } from '../utils/ThumbnailCache';

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
  const [isCached, setIsCached] = React.useState(false);

  // Используем кешированный аватар или fallback
  const originalAvatarUrl = cachedAvatarUrl || fallbackAvatarUrl;
  
  // Определяем размер миниатюры на основе размера аватара
  const getThumbnailSize = (size: number): AvatarSize => {
    if (size <= AVATAR_SIZES.SMALL) return 'SMALL';
    if (size <= AVATAR_SIZES.MEDIUM) return 'MEDIUM';
    if (size <= AVATAR_SIZES.LARGE) return 'LARGE';
    if (size <= AVATAR_SIZES.XLARGE) return 'XLARGE';
    return 'XXLARGE';
  };

  const thumbnailSize = getThumbnailSize(size);
  const effectiveAvatarUrl = useThumbnailUrl(playerId, originalAvatarUrl || '', thumbnailSize);

  // Предзагружаем миниатюру
  React.useEffect(() => {
    if (effectiveAvatarUrl && effectiveAvatarUrl.startsWith('http') && !isPrefetched) {
      Image.prefetch(effectiveAvatarUrl)
        .then(() => {
          setIsPrefetched(true);
          setIsCached(true);
        })
        .catch(() => {
          setIsPrefetched(false);
          setIsCached(false);
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
          cache: isCached ? 'force-cache' : (isPrefetched ? 'force-cache' : 'default'),
          headers: {
            'Cache-Control': 'max-age=3600'
          }
        }}
        style={[imageStyle, { 
          opacity: imageLoaded ? 1 : (isCached ? 1 : (isPrefetched ? 0.9 : 0.7))
        }]}
        onError={handleError}
        onLoad={handleLoad}
      />
      
    </View>
  );
};

export default CachedAvatar;
