import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientOverlayProps {
  children: React.ReactNode;
  style?: any;
}

export default function GradientOverlay({ children, style }: GradientOverlayProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['rgba(121, 140, 143, 0.78)', 'rgba(111, 98, 122, 0.78)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
