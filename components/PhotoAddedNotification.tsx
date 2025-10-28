import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface PhotoAddedNotificationProps {
  playerName: string;
  playerId?: string;
  photosCount: number;
  timestamp: string;
}

const PhotoAddedNotification = React.memo(function PhotoAddedNotification({
  playerName,
  playerId,
  photosCount,
  timestamp,
  playerAvatar
}: PhotoAddedNotificationProps) {
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

  const getPhotoText = (count: number): string => {
    if (count === 1) {
      return t('photoNotification.onePhoto');
    } else {
      return t('photoNotification.multiplePhotos', { count });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {playerAvatar ? (
          <CachedAvatar
            playerId={playerId}
            fallbackAvatarUrl={undefined} // Не используем старый аватар из уведомления
            size={50}
            style={styles.playerAvatar}
          />
        ) : (
          <Ionicons name="camera-outline" size={24} color="#fff" />
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
        
        <View style={styles.photoItem}>
          <Text style={styles.actionText}>
            {t('photoNotification.added')} {getPhotoText(photosCount)}
          </Text>
          <View style={styles.photosInfo}>
            <Ionicons name="images-outline" size={14} color="#fff" />
            <Text style={styles.photosCountText}>
              +{photosCount} {photosCount === 1 ? t('photoNotification.photo') : t('photoNotification.photos')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

export default PhotoAddedNotification;

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
    borderLeftColor: '#FF4444',
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
  photoItem: {
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
  photosInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 32,
  },
  photosCountText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 4,
  },
});
