import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Image, ImageProps, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  fallbackIcon?: string;
  fallbackSize?: number;
  fallbackColor?: string;
  showLoadingIndicator?: boolean;
  cacheKey?: string;
}

// Упрощенная версия без предзагрузки для React Native

const CachedImage: React.FC<CachedImageProps> = React.memo(({
  uri,
  fallbackIcon = 'person',
  fallbackSize = 25,
  fallbackColor = '#fff',
  showLoadingIndicator = true,
  cacheKey,
  style,
  onError,
  onLoad,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Начинаем с false
  const [imageLoaded, setImageLoaded] = useState(false);
  const lastSuccessfulUriRef = useRef<string | null>(null);
  const currentUriRef = useRef<string | null>(null);

  useEffect(() => {
    // Если uri поменялся, запускаем загрузку, но показываем прошлое изображение
    if (uri !== currentUriRef.current) {
      currentUriRef.current = uri;
      
      // Если URI изменился, сбрасываем состояние
      if (uri !== lastSuccessfulUriRef.current) {
        setImageLoaded(false);
        setImageError(false);
        // Не устанавливаем isLoading в true сразу
      }
    }
  }, [uri]);

  const handleError = useCallback((error: any) => {
    setImageError(true);
    setIsLoading(false);
    setImageLoaded(false);
    onError?.(error);
  }, [onError]);

  const handleLoad = useCallback(() => {
    lastSuccessfulUriRef.current = uri;
    setIsLoading(false);
    setImageError(false);
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad, uri]);

  // Если есть ошибка и нет предыдущего удачного изображения, показываем fallback
  if ((imageError || !uri) && !lastSuccessfulUriRef.current) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name={fallbackIcon} size={fallbackSize} color={fallbackColor} />
      </View>
    );
  }

  return (
    <View style={style}>
      {/* Показываем предыдущее удачное изображение под текущей загрузкой, чтобы не мигало */}
      {lastSuccessfulUriRef.current && lastSuccessfulUriRef.current !== uri && (
        <Image
          source={{ uri: lastSuccessfulUriRef.current, cache: 'force-cache' as const }}
          style={style}
          // Не вешаем хендлеры, это фон
          {...props}
        />
      )}
      
      {/* Показываем текущее изображение сразу */}
      {uri && (
        <Image
          source={{ 
            uri,
            cache: 'force-cache', // Принудительное кеширование
            headers: {
              'Cache-Control': 'max-age=3600' // Кеш на 1 час
            }
          }}
          style={[style, { 
            position: lastSuccessfulUriRef.current && lastSuccessfulUriRef.current !== uri ? 'absolute' : undefined, 
            left: 0, 
            top: 0,
            // Добавляем прозрачность для плавного появления
            opacity: imageLoaded ? 1 : 0.8
          }]}
          onError={handleError}
          onLoad={handleLoad}
          {...props}
        />
      )}
      
      {/* Показываем индикатор загрузки только если изображение загружается и включен индикатор */}
      {isLoading && showLoadingIndicator && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1
        }}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </View>
  );
});

CachedImage.displayName = 'CachedImage';

export default CachedImage;
