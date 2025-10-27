import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CachedImageProps {
  imageUrl: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  fallbackIcon?: string;
  fallbackSize?: number;
  fallbackColor?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const CachedImage: React.FC<CachedImageProps> = React.memo(({
  imageUrl,
  style,
  resizeMode = 'cover',
  fallbackIcon = 'image-outline',
  fallbackSize = 20,
  fallbackColor = '#fff',
  onLoad,
  onError,
}) => {
  
  const [imageError, setImageError] = React.useState(false);

  const handleLoad = React.useCallback(() => {
    setImageError(false);
    onLoad?.();
  }, [onLoad, imageUrl]);

  const handleError = React.useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError, imageUrl]);

  // Если нет URL или ошибка загрузки, показываем fallback
  if (!imageUrl || imageError) {
    return (
      <View style={[style, {
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
    <Image
      source={{ 
        uri: imageUrl,
        cache: 'force-cache' // Принудительное кеширование
      }}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
      onLoad={handleLoad}
      fadeDuration={0} // Убираем анимацию для мгновенного отображения
    />
  );
}, (prevProps, nextProps) => {
  // Глубокое сравнение пропсов для мемоизации
  return (
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.style === nextProps.style &&
    prevProps.resizeMode === nextProps.resizeMode
  );
});

CachedImage.displayName = 'CachedImage';

export default CachedImage;