import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, Text, TouchableOpacity, View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CachedAvatar from './CachedAvatar';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { useIsDesktopLayout } from '../hooks/useIsDesktopLayout';
import { colors } from '../theme/colors';
import { navigateToPlayerProfile } from '../utils/navigateToPlayer';

const logo = require('../assets/images/logo.png');

const LogoHeader = React.memo(() => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser, refreshUser } = useUser();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktopLayout();
  const isMobileWeb = Platform.OS === 'web' && !isDesktop;

  useEffect(() => {
    if (params.refresh) {
      refreshUser(true);
    }
  }, [params.refresh, refreshUser]);

  const headerHeight = isMobileWeb ? 58 : Platform.OS === 'web' ? 88 : 128;
  const logoW = isMobileWeb ? 112 : 168;
  const logoH = isMobileWeb ? 38 : 56;
  const avatarSize = isMobileWeb ? 38 : 51;
  const sidePad = isMobileWeb ? 12 : 24;

  return (
    <View
      style={{
        height: headerHeight,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: isMobileWeb ? 4 : 5,
        paddingTop: Platform.OS === 'android' ? insets.top : 0,
        backgroundColor: colors.scene,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.borderAccent,
      }}
    >
      <TouchableOpacity
        style={{ marginLeft: sidePad, marginBottom: isMobileWeb ? 0 : -5 }}
        onPress={() => router.push(Platform.OS === 'web' ? '/feed' : '/')}
        activeOpacity={0.7}
      >
        <Image source={logo} style={{ width: logoW, height: logoH }} resizeMode="contain" />
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          alignItems: 'center',
          marginRight: sidePad,
          minHeight: isMobileWeb ? 48 : 70,
          marginBottom: isMobileWeb ? 2 : -6,
        }}
        onPress={() => {
          if (currentUser) {
            navigateToPlayerProfile(router, {
              playerId: currentUser.id,
              name: currentUser.name,
              lang: language,
            });
          } else {
            router.push('/login');
          }
        }}
      >
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: currentUser ? colors.brand : colors.border,
          }}
        >
          {currentUser ? (
            <CachedAvatar
              playerId={currentUser.id}
              fallbackAvatarUrl={currentUser.avatar}
              size={avatarSize - 6}
              fallbackIcon="person"
              fallbackSize={isMobileWeb ? 18 : 25}
              fallbackColor="#fff"
            />
          ) : (
            <Ionicons name="person" size={isMobileWeb ? 18 : 25} color={colors.textMuted} />
          )}
        </View>
        {currentUser?.name?.trim() && !isMobileWeb ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              fontFamily: 'Gilroy-Regular',
              marginTop: 3,
            }}
            numberOfLines={1}
          >
            {currentUser.name.trim()}
          </Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
});

LogoHeader.displayName = 'LogoHeader';

export default LogoHeader;
