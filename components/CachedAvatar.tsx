import React from 'react';
import { Image } from 'expo-image';
import { View, Image as RNImage } from 'react-native';
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
  status?: string; // Добавляем статус для проверки скаута
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
  status,
}) => {
  // Используем useAvatarCache который подписывается на изменения через Realtime
  // ВАЖНО: Кеш имеет приоритет над fallbackAvatarUrl, даже если fallbackAvatarUrl изменился
  const cachedAvatarUrl = useAvatarCache(playerId, fallbackAvatarUrl);
  // Предполагаем что изображение уже загружено если есть URL в кеше
  const [imageLoaded, setImageLoaded] = React.useState(() => !!cachedAvatarUrl);
  const [imageError, setImageError] = React.useState(false);
  const [urlTimestamp, setUrlTimestamp] = React.useState(0);
  
  // Отслеживаем изменения URL и добавляем timestamp только при реальном изменении
  const prevUrlRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    // КРИТИЧНО: Используем только cachedAvatarUrl, fallbackAvatarUrl игнорируется если есть кеш
    const currentUrl = cachedAvatarUrl || fallbackAvatarUrl;
    
    // Обновляем timestamp только если URL действительно изменился
    // И только для локальных файлов - для HTTP URL используем кеш для мгновенного отображения
    if (currentUrl && currentUrl !== prevUrlRef.current) {
      prevUrlRef.current = currentUrl;
      // Timestamp нужен только для локальных файлов для принудительного обновления
      if (currentUrl.startsWith('file://') || currentUrl.startsWith('content://') || currentUrl.startsWith('data:')) {
        setUrlTimestamp(Date.now());
      } else {
        // Для HTTP URL не используем timestamp - кеш expo-image обеспечит мгновенное отображение
        setUrlTimestamp(0);
      }
      setImageLoaded(true);
    } else if (currentUrl) {
      setImageLoaded(true);
    }
  }, [cachedAvatarUrl, fallbackAvatarUrl]);
  
  // ВАЖНО: Всегда используем cachedAvatarUrl (из Realtime) в первую очередь
  // cachedAvatarUrl обновляется автоматически через Realtime подписку и имеет приоритет
  // НЕ используем fallbackAvatarUrl если cachedAvatarUrl существует, даже если fallbackAvatarUrl отличается
  // Это предотвращает переключение между старым и новым аватаром при повторной загрузке данных
  const effectiveAvatarUrl = React.useMemo(() => {
    // КРИТИЧНО: Если cachedAvatarUrl существует - используем ТОЛЬКО его
    // Игнорируем fallbackAvatarUrl полностью, чтобы избежать переключений
    if (cachedAvatarUrl) {
      // Для локальных файлов добавляем timestamp только если он был обновлен
      if ((cachedAvatarUrl.startsWith('file://') || cachedAvatarUrl.startsWith('content://') || cachedAvatarUrl.startsWith('data:')) && urlTimestamp > 0) {
        const separator = cachedAvatarUrl.includes('?') ? '&' : '?';
        return `${cachedAvatarUrl}${separator}t=${urlTimestamp}`;
      }
      // Для HTTP/HTTPS URL НЕ добавляем версию - используем кеш для мгновенного отображения
      return cachedAvatarUrl;
    }
    
    // Только если cachedAvatarUrl отсутствует - используем fallbackAvatarUrl
    const url = fallbackAvatarUrl;
    if (!url) return null;
    
    // Для локальных файлов добавляем timestamp только если он был обновлен
    if ((url.startsWith('file://') || url.startsWith('content://') || url.startsWith('data:')) && urlTimestamp > 0) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${urlTimestamp}`;
    }
    
    // Для HTTP/HTTPS URL НЕ добавляем версию - используем кеш для мгновенного отображения
    return url;
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

  // Для скаутов всегда показываем scout.png
  if (status === 'scout') {
    return (
      <View style={[imageStyle, { backgroundColor: 'transparent' }]}>
        <RNImage
          source={require('../assets/images/scout.png')}
          style={imageStyle}
          resizeMode="cover"
        />
      </View>
    );
  }

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
    <View style={[imageStyle, { backgroundColor: 'transparent' }]}>
      <Image
        key={`${playerId}-${effectiveAvatarUrl}`} // Key изменяется при изменении URL для принудительного обновления
        source={{ 
          uri: effectiveAvatarUrl
        }}
        style={imageStyle}
        contentFit="cover"
        onError={handleError}
        onLoad={handleLoad}
        cachePolicy="memory-disk" // Используем memory-disk кеш для мгновенного отображения
        priority="high"
        transition={0} // Мгновенный переход без анимации
        recyclingKey={playerId} // Используем playerId для правильного переиспользования компонента
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
    prevProps.fallbackColor === nextProps.fallbackColor &&
    prevProps.status === nextProps.status
  );
});

export default CachedAvatar;