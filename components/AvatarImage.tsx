import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Image, ImageProps, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { avatarCache } from '../utils/AvatarCache';
import { rewriteSupabasePublicUrl } from '../utils/supabase';

interface AvatarImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  playerId?: string; // Добавляем playerId для кеширования
  size?: number;
  fallbackIcon?: string;
  fallbackSize?: number;
  fallbackColor?: string;
  showLoadingIndicator?: boolean;
}

const AvatarImage: React.FC<AvatarImageProps> = React.memo(({
  uri,
  playerId,
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

  // Получаем актуальный аватар из кеша, если есть playerId
  const cachedAvatarUrl = playerId ? avatarCache.getAvatar(playerId) : null;
  const effectiveUri = rewriteSupabasePublicUrl(cachedAvatarUrl || uri) || uri;

  useEffect(() => {
    if (effectiveUri !== currentUriRef.current) {
      currentUriRef.current = effectiveUri;
      
      // Если URI изменился, сбрасываем состояние
      if (effectiveUri !== lastSuccessfulUriRef.current) {
        setImageLoaded(false);
        setImageError(false);
        // Не устанавливаем isLoading в true сразу, чтобы избежать серого кружка
      }
    }
  }, [effectiveUri]);

  const handleError = useCallback((error: any) => {
    setImageError(true);
    setIsLoading(false);
    setImageLoaded(false);
    onError?.(error);
  }, [onError]);

  const handleLoad = useCallback(() => {
    lastSuccessfulUriRef.current = effectiveUri;
    setIsLoading(false);
    setImageError(false);
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad, effectiveUri]);

  // Если есть ошибка и нет предыдущего удачного изображения, показываем fallback
  if ((imageError || !effectiveUri) && !lastSuccessfulUriRef.current) {
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
      {lastSuccessfulUriRef.current && lastSuccessfulUriRef.current !== effectiveUri && (
        <Image
          source={{ uri: lastSuccessfulUriRef.current, cache: 'force-cache' as const }}
          style={imageStyle}
          {...props}
        />
      )}
      
      {/* Показываем текущее изображение сразу, без ожидания загрузки */}
      {effectiveUri && (
        <Image
          source={{ 
            uri: effectiveUri,
            cache: 'force-cache',
            headers: {
              'Cache-Control': 'max-age=3600'
            }
          }}
          style={[imageStyle, { 
            position: lastSuccessfulUriRef.current && lastSuccessfulUriRef.current !== effectiveUri ? 'absolute' : undefined, 
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
      
      {/* Убираем индикатор загрузки - аватары должны загружаться мгновенно */}
    </View>
  );
});

AvatarImage.displayName = 'AvatarImage';

export default AvatarImage;
