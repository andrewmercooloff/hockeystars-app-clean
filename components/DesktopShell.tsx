import { Ionicons } from '@expo/vector-icons';
import { displayName } from '../utils/displayName';
import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CachedAvatar from './CachedAvatar';
import InstallAppPrompt from './InstallAppPrompt';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { colors } from '../theme/colors';
import { navigateToPlayerProfile } from '../utils/navigateToPlayer';

const logo = require('../assets/images/logo.png');
const HOME_TAB_STAR = require('../assets/images/home-tab-star.png');

type NavKey = 'index' | 'messages' | 'notifications' | 'search' | 'exercises' | 'profile';

type NavItem = {
  key: NavKey;
  href: string;
  labelKey: string;
  icon?: keyof typeof Ionicons.glyphMap;
  requiresAuth?: boolean;
  badge?: number;
  homeStar?: boolean;
};

type DesktopShellProps = {
  children: React.ReactNode;
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
};

function pathMatches(pathname: string, href: string, key: NavKey): boolean {
  if (key === 'index') {
    return pathname === '/' || pathname === '/index' || pathname === '/feed';
  }
  if (key === 'profile') {
    return pathname.includes('/player/');
  }
  if (key === 'exercises') {
    return pathname.includes('/exercises');
  }
  if (key === 'messages') {
    return pathname.includes('/messages') || pathname.includes('/chat/');
  }
  return pathname.includes(href);
}

function NavRow({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  const { t } = useLanguage();
  const badge = item.badge && item.badge > 0 ? item.badge : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.navRow,
        active && { backgroundColor: colors.brandMuted },
        (hovered || pressed) && !active && { backgroundColor: colors.input },
      ]}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
    >
      {active ? <View style={[styles.navAccent, { backgroundColor: colors.brand }]} /> : null}
      <View style={styles.navIconWrap}>
        {item.homeStar ? (
          <Image source={HOME_TAB_STAR} style={styles.homeStar} contentFit="contain" />
        ) : (
          <Ionicons
            name={item.icon || 'ellipse-outline'}
            size={22}
            color={active ? colors.brand : colors.textMuted}
          />
        )}
        {badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.brand }]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.navLabel,
          { color: active ? colors.text : colors.textMuted },
          active && styles.navLabelActive,
        ]}
        numberOfLines={1}
      >
        {item.key === 'index' ? 'HockeyStars' : t(item.labelKey)}
      </Text>
    </Pressable>
  );
}

function DesktopSidebar({
  unreadMessagesCount = 0,
  unreadNotificationsCount = 0,
}: {
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { currentUser } = useUser();
  const { language, t } = useLanguage();

  const profileHint = useMemo(() => {
    if (!currentUser) {
      return `${t('auth.login')} / ${t('auth.register')}`;
    }
    const isAdmin =
      currentUser.status === 'admin' ||
      (currentUser.position || '').trim().toLowerCase() === 'администратор';
    const positionLabel = isAdmin
      ? t('profile.positions.Администратор') || t('profile.admin') || 'Administrator'
      : currentUser.position
        ? (() => {
            const key = `profile.positions.${currentUser.position}`;
            const translated = t(key);
            if (translated !== key && !translated.includes('Translation missing')) return translated;
            return currentUser.position;
          })()
        : '';
    const teamLabel = currentUser.team
      ? (() => {
          const key = `teams.${currentUser.team}`;
          const translated = t(key);
          if (translated !== key && !translated.startsWith('teams.')) return translated;
          return currentUser.team;
        })()
      : '';
    return [positionLabel, teamLabel].filter(Boolean).join(' · ') || t('profile.admin') || 'Profile';
  }, [currentUser, t]);

  const items = useMemo<NavItem[]>(
    () => [
      { key: 'index', href: '/feed', labelKey: 'tabs.home', homeStar: true },
      {
        key: 'notifications',
        href: '/notifications',
        labelKey: 'tabs.feed',
        icon: 'newspaper-outline',
        requiresAuth: true,
        badge: unreadNotificationsCount,
      },
      {
        key: 'messages',
        href: '/messages',
        labelKey: 'tabs.chat',
        icon: 'chatbubble-outline',
        requiresAuth: true,
        badge: unreadMessagesCount,
      },
      {
        key: 'search',
        href: '/search',
        labelKey: 'tabs.scout',
        icon: 'search-outline',
        requiresAuth: true,
      },
      {
        key: 'exercises',
        href: '/exercises',
        labelKey: 'tabs.skills',
        icon: 'barbell-outline',
        requiresAuth: true,
      },
    ],
    [unreadMessagesCount, unreadNotificationsCount]
  );

  const go = useCallback(
    (item: NavItem) => {
      if (item.requiresAuth && !currentUser) {
        router.replace('/login');
        return;
      }
      if (item.key === 'index') {
        router.push('/feed');
        return;
      }
      router.push(item.href as any);
    },
    [currentUser, router]
  );

  const openProfile = useCallback(() => {
    if (currentUser?.id) {
      navigateToPlayerProfile(router, {
        playerId: currentUser.id,
        name: currentUser.name,
        lang: language,
      });
    } else {
      router.replace('/login');
    }
  }, [currentUser, language, router]);

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: colors.sidebar,
          borderRightColor: colors.borderAccent,
        },
      ]}
    >
      <Pressable onPress={() => router.push('/feed')} style={styles.brand}>
        <Image source={logo} style={styles.brandLogo} contentFit="contain" />
      </Pressable>

      <View style={styles.navList}>
        {items.map((item) => (
          <NavRow
            key={item.key}
            item={item}
            active={pathMatches(pathname, item.href, item.key)}
            onPress={() => go(item)}
          />
        ))}
      </View>

      <View style={[styles.sidebarFooter, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={openProfile}
          style={({ hovered, pressed }) => [
            styles.profileCard,
            (hovered || pressed) && { backgroundColor: colors.input },
          ]}
        >
          <View style={[styles.profileAvatar, { borderColor: currentUser ? colors.brand : colors.border }]}>
            {currentUser ? (
              <CachedAvatar
                playerId={currentUser.id}
                fallbackAvatarUrl={currentUser.avatar}
                size={40}
                fallbackIcon="person"
                fallbackSize={20}
                fallbackColor={colors.text}
              />
            ) : (
              <Ionicons name="person" size={20} color={colors.text} />
            )}
          </View>
          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
              {currentUser?.name
                ? displayName(currentUser.name)
                : t('auth.login')}
            </Text>
            <Text style={[styles.profileHint, { color: colors.textMuted }]} numberOfLines={1}>
              {profileHint}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

/** Desktop chrome: left nav + main content */
export default function DesktopShell({
  children,
  unreadMessagesCount = 0,
  unreadNotificationsCount = 0,
}: DesktopShellProps) {
  return (
    <View style={[styles.shell, { backgroundColor: colors.scene }]}>
      <DesktopSidebar
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
      />
      <View style={[styles.centerColumn, { backgroundColor: colors.surfaceOverlay }]}>
        {children}
      </View>
      <InstallAppPrompt variant="toast" />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    position: 'relative',
  },
  sidebar: {
    width: 248,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-start',
  },
  brand: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  brandLogo: {
    width: 176,
    height: 58,
  },
  navList: {
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  navAccent: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  navIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  homeStar: {
    width: 26,
    height: 26,
  },
  navLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
  navLabelActive: {
    fontFamily: 'Gilroy-Bold',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
  },
  sidebarFooter: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2a2430',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  profileName: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
  },
  profileHint: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    marginTop: 2,
  },
  centerColumn: {
    flex: 1,
    minWidth: 0,
  },
});
