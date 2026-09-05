import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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

function normalizeImageUrl(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object') {
    const obj = raw as { url?: unknown; uri?: unknown };
    if (typeof obj.url === 'string') return obj.url.trim();
    if (typeof obj.uri === 'string') return obj.uri.trim();
  }
  return '';
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
  const resolvedImageUrl = rewriteSupabasePublicUrl(normalizeImageUrl(imageUrl)) || '';
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [resolvedImageUrl]);

  const handleLoad = React.useCallback(() => {
    setImageError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError]);

  if (!resolvedImageUrl || imageError) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Ionicons
          name={fallbackIcon as any}
          size={fallbackSize}
          color={fallbackColor}
        />
      </View>
    );
  }

  // Custom Cache-Control request headers break CORS on web (preflight).
  const source =
    Platform.OS === 'web'
      ? { uri: resolvedImageUrl }
      : {
          uri: resolvedImageUrl,
          headers: { 'Cache-Control': 'public, max-age=31536000' },
        };

  return (
    <Image
      source={source}
      style={[styles.fill, style]}
      contentFit={resizeMode}
      onError={handleError}
      onLoad={handleLoad}
      cachePolicy="memory-disk"
      priority="normal"
      transition={0}
      recyclingKey={resolvedImageUrl}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.style === nextProps.style &&
    prevProps.resizeMode === nextProps.resizeMode
  );
});

CachedImage.displayName = 'CachedImage';

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});

export default CachedImage;
