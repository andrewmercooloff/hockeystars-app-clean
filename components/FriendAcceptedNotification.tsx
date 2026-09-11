import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';
import { NOTIFICATION_CARD, NOTIFICATION_CARD_BLUR } from '../utils/notificationCard';

interface FriendAcceptedNotificationProps {
  playerName: string;
  playerId?: string;
  message: string;
  timestamp: string | number;
  playerAvatar?: string;
}

export default function FriendAcceptedNotification({
  playerName,
  playerId,
  message,
  timestamp,
  playerAvatar,
}: FriendAcceptedNotificationProps) {
  const { t } = useLanguage();

  const formatTime = (ts: string | number): string => {
    const now = new Date();
    const time = new Date(ts);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('justNow');
    if (diffInMinutes < 60) return t('minutesAgo', { minutes: diffInMinutes });
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return t('hoursAgo', { hours });
    }
    const days = Math.floor(diffInMinutes / 1440);
    return t('daysAgo', { days });
  };

  return (
    <BlurOrSolid
      intensity={55}
      tint="dark"
      style={styles.containerBlur}
    >
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
        {playerId ? (
          <CachedAvatar
            playerId={playerId}
            fallbackAvatarUrl={playerAvatar}
            size={50}
            style={styles.playerAvatar}
          />
        ) : playerAvatar ? (
          <Image
            source={{ uri: playerAvatar }}
            style={styles.playerAvatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={24} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.playerName} numberOfLines={1}>{playerName}</Text>
          <Text style={styles.timeText}>{formatTime(timestamp)}</Text>
        </View>

        <View style={styles.actionItem}>
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginRight: 8 }} />
          <Text style={styles.titleText}>{t('notifications.friendRequestAccepted')}</Text>
          </View>
          <View style={styles.friendshipBadge}>
            <Ionicons name="people-outline" size={16} color="#fff" />
          </View>
        </View>
      </View>
      </View>
    </BlurOrSolid>
  );
}

const styles = StyleSheet.create({
    containerBlur: {
    ...NOTIFICATION_CARD_BLUR,
  },
  container: {
    ...NOTIFICATION_CARD,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  timeText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    marginLeft: 8,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
  messageText: {
    color: '#d4d4d8',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginTop: 2,
  },
  friendshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 12,
    width: 28,
    height: 28,
  },
});


