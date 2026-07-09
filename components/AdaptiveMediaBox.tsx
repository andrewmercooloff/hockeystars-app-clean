import React from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { useMediaAspectSize } from '../utils/mediaAspectSize';

type AdaptiveMediaBoxProps = {
  uri: string;
  maxWidth: number;
  mediaKind: 'image' | 'video';
  style?: ViewStyle;
  borderRadius?: number;
  children: React.ReactNode;
};

/** Контейнер с шириной maxWidth и высотой по реальным пропорциям медиа. */
export default function AdaptiveMediaBox({
  uri,
  maxWidth,
  mediaKind,
  style,
  borderRadius = 12,
  children,
}: AdaptiveMediaBoxProps) {
  const { width, height, ready } = useMediaAspectSize(uri, maxWidth, mediaKind);

  return (
    <View style={[styles.box, { width, height, borderRadius }, style]}>
      {!ready ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="small" color="#fa2f40" />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
