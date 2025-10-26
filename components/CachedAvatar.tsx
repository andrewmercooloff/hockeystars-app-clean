import React from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvatarCache } from '../utils/AvatarCache';
import { useThumbnailUrl, AvatarSize, AVATAR_SIZES } from '../utils/ThumbnailCache';

interface CachedAvatarProps {
  playerId: string;
  fallbackAvatarUrl?: string;
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
  size = 50,
  fallbackIcon = 'person',
  fallbackSize = 20,
  fallbackColor = '#fff',
  style,
  onError,
  onLoad,
}) => {
  const cachedAvatarUrl = useAvatarCache(playerId, fallbackAvatarUrl);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

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
  const thumbnailUrl = useThumbnailUrl(playerId, originalAvatarUrl || '', thumbnailSize);
  
  // Используем миниатюру, если она доступна и нет ошибки, иначе оригинальный URL
  const effectiveAvatarUrl = (imageError || thumbnailUrl === originalAvatarUrl) ? originalAvatarUrl : thumbnailUrl;
  
  console.log(`🔍 CachedAvatar для ${playerId} (${size}px):`, {
    thumbnailSize,
    thumbnailUrl: thumbnailUrl?.substring(0, 80) + '...',
    originalUrl: originalAvatarUrl?.substring(0, 80) + '...',
    effectiveUrl: effectiveAvatarUrl?.substring(0, 80) + '...',
    usingThumbnail: effectiveAvatarUrl !== originalAvatarUrl
  });

  const handleLoad = React.useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    console.log(`❌ Ошибка загрузки миниатюры ${thumbnailSize} для ${playerId}, переключаемся на оригинальный URL`);
    setImageError(true);
    onError?.();
  }, [onError, thumbnailSize, playerId]);

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: style?.borderRadius || size / 2,
    ...style
  };

  // Если нет URL или ошибка загрузки, показываем fallback
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
      <Image
        source={{ 
          uri: effectiveAvatarUrl,
          cache: 'force-cache'
        }}
        style={[imageStyle, {
          // Добавляем оптимизацию для ресайза
          resizeMode: 'cover'
        }]}
        onError={handleError}
        onLoad={handleLoad}
      />
    </View>
  );
};

export default CachedAvatar;