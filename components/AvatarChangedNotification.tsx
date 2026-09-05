import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { platformCardShadow } from '../utils/androidShadow';
import { useLanguage } from '../contexts/LanguageContext';
import { rewriteSupabasePublicUrl } from '../utils/supabase';

interface AvatarChangedNotificationProps {
  playerName: string;
  playerId: string;
  playerAvatar?: string;
  newAvatarUrl?: string;
  timestamp: string;
}

const CARD_HORIZONTAL_INSET = 16 * 2 + 14 * 2;
const PREVIEW_SIZE = Math.min(
  Dimensions.get('window').width - CARD_HORIZONTAL_INSET,
  220
);

const AvatarChangedNotification = React.memo(function AvatarChangedNotification({
  playerName,
  playerId,
  playerAvatar,
  newAvatarUrl,
  timestamp,
}: AvatarChangedNotificationProps) {
  const { t } = useLanguage();
  const previewAvatar = React.useMemo(() => {
    const base = rewriteSupabasePublicUrl(newAvatarUrl || playerAvatar);
    if (!base) return null;
    const version = new Date(timestamp).getTime();
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}v=${version}`;
  }, [newAvatarUrl, playerAvatar, timestamp]);

  const formatTime = (ts: string): string => {
    const now = new Date();
    const time = new Date(ts);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return t('justNow');
    }
    if (diffInMinutes < 60) {
      return t('minutesAgo', { minutes: diffInMinutes });
    }
    if (diffInMinutes < 1440) {
      return t('hoursAgo', { hours: Math.floor(diffInMinutes / 60) });
    }
    return t('daysAgo', { days: Math.floor(diffInMinutes / 1440) });
  };

  return (
    <BlurOrSolid intensity={55} tint="dark" style={styles.containerBlur}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.avatarContainer}>
            {previewAvatar ? (
              <Image
                source={{ uri: previewAvatar }}
                style={styles.playerAvatarSmall}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
                recyclingKey={`avatar-notif-${playerId}-${previewAvatar.split('?')[0]}`}
              />
            ) : (
              <Ionicons name="person" size={20} color="#fff" />
            )}
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.header}>
              <Text style={styles.playerName} numberOfLines={1}>
                {playerName}
              </Text>
              <Text style={styles.timeText}>
                {formatTime(timestamp)}
              </Text>
            </View>

            <View style={styles.avatarItem}>
              <Text style={styles.actionText}>
                {t('avatarNotification.changed')}
              </Text>
              <View style={styles.avatarBadge}>
                <Ionicons name="camera-outline" size={14} color="#fff" />
              </View>
            </View>
          </View>
        </View>

        {previewAvatar ? (
          <View style={styles.previewWrap}>
            <Image
              source={{ uri: previewAvatar }}
              style={styles.previewAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={`avatar-notif-preview-${playerId}-${previewAvatar.split('?')[0]}`}
            />
          </View>
        ) : null}
      </View>
    </BlurOrSolid>
  );
});

export default AvatarChangedNotification;

const styles = StyleSheet.create({
  containerBlur: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    ...platformCardShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 5,
      elevation: 2,
    }),
  },
  container: {
    backgroundColor: '#1c1c21',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  playerAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  playerName: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  timeText: {
    color: '#a1a1aa',
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    marginLeft: 6,
  },
  avatarItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  avatarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewWrap: {
    marginTop: 12,
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
  },
  previewAvatar: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: PREVIEW_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
