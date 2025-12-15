import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CachedAvatar from './CachedAvatar';
import { useLanguage } from '../contexts/LanguageContext';

interface FriendGiftReceivedNotificationProps {
  notification: {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    timestamp?: number;
    data: {
      playerId: string;
      playerName: string;
      playerAvatar?: string;
      starId?: string;
      starName: string;
      starAvatar?: string;
      giftName: string;
    };
  };
  isRead: boolean;
  onPress: () => void;
}

const FriendGiftReceivedNotification: React.FC<FriendGiftReceivedNotificationProps> = ({
  notification,
  isRead,
  onPress
}) => {
  const { t } = useLanguage();
  const { playerId, playerName, playerAvatar, starId, starName, starAvatar, giftName } = notification.data;

  const formatTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return t('justNow');
    } else if (diffInMinutes < 60) {
      return t('minutesAgo', { minutes: diffInMinutes });
    } else if (diffInMinutes < 1440) {
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
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <CachedAvatar
            playerId={starId || notification.data.playerId}
            fallbackAvatarUrl={starAvatar || playerAvatar}
            size={50}
            style={styles.playerAvatar}
          />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.playerName} numberOfLines={1}>
            {playerName}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(notification.createdAt || (notification.timestamp ? new Date(notification.timestamp).toISOString() : new Date().toISOString()))}
          </Text>
        </View>

        <View style={styles.giftItem}>
          <Text style={styles.actionText}>
            {notification.message || t('giftNotification.message', {
              playerName: playerName,
              giftName: giftName,
              starName: starName
            })}
          </Text>
          <View style={styles.giftBadge}>
            <Ionicons name="gift" size={14} color="#fff" />
          </View>
        </View>
      </View>
      </TouchableOpacity>
    </BlurView>
  );
};

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
    borderLeftColor: '#9C27B0',
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
  giftItem: {
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
  giftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    width: 32,
    height: 32,
  },
});

export default FriendGiftReceivedNotification;

