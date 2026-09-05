import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';
import {
  APP_STORE_URL,
  GET_APP_URL,
  GOOGLE_PLAY_URL,
  detectWebStorePlatform,
  openAppStore,
  type WebStorePlatform,
} from '../utils/appStores';

const DISMISS_KEY = 'hs_install_prompt_dismissed_v2';
const TOAST_DELAY_MS = 5000;

type Props = {
  /** banner = mobile web CTA; toast = desktop corner popup */
  variant?: 'banner' | 'toast';
};

export default function InstallAppPrompt({ variant = 'banner' }: Props) {
  const { t } = useLanguage();
  const platform = useMemo(() => detectWebStorePlatform(), []);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(variant !== 'toast');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const v = await AsyncStorage.getItem(DISMISS_KEY);
        if (cancelled) return;
        if (v === '1') {
          setDismissed(true);
          setReady(true);
          return;
        }
        setReady(true);
        if (variant === 'toast') {
          timer = setTimeout(() => {
            if (!cancelled) setVisible(true);
          }, TOAST_DELAY_MS);
        } else {
          setVisible(true);
        }
      } catch {
        if (!cancelled) {
          setReady(true);
          if (variant === 'toast') {
            timer = setTimeout(() => setVisible(true), TOAST_DELAY_MS);
          } else {
            setVisible(true);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [variant]);

  const dismiss = useCallback(async () => {
    setDismissed(true);
    setVisible(false);
    try {
      await AsyncStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  if (Platform.OS !== 'web') return null;
  if (!ready || dismissed || !visible) return null;

  if (variant === 'toast') {
    return (
      <View style={styles.toast} pointerEvents="box-none">
        <View style={styles.toastCard}>
          <Pressable onPress={dismiss} hitSlop={8} style={styles.toastClose} accessibilityLabel="Close">
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
          <View style={styles.toastQr}>
            <QRCode value={GET_APP_URL} size={88} color="#ffffff" backgroundColor="#0a0010" />
          </View>
          <Text style={styles.toastTitle}>{t('download.installTitle') || 'Install the app'}</Text>
        </View>
      </View>
    );
  }

  const storeLabel =
    platform === 'ios'
      ? t('download.appStoreCta') || 'Get it on the App Store'
      : platform === 'android'
        ? t('download.playStoreCta') || 'Get it on Google Play'
        : t('download.installTitle') || 'Install the app';

  const storeIcon: keyof typeof Ionicons.glyphMap =
    platform === 'ios' ? 'logo-apple' : platform === 'android' ? 'logo-google' : 'phone-portrait-outline';

  return (
    <View style={styles.banner}>
      <Pressable
        onPress={() => openAppStore(platform as WebStorePlatform)}
        style={({ pressed }) => [styles.bannerBtn, pressed && styles.pressed]}
        accessibilityRole="link"
        accessibilityLabel={storeLabel}
      >
        <Ionicons name={storeIcon} size={18} color="#fff" />
        <Text style={styles.bannerText} numberOfLines={1}>
          {storeLabel}
        </Text>
      </Pressable>
      <Pressable onPress={dismiss} hitSlop={10} style={styles.closeBtn} accessibilityLabel="Close">
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export const INSTALL_LINKS = {
  appStore: APP_STORE_URL,
  playStore: GOOGLE_PLAY_URL,
  getApp: GET_APP_URL,
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    zIndex: 2000,
    elevation: 2000,
  },
  toastCard: {
    width: 148,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.4)',
    backgroundColor: 'rgba(8, 0, 12, 0.96)',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
      } as any,
    }),
  },
  toastClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  toastQr: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0a0010',
    marginBottom: 8,
  },
  toastTitle: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 6,
  },
  bannerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fa2f40',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    flexShrink: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
