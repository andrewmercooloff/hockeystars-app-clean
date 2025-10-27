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
  // Используем useAvatarCache который подписывается на изменения через Realtime
  const cachedAvatarUrl = useAvatarCache(playerId, fallbackAvatarUrl);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [urlTimestamp, setUrlTimestamp] = React.useState(0);
  
  // Отслеживаем изменения URL и добавляем timestamp только при изменении
  React.useEffect(() => {
    if (fallbackAvatarUrl) {
      setUrlTimestamp(Date.now());
    }
  }, [fallbackAvatarUrl]);
  
  // Также отслеживаем изменения через Realtime (cachedAvatarUrl)
  React.useEffect(() => {
    if (cachedAvatarUrl && cachedAvatarUrl !== fallbackAvatarUrl) {
      setUrlTimestamp(Date.now());
    }
  }, [cachedAvatarUrl, fallbackAvatarUrl]);
  
  // Всегда используем cachedAvatarUrl (из Realtime) в первую очередь, затем fallbackAvatarUrl
  // cachedAvatarUrl обновляется автоматически через Realtime подписку
  const effectiveAvatarUrl = React.useMemo(() => {
    // Предпочитаем cachedAvatarUrl (обновляется через Realtime) перед fallbackAvatarUrl
    const url = cachedAvatarUrl || fallbackAvatarUrl;
    if (!url) return url;
    
    // Добавляем timestamp для обновления кеша expo-image
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${urlTimestamp}`;
  }, [cachedAvatarUrl, fallbackAvatarUrl, urlTimestamp]);

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
        key={effectiveAvatarUrl} // Key изменяется при изменении URL для принудительного обновления
        source={{ 
          uri: effectiveAvatarUrl
        }}
        style={imageStyle}
        contentFit="cover"
        onError={handleError}
        onLoad={handleLoad}
        cachePolicy="memory" // Убираем disk кеш чтобы всегда получать свежие изображения
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