import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

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
    </BlurView>
  );
}

const styles = StyleSheet.create({
    containerBlur: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  container: {
    backgroundColor: 'rgba(1, 0, 0, 0.75)',
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
    color: '#ddd',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginTop: 2,
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


