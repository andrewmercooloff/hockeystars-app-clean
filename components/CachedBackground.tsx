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
        {/* Нестандартный фон: диагональный графит + боковые bloom'ы, не плоский linear. */}
        <LinearGradient
          pointerEvents="none"
          colors={['#22161c', '#141014', '#0c0a0e', '#161018']}
          locations={[0, 0.32, 0.68, 1]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Фирменный bloom слева-сверху */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(250,47,64,0.20)', 'rgba(250,47,64,0.06)', 'transparent']}
          locations={[0, 0.38, 0.78]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Холодный подъём справа-снизу */}
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(70,85,120,0.10)', 'rgba(18,14,22,0.55)']}
          locations={[0.35, 0.72, 1]}
          start={{ x: 0.15, y: 0.25 }}
          end={{ x: 1, y: 1 }}
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
