import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, View, ViewStyle, LayoutChangeEvent } from 'react-native';
import { colors } from '../theme/colors';
import { ICE_BACKGROUND, ICE_RECYCLING_KEY } from '../utils/iceBackground';

interface CachedBackgroundProps {
  source?: number | { uri: string };
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onLayout?: (event: LayoutChangeEvent) => void;
  /**
   * true (по умолчанию) — контентный экран: фон + лёгкое затемнение по центру для читаемости.
   * false — полная сцена (главное поле, игры, авторизация) без затемнения.
   */
  vignette?: boolean;
}

const CachedBackground: React.FC<CachedBackgroundProps> = React.memo(({
  source = ICE_BACKGROUND,
  style,
  children,
  resizeMode = 'cover',
  onLayout,
  vignette = true,
}) => {
  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit={resizeMode}
        priority="high"
        cachePolicy="memory-disk"
        recyclingKey={ICE_RECYCLING_KEY}
      />
      {vignette ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(8,8,14,0.35)', 'rgba(8,8,14,0.55)', 'rgba(8,8,14,0.4)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: Platform.OS === 'android' ? 'hidden' : undefined,
    backgroundColor: colors.iceFallback,
  },
});

export default CachedBackground;
