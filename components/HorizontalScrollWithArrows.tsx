import React, { useCallback, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsDesktopLayout } from '../hooks/useIsDesktopLayout';

type Props = {
  children: React.ReactNode;
  /** Approximate step when clicking an arrow (defaults to ~70% of visible width). */
  scrollStep?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  showsHorizontalScrollIndicator?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  removeClippedSubviews?: boolean;
  decelerationRate?: 'fast' | 'normal' | number;
};

/**
 * Horizontal ScrollView with left/right chevrons on desktop (no finger swipe).
 */
export default function HorizontalScrollWithArrows({
  children,
  scrollStep,
  contentContainerStyle,
  style,
  showsHorizontalScrollIndicator = false,
  onScroll,
  scrollEventThrottle = 16,
  removeClippedSubviews,
  decelerationRate = 'fast',
}: Props) {
  const isDesktop = useIsDesktopLayout();
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);

  const canScroll = contentWidth > layoutWidth + 12;
  const showLeft = isDesktop && canScroll && offsetX > 8;
  const showRight = isDesktop && canScroll && offsetX < contentWidth - layoutWidth - 8;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x;
      offsetRef.current = x;
      setOffsetX(x);
      onScroll?.(event);
    },
    [onScroll],
  );

  const scrollBy = useCallback(
    (direction: -1 | 1) => {
      const step = scrollStep ?? Math.max(Math.round(layoutWidth * 0.7), 160);
      const maxX = Math.max(0, contentWidth - layoutWidth);
      const next = Math.max(0, Math.min(maxX, offsetRef.current + direction * step));
      scrollRef.current?.scrollTo({ x: next, animated: true });
      offsetRef.current = next;
      setOffsetX(next);
    },
    [scrollStep, layoutWidth, contentWidth],
  );

  return (
    <View
      style={[styles.wrap, style]}
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        contentContainerStyle={contentContainerStyle}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
        removeClippedSubviews={removeClippedSubviews}
        decelerationRate={decelerationRate}
        onContentSizeChange={(w) => setContentWidth(w)}
      >
        {children}
      </ScrollView>

      {showLeft ? (
        <TouchableOpacity
          style={[styles.arrow, styles.arrowLeft]}
          onPress={() => scrollBy(-1)}
          accessibilityRole="button"
          accessibilityLabel="Scroll left"
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}

      {showRight ? (
        <TouchableOpacity
          style={[styles.arrow, styles.arrowRight]}
          onPress={() => scrollBy(1)}
          accessibilityRole="button"
          accessibilityLabel="Scroll right"
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  arrowLeft: {
    left: 4,
  },
  arrowRight: {
    right: 4,
  },
});
