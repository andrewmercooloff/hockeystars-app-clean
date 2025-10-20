import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Image, ImageProps, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AvatarImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  size?: number;
  fallbackIcon?: string;
  fallbackSize?: number;
  fallbackColor?: string;
  showLoadingIndicator?: boolean;
}

const AvatarImage: React.FC<AvatarImageProps> = React.memo(({
  uri,
  size = 45,
  fallbackIcon = 'person',
  fallbackSize = 25,
  fallbackColor = '#fff',
  showLoadingIndicator = false, // По умолчанию не показываем индикатор для аватаров
  style,
  onError,
  onLoad,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Начинаем с false, чтобы не показывать серый кружок
  const [imageLoaded, setImageLoaded] = useState(false);
  const lastSuccessfulUriRef = useRef<string | null>(null);
  const currentUriRef = useRef<string | null>(null);

  useEffect(() => {
    if (uri !== currentUriRef.current) {
      currentUriRef.current = uri;
      
      // Если URI изменился, сбрасываем состояние
      if (uri !== lastSuccessfulUriRef.current) {
        setImageLoaded(false);
        setImageError(false);
        // Не устанавливаем isLoading в true сразу, чтобы избежать серого кружка
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
      <View style={[style, { 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#333'
      }]}>
        <Ionicons name={fallbackIcon} size={fallbackSize} color={fallbackColor} />
      </View>
    );
  }

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style
  };

  return (
    <View style={imageStyle}>
      {/* Показываем предыдущее удачное изображение под текущей загрузкой, чтобы не мигало */}
      {lastSuccessfulUriRef.current && lastSuccessfulUriRef.current !== uri && (
        <Image
          source={{ uri: lastSuccessfulUriRef.current, cache: 'force-cache' as const }}
          style={imageStyle}
          {...props}
        />
      )}
      
      {/* Показываем текущее изображение сразу, без ожидания загрузки */}
      {uri && (
        <Image
          source={{ 
            uri,
            cache: 'force-cache',
            headers: {
              'Cache-Control': 'max-age=3600'
            }
          }}
          style={[imageStyle, { 
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
          zIndex: 1,
          borderRadius: size / 2
        }}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </View>
  );
});

AvatarImage.displayName = 'AvatarImage';

export default AvatarImage;
