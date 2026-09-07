import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../contexts/LanguageContext';
import {
  consumeOtaJustUpdated,
  setOtaReloadPresenter,
} from '../utils/otaReloadSignal';

const SWEEP_MS = 1400;
const FADE_IN_MS = 260;
const TOAST_MS = 3200;

/**
 * "Ice resurfacing" transition for OTA reloads.
 *
 * Before a visible reload the screen is covered by dark ice and a bright
 * resurfacer band sweeps top-to-bottom leaving fresh, glossy ice behind it —
 * then the JS bundle restarts. On the next launch a small toast confirms
 * that the update was applied, so the restart never feels like a crash.
 */
const OtaResurfaceOverlay: React.FC = () => {
  const { t } = useLanguage();
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<'hidden' | 'sweep' | 'toast'>('hidden');

  const fade = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const toast = useRef(new Animated.Value(0)).current;

  const runSweep = useCallback(
    (done: () => void) => {
      setMode('sweep');
      fade.setValue(0);
      sweep.setValue(0);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 1,
          duration: FADE_IN_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 1,
          duration: SWEEP_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        // Small hold so the last frame (fully fresh ice) is actually seen.
        setTimeout(done, 180);
      });
    },
    [fade, sweep]
  );

  useEffect(() => {
    setOtaReloadPresenter(runSweep);
    return () => setOtaReloadPresenter(null);
  }, [runSweep]);

  // Post-reload confirmation toast.
  useEffect(() => {
    let cancelled = false;
    void consumeOtaJustUpdated().then((justUpdated) => {
      if (!justUpdated || cancelled) return;
      setMode('toast');
      toast.setValue(0);
      Animated.sequence([
        Animated.delay(900),
        Animated.spring(toast, { toValue: 1, damping: 16, stiffness: 160, useNativeDriver: true }),
        Animated.delay(TOAST_MS),
        Animated.timing(toast, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && !cancelled) setMode('hidden');
      });
    });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  if (mode === 'hidden') return null;

  if (mode === 'toast') {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toastWrap,
          {
            opacity: toast,
            transform: [
              {
                translateY: toast.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }),
              },
            ],
          },
        ]}
      >
        <View style={styles.toast}>
          <Ionicons name="snow" size={16} color="#BFE9FF" />
          <Text style={styles.toastText}>{t('ota.updated')}</Text>
        </View>
      </Animated.View>
    );
  }

  const bandY = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, height + 40],
  });
  // Fresh ice grows from the top, following the resurfacer.
  const freshScale = sweep.interpolate({ inputRange: [0, 1], outputRange: [0.0001, 1] });
  const textOpacity = sweep.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, 1, 1, 0.6],
  });

  return (
    <Animated.View pointerEvents="auto" style={[styles.full, { opacity: fade }]}>
      {/* Scuffed ice: dark base */}
      <LinearGradient
        colors={['#0B1A2A', '#071220', '#040B14']}
        style={StyleSheet.absoluteFill}
      />

      {/* Fresh ice revealed behind the band */}
      <Animated.View
        style={[
          styles.fresh,
          { height, transform: [{ translateY: -height / 2 }, { scaleY: freshScale }, { translateY: height / 2 }] },
        ]}
      >
        <LinearGradient
          colors={['#1B3B5A', '#0F2A44', '#0A1D33']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.line, { top: height * 0.32 }]} />
        <View style={[styles.line, styles.lineBlue, { top: height * 0.5 }]} />
        <View style={[styles.line, { top: height * 0.68 }]} />
        <View style={[styles.circle, { top: height * 0.5 - 70 }]} />
      </Animated.View>

      {/* Resurfacer band with water sheen */}
      <Animated.View style={[styles.band, { transform: [{ translateY: bandY }] }]}>
        <LinearGradient
          colors={['rgba(191,233,255,0)', 'rgba(191,233,255,0.55)', 'rgba(255,255,255,0.95)', 'rgba(191,233,255,0.35)', 'rgba(191,233,255,0)']}
          locations={[0, 0.35, 0.5, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.caption, { opacity: textOpacity }]}>
        <Ionicons name="snow-outline" size={26} color="#BFE9FF" />
        <Text style={styles.title}>{t('ota.resurfacing')}</Text>
        <Text style={styles.subtitle}>{t('ota.updating')}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  full: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
    overflow: 'hidden',
  },
  fresh: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 78, 78, 0.55)',
  },
  lineBlue: {
    backgroundColor: 'rgba(96, 165, 250, 0.55)',
  },
  circle: {
    position: 'absolute',
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(96, 165, 250, 0.45)',
  },
  band: {
    position: 'absolute',
    left: -20,
    right: -20,
    height: 140,
  },
  caption: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: '18%',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: 'rgba(191, 233, 255, 0.8)',
    fontSize: 14,
  },
  toastWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 29, 51, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(191, 233, 255, 0.25)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default OtaResurfaceOverlay;
