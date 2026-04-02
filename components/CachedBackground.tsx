import React from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

interface CachedBackgroundProps {
  source: number | { uri: string };
  style?: ViewStyle;
  children?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const CachedBackground: React.FC<CachedBackgroundProps> = React.memo(({
  source, 
  style, 
  children, 
  resizeMode = 'cover'
}) => {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit={resizeMode}
        priority="high"
        cachePolicy="memory-disk"
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
    // Android: тот же тон, что у экранов с льдом — меньше тёмной «рамки», если слой изображения чуть меньше вьюport
    backgroundColor: Platform.OS === 'android' ? '#87A3B1' : '#0c1418',
  }
});

export default CachedBackground;
