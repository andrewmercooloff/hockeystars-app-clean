import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface LikeNotificationProps {
  likedByName: string;
  likedByAvatar?: string;
  likedById: string;
  contentType: 'video' | 'photo';
  timestamp: number | string;
  onPress?: () => void;
}

const LikeNotification = React.memo(function LikeNotification({
  likedByName,
  likedByAvatar,
  likedById,
  contentType,
  timestamp,
  onPress,
}: LikeNotificationProps) {
  const { t } = useLanguage();

  const formatTime = (timestamp: number | string): string => {
    let date: Date;
    
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      return t('justNow');
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
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

  const notificationKey = contentType === 'video' ? 'video_liked' : 'photo_liked';
  const message = t(`notifications.${notificationKey}.message`)?.replace('{name}', likedByName) ||
                 (contentType === 'video' 
                   ? `${likedByName} лайкнул ваше видео` 
                   : `${likedByName} лайкнул ваше фото`);

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {likedById ? (
          <CachedAvatar
            playerId={likedById}
            fallbackAvatarUrl={likedByAvatar}
            size={50}
            style={styles.playerAvatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="heart-outline" size={24} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.playerName} numberOfLines={1}>
            {likedByName}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(timestamp)}
          </Text>
        </View>
        
        <View style={styles.actionItem}>
          <Text style={styles.actionText}>
            {message}
          </Text>
          <View style={styles.likeBadge}>
            <Ionicons name="heart" size={16} color="#fff" />
          </View>
        </View>
      </View>
    </View>
  );
});

export default LikeNotification;

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
    borderLeftColor: '#E91E63', // Розовый цвет для лайков (уникальный, не используется в других уведомлениях)
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  likeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E91E63', // Такой же цвет, как граница слева
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    justifyContent: 'center',
  },
});

