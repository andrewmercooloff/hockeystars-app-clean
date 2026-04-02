import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View, ViewStyle } from 'react-native';

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
    // Ближе к тону льда, пока expo-image не отрисовал кадр (меньше «вспышки» чёрного)
    backgroundColor: '#0c1418',
  }
});

export default CachedBackground;
