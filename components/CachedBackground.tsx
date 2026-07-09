import React from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, View, ViewStyle, LayoutChangeEvent } from 'react-native';
import { colors } from '../theme/colors';
import { ICE_BACKGROUND, ICE_RECYCLING_KEY } from '../utils/iceBackground';

interface CachedBackgroundProps {
  source?: number | { uri: string };
  style?: ViewStyle;
  children?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onLayout?: (event: LayoutChangeEvent) => void;
}

const CachedBackground: React.FC<CachedBackgroundProps> = React.memo(({
  source = ICE_BACKGROUND,
  style,
  children,
  resizeMode = 'cover',
  onLayout,
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
        transition={0}
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
});

export default CachedBackground;
