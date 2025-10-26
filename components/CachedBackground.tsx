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
      />
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black', // Фоновый цвет на случай медленной загрузки
  }
});

export default CachedBackground;
