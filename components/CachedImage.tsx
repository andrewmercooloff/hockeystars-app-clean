import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { rewriteSupabasePublicUrl } from '../utils/supabase';

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
  const resolvedImageUrl = rewriteSupabasePublicUrl(imageUrl) || imageUrl;
  
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
  if (!resolvedImageUrl || imageError) {
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
        uri: resolvedImageUrl,
        headers: {
          'Cache-Control': 'public, max-age=31536000' // Кеш на 1 год
        }
      }}
      style={style}
      contentFit={resizeMode}
      onError={handleError}
      onLoad={handleLoad}
      cachePolicy="memory-disk" // Используем memory-disk кеш
      priority="normal"
      transition={0} // Мгновенный переход без анимации
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