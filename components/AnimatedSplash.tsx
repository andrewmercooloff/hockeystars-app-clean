import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

const LOGO = require('../assets/images/splash-icon.png');
const GLOW_SIZE = 340;

type Props = {
  /** Shared opacity driven by the root layout (fades whole overlay out). */
  opacity: Animated.Value;
};

const tap = (style: Haptics.ImpactFeedbackStyle) => {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style).catch(() => {});
};

/**
 * Клюшка бьёт по шайбе, шайба уходит и катится к воротам: резкий удар, затем
 * всё более редкие и мягкие толчки — шайба теряет скорость, — и глухой удар в сетке.
 */
const SLAPSHOT: { at: number; style: Haptics.ImpactFeedbackStyle }[] = [
  { at: 0, style: Haptics.ImpactFeedbackStyle.Heavy },
  { at: 110, style: Haptics.ImpactFeedbackStyle.Light },
  { at: 250, style: Haptics.ImpactFeedbackStyle.Light },
  { at: 420, style: Haptics.ImpactFeedbackStyle.Soft },
  { at: 620, style: Haptics.ImpactFeedbackStyle.Soft },
  { at: 860, style: Haptics.ImpactFeedbackStyle.Medium },
];

/**
 * Launch splash: logo rises with a soft spring, a warm brand glow breathes
 * behind it, and a slapshot runs through the haptics as it lands.
 * Exit zoom is derived from the shared opacity so the logo "steps forward"
 * as the overlay dissolves into the home screen.
 */
const AnimatedSplash: React.FC<Props> = ({ opacity }) => {
  const enter = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shots: ReturnType<typeof setTimeout>[] = [];
    for (const step of SLAPSHOT) {
      if (step.at === 0) tap(step.style);
      else shots.push(setTimeout(() => tap(step.style), step.at));
    }

    // Меньше демпфирования: логотип чуть проскакивает и осаживается назад — визуальный удар.
    Animated.spring(enter, {
      toValue: 1,
      damping: 11,
      stiffness: 155,
      mass: 0.9,
      useNativeDriver: true,
    }).start();

    // Breathing glow with a soft haptic on each peak — the logo "beats".
    let alive = true;
    let current: Animated.CompositeAnimation | null = null;
    const inhale = () => {
      if (!alive) return;
      current = Animated.timing(glow, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
      current.start(({ finished }) => {
        if (!alive || !finished) return;
        tap(Haptics.ImpactFeedbackStyle.Light);
        exhale();
      });
    };
    const exhale = () => {
      if (!alive) return;
      current = Animated.timing(glow, {
        toValue: 0,
        duration: 1100,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
      current.start(({ finished }) => {
        if (alive && finished) inhale();
      });
    };
    inhale();

    return () => {
      alive = false;
      current?.stop();
      shots.forEach(clearTimeout);
    };
  }, [enter, glow]);

  const enterScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const enterY = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  // Overlay fading out (1 → 0) pushes the logo slightly toward the viewer.
  const exitScale = opacity.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] });

  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const glowOpacity = Animated.multiply(
    enter,
    glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.9] })
  );

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      >
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id="splashGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#fa2f40" stopOpacity="0.55" />
              <Stop offset="45%" stopColor="#fa2f40" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#fa2f40" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#splashGlow)" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={{
          opacity: enter,
          transform: [{ translateY: enterY }, { scale: Animated.multiply(enterScale, exitScale) }],
        }}
      >
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  logo: {
    width: 200,
    height: 200,
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
  },
});

export default AnimatedSplash;
