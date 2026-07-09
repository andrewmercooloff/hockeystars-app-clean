import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { Image } from 'expo-image';
import React from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

const HOME_TAB_STAR = require('../assets/images/home-tab-star.png');

const starScale = new Animated.Value(1);

const STAR_SIZE_SCALE = 1.15;

/** Смещение «тени» — чёрная звезда чуть левее белой. */
const STAR_SHADOW_OFFSET_X = -2.5 * STAR_SIZE_SCALE;

export function playHomeStarPressAnimation() {
  starScale.stopAnimation(() => {
    starScale.setValue(1);
    Animated.sequence([
      Animated.timing(starScale, {
        toValue: 0.86,
        duration: 75,
        useNativeDriver: true,
      }),
      Animated.spring(starScale, {
        toValue: 1,
        friction: 5,
        tension: 280,
        useNativeDriver: true,
      }),
    ]).start();
  });
}

export function HomeStarTabIcon({ size = 24 }: { size?: number }) {
  const baseSize = Platform.OS === 'ios' ? (size - 2) * 1.1 : size - 2;
  const iconSize = baseSize * 1.05 * STAR_SIZE_SCALE;
  const boxSize = 40 * 1.1 * STAR_SIZE_SCALE;

  return (
    <View style={styles.iconSlot}>
      <Animated.View
        style={[
          styles.starCircle,
          {
            width: boxSize,
            height: boxSize,
            borderRadius: boxSize / 2,
            transform: [{ scale: starScale }],
          },
        ]}
      >
        {/* Чёрная звезда позади, сдвинута влево (darken на красном → чёрный контур) */}
        <Image
          source={HOME_TAB_STAR}
          style={[
            styles.starLayer,
            {
              width: iconSize,
              height: iconSize,
              transform: [{ translateX: STAR_SHADOW_OFFSET_X }],
              mixBlendMode: 'darken',
            },
          ]}
          contentFit="contain"
          transition={0}
        />
        {/* Белая звезда сверху (lighten на красном → белый контур) */}
        <Image
          source={HOME_TAB_STAR}
          style={[
            styles.starLayer,
            {
              width: iconSize,
              height: iconSize,
              mixBlendMode: 'lighten',
            },
          ]}
          contentFit="contain"
          transition={0}
        />
      </Animated.View>
    </View>
  );
}

export function HomeStarTabButton(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        playHomeStarPressAnimation();
        props.onPressIn?.(ev);
      }}
      onPress={(ev) => {
        playHomeStarPressAnimation();
        props.onPress?.(ev);
      }}
    />
  );
}

const styles = StyleSheet.create({
  iconSlot: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 28 * STAR_SIZE_SCALE,
    height: 28 * STAR_SIZE_SCALE,
    marginTop: Platform.OS === 'android' ? -1 : 0,
  },
  starCircle: {
    backgroundColor: '#fa2f40',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  starLayer: {
    position: 'absolute',
  },
});
