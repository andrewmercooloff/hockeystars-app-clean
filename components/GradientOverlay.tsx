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
        colors={['rgba(66, 1, 24, 0.41)', 'rgba(36, 0, 48, 0.49)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.98, y: 1 }}
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
