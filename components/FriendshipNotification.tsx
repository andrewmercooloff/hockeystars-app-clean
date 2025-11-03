import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

interface FriendshipNotificationProps {
  friend1Name: string;
  friend2Name: string;
  timestamp: string;
  friend1Avatar?: string | null;
  friend2Avatar?: string | null;
  confirmedBy?: string;
  onPress?: () => void;
}

export default function FriendshipNotification({
  friend1Name,
  friend2Name,
  timestamp,
  friend1Avatar,
  friend2Avatar,
  confirmedBy,
  onPress,
}: FriendshipNotificationProps) {
  const { t } = useLanguage();

  const formatTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
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

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.avatarsContainer}>
        <View style={[styles.avatarWrapper, styles.firstAvatar]}>
          {friend1Avatar ? (
            <Image
              source={{ uri: friend1Avatar }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person-outline" size={20} color="#fff" />
          )}
        </View>
        <View style={[styles.avatarWrapper, styles.secondAvatar]}>
          {friend2Avatar ? (
            <Image
              source={{ uri: friend2Avatar }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person-outline" size={20} color="#fff" />
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.friendsText} numberOfLines={1}>
            {friend1Name} и {friend2Name}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(timestamp)}
          </Text>
        </View>

        <View style={styles.actionItem}>
          <Text style={styles.actionText}>
            {t('friendshipNotification.became')}
          </Text>
          <View style={styles.friendshipBadge}>
            <Ionicons name="people-outline" size={16} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF8243', // Оранжевый цвет для уведомлений о дружбе (RGB: 255,130,67)
  },
  avatarsContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
    position: 'relative',
  },
  avatarWrapper: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.8)',
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
  firstAvatar: {
    top: 0,
    left: 0,
    zIndex: 2,
  },
  secondAvatar: {
    top: 20,
    left: 20,
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  friendsText: {
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
