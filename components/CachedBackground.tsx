import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, View, ViewStyle, LayoutChangeEvent } from 'react-native';
import { colors } from '../theme/colors';
import { ICE_BACKGROUND, ICE_RECYCLING_KEY } from '../utils/iceBackground';
import HockeyPattern from './HockeyPattern';

interface CachedBackgroundProps {
  source?: number | { uri: string };
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onLayout?: (event: LayoutChangeEvent) => void;
  /**
   * true (по умолчанию) — контентный экран: чистый графит без текстуры льда.
   * false — сцена со льдом (главное поле, игры, авторизация).
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
  if (vignette) {
    return (
      <View style={[styles.container, styles.plain, style]} onLayout={onLayout}>
        <LinearGradient
          pointerEvents="none"
          colors={['#16161b', colors.background, colors.scene]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <HockeyPattern />
        {children}
      </View>
    );
  }

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
  plain: {
    backgroundColor: colors.background,
  },
});

export default CachedBackground;
