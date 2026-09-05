import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderAvatarProps {
  uri: string;
  size?: number;
  fallbackIcon?: string;
  fallbackSize?: number;
  fallbackColor?: string;
}

const HeaderAvatar: React.FC<HeaderAvatarProps> = React.memo(({
  uri,
  size = 45,
  fallbackIcon = 'person',
  fallbackSize = 25,
  fallbackColor = '#fff'
}) => {
  const [imageError, setImageError] = useState(false);
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
      }
    }
  }, [uri]);

  const handleError = useCallback((error: any) => {
    setImageError(true);
    setImageLoaded(false);
  }, []);

  const handleLoad = useCallback(() => {
    lastSuccessfulUriRef.current = uri;
    setImageError(false);
    setImageLoaded(true);
  }, [uri]);

  // Если есть ошибка и нет предыдущего удачного изображения, показываем fallback
  if ((imageError || !uri) && !lastSuccessfulUriRef.current) {
    return (
      <View style={{ 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#2a2430'
      }}>
        <Ionicons name={fallbackIcon} size={fallbackSize} color={fallbackColor} />
      </View>
    );
  }

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={imageStyle}>
      {/* Показываем предыдущее удачное изображение под текущей загрузкой, чтобы не мигало */}
      {lastSuccessfulUriRef.current && lastSuccessfulUriRef.current !== uri && (
        <Image
          source={{ uri: lastSuccessfulUriRef.current, cache: 'force-cache' as const }}
          style={imageStyle}
        />
      )}
      
      {/* Показываем текущее изображение сразу */}
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
            // Плавное появление
            opacity: imageLoaded ? 1 : 0.9
          }]}
          onError={handleError}
          onLoad={handleLoad}
        />
      )}
    </View>
  );
});

HeaderAvatar.displayName = 'HeaderAvatar';

export default HeaderAvatar;
