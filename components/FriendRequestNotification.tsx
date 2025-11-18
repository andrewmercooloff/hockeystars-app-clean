import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface FriendRequestNotificationProps {
  playerName: string;
  playerId?: string;
  timestamp: string | number;
  playerAvatar?: string;
}

export default function FriendRequestNotification({
  playerName,
  playerId,
  timestamp,
  playerAvatar,
}: FriendRequestNotificationProps) {
  const { t } = useLanguage();

  const formatTime = (timestamp: string | number): string => {
    const now = new Date();
    const time = typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return t('justNow');
    } else if (diffInMinutes < 60) {
      return t('minutesAgo', { minutes: diffInMinutes });
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return t('hoursAgo', { hours });
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return t('daysAgo', { days });
    }
  };

  return (
    <BlurView
      intensity={20}
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
          <Text style={styles.playerName} numberOfLines={1}>
            {playerName}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(timestamp)}
          </Text>
        </View>

        <View style={styles.requestItem}>
          <Text style={styles.actionText}>
            {t('notifications.wantsToAddAsFriend')}
          </Text>
          <View style={styles.friendshipBadge}>
            <Ionicons name="people-outline" size={16} color="#fff" />
          </View>
        </View>
      </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  containerBlur: {
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 8,
    overflow: 'hidden',
  },
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF8243', // Оранжевый цвет для уведомлений о дружбе (RGB: 255,130,67)
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
    marginBottom: 8,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  timeText: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    marginLeft: 8,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionText: {
    color: '#ddd',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  friendshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8243', // Оранжевый цвет для уведомлений о дружбе (RGB: 255,130,67)
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 12,
    width: 28,
    height: 28,
  },
});
