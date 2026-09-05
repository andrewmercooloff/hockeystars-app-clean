import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { colors } from '../theme/colors';
import { buildPlayerPublicUrl } from '../utils/playerSeoPath';

type Props = {
  bottomInset?: number;
};

type Target = {
  id: 'telegram' | 'whatsapp' | 'viber' | 'vk' | 'copy' | 'more';
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

const haptic = () => {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }
};

/** Открывает app-схему, при неудаче — https-fallback (t.me / wa.me открывают приложение как universal link). */
const openWithFallback = async (primary: string, fallback?: string) => {
  try {
    await Linking.openURL(primary);
    return true;
  } catch {
    if (!fallback) return false;
    try {
      await Linking.openURL(fallback);
      return true;
    } catch {
      return false;
    }
  }
};

export default function InviteFriendsPill({ bottomInset = 12 }: Props) {
  const { currentUser } = useUser();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tr = useCallback(
    (key: string, fallback: string) => {
      const v = t(key);
      return v === key || !v ? fallback : v;
    },
    [t],
  );

  const link = useMemo(
    () => (currentUser?.id ? buildPlayerPublicUrl(currentUser.id, currentUser.name, language as any) : ''),
    [currentUser?.id, currentUser?.name, language],
  );

  const text = useMemo(() => {
    const title = tr('home.inviteTitle', 'Присоединяйся к HockeyStars!');
    const body = tr(
      'home.inviteMessage',
      'Создай профиль хоккеиста, соревнуйся с друзьями и попади в топ лидеров льда.',
    );
    return `${title}\n${body}`;
  }, [tr]);

  const fullMessage = `${text}\n${link}`;

  const targets: Target[] = useMemo(
    () => [
      { id: 'telegram', label: 'Telegram', icon: 'paper-plane', color: '#2AABEE' },
      { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
      { id: 'viber', label: 'Viber', icon: 'call', color: '#7360F2' },
      { id: 'vk', label: 'VK', icon: 'chatbubbles', color: '#0077FF' },
      { id: 'copy', label: tr('home.copyLink', 'Копировать'), icon: copied ? 'checkmark' : 'link', color: '#ffffff' },
      { id: 'more', label: tr('home.moreApps', 'Ещё'), icon: 'ellipsis-horizontal', color: '#ffffff' },
    ],
    [tr, copied],
  );

  const systemShare = useCallback(async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: 'HockeyStars', text, url: link });
        return;
      }
      await Share.share({ message: fullMessage });
    } catch {
      // cancelled
    }
  }, [fullMessage, text, link]);

  const handleTarget = useCallback(
    async (id: Target['id']) => {
      haptic();
      const encText = encodeURIComponent(text);
      const encLink = encodeURIComponent(link);
      const encFull = encodeURIComponent(fullMessage);

      switch (id) {
        case 'telegram': {
          const ok = await openWithFallback(
            `tg://msg_url?url=${encLink}&text=${encText}`,
            `https://t.me/share/url?url=${encLink}&text=${encText}`,
          );
          if (!ok) await systemShare();
          break;
        }
        case 'whatsapp': {
          const ok = await openWithFallback(
            `whatsapp://send?text=${encFull}`,
            `https://wa.me/?text=${encFull}`,
          );
          if (!ok) await systemShare();
          break;
        }
        case 'viber': {
          const ok = await openWithFallback(`viber://forward?text=${encFull}`);
          if (!ok) await systemShare();
          break;
        }
        case 'vk': {
          const ok = await openWithFallback(
            `vk://vk.com/share.php?url=${encLink}`,
            `https://vk.com/share.php?url=${encLink}&title=${encText}`,
          );
          if (!ok) await systemShare();
          break;
        }
        case 'copy': {
          try {
            await Clipboard.setStringAsync(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            await systemShare();
          }
          return;
        }
        case 'more':
          await systemShare();
          break;
      }
      setOpen(false);
    },
    [text, link, fullMessage, systemShare],
  );

  if (!currentUser) return null;

  return (
    <>
      <View style={[styles.wrap, { bottom: bottomInset }]} pointerEvents="box-none">
        <Pressable
          onPress={() => {
            haptic();
            setOpen(true);
          }}
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
          accessibilityRole="button"
          accessibilityLabel={tr('home.inviteFriends', 'Пригласить друзей')}
        >
          <Text style={styles.label} numberOfLines={1}>
            {tr('home.inviteFriends', 'Пригласить')}
          </Text>
          <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>{tr('home.inviteFriends', 'Пригласить друзей')}</Text>
            <Text style={styles.sheetSubtitle} numberOfLines={2}>
              {tr('home.inviteSubtitle', 'Отправь ссылку — друзья попадут прямо на твой профиль')}
            </Text>

            <View style={styles.grid}>
              {targets.map((tg) => (
                <Pressable
                  key={tg.id}
                  onPress={() => handleTarget(tg.id)}
                  style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                  accessibilityRole="button"
                  accessibilityLabel={tg.label}
                >
                  <View
                    style={[
                      styles.tileIcon,
                      { backgroundColor: tg.color === '#ffffff' ? 'rgba(255,255,255,0.08)' : tg.color },
                    ]}
                  >
                    <Ionicons name={tg.icon} size={22} color="#fff" />
                  </View>
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {tg.id === 'copy' && copied ? tr('profile.linkCopied', 'Скопировано') : tg.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.linkRow}>
              <Ionicons name="link-outline" size={14} color={colors.textMuted} />
              <Text style={styles.linkText} numberOfLines={1}>
                {link.replace(/^https?:\/\//, '')}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    zIndex: 1100,
    elevation: 1100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 20, 24, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 20px rgba(250, 47, 64, 0.18)' },
    }),
  },
  pillPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  iconRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    maxWidth: 120,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#16121c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 14,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    marginTop: 4,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  tile: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
  },
  tilePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  linkText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
});
