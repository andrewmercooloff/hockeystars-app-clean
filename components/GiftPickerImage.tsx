import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  giftImageDisplayUrl,
  giftImageThumbUrl,
  isPngGiftUrl,
} from '../utils/giftImage';
import { rewriteSupabasePublicUrl } from '../utils/supabase';

type GiftPickerImageProps = {
  imageUrl: string | null | undefined;
  style?: object;
  fallbackIcon?: string;
  fallbackSize?: number;
  fallbackColor?: string;
};

/**
 * Gift thumbnail for the admin picker: small Supabase thumb (PNG alpha preserved),
 * falls back to original only if transform is unavailable.
 */
const GiftPickerImage: React.FC<GiftPickerImageProps> = React.memo(
  ({
    imageUrl,
    style,
    fallbackIcon = 'gift-outline',
    fallbackSize = 24,
    fallbackColor = '#fa2f40',
  }) => {
    const originalUrl = useMemo(
      () => rewriteSupabasePublicUrl(giftImageDisplayUrl(imageUrl)) || '',
      [imageUrl],
    );
    const thumbUrl = useMemo(() => giftImageThumbUrl(imageUrl), [imageUrl]);
    const isPng = useMemo(() => isPngGiftUrl(imageUrl), [imageUrl]);

    const [activeUrl, setActiveUrl] = useState(() => thumbUrl || originalUrl);

    useEffect(() => {
      setActiveUrl(thumbUrl || originalUrl);
    }, [thumbUrl, originalUrl]);

    const handleError = useCallback(() => {
      setActiveUrl((current) => {
        if (originalUrl && current !== originalUrl) {
          return originalUrl;
        }
        return '';
      });
    }, [originalUrl]);

    if (!activeUrl) {
      return (
        <View style={[style, styles.fallback]}>
          <Ionicons name={fallbackIcon as any} size={fallbackSize} color={fallbackColor} />
        </View>
      );
    }

    const source =
      Platform.OS === 'web'
        ? { uri: activeUrl }
        : { uri: activeUrl, headers: { 'Cache-Control': 'public, max-age=31536000' } };

    return (
      <Image
        source={source}
        style={[styles.fill, style, isPng && styles.pngImage]}
        contentFit="contain"
        cachePolicy="memory-disk"
        recyclingKey={activeUrl}
        transition={0}
        onError={handleError}
      />
    );
  },
);

GiftPickerImage.displayName = 'GiftPickerImage';

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  pngImage: {
    backgroundColor: 'transparent',
  },
  fallback: {
    backgroundColor: '#2a2430',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GiftPickerImage;
