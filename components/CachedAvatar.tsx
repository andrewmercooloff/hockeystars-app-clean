import React from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvatarCache } from '../utils/AvatarCache';

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

const CachedAvatar: React.FC<CachedAvatarProps> = React.memo(({
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

  // Используем кешированный аватар или fallback
  const effectiveAvatarUrl = cachedAvatarUrl || fallbackAvatarUrl;

  const handleLoad = React.useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  }, [onLoad, playerId, effectiveAvatarUrl]);

  const handleError = React.useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError, playerId, effectiveAvatarUrl]);

  const imageStyle = React.useMemo(() => ({
    width: size,
    height: size,
    borderRadius: style?.borderRadius || size / 2,
    ...style
  }), [size, style]);

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
          uri: effectiveAvatarUrl
        }}
        style={imageStyle}
        contentFit="cover"
        onError={handleError}
        onLoad={handleLoad}
        cachePolicy="memory-disk"
        priority="high"
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Глубокое сравнение пропсов для мемоизации
  return (
    prevProps.playerId === nextProps.playerId &&
    prevProps.fallbackAvatarUrl === nextProps.fallbackAvatarUrl &&
    prevProps.size === nextProps.size &&
    prevProps.fallbackIcon === nextProps.fallbackIcon &&
    prevProps.fallbackSize === nextProps.fallbackSize &&
    prevProps.fallbackColor === nextProps.fallbackColor
  );
});

export default CachedAvatar;