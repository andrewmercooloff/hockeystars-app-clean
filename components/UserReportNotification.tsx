import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface UserReportNotificationProps {
  reporterName: string;
  reporterId?: string;
  reporterAvatar?: string;
  reportedName: string;
  reportedId?: string;
  reportedAvatar?: string;
  timestamp: number | string;
}

export default function UserReportNotification({
  reporterName,
  reporterId,
  reporterAvatar,
  reportedName,
  reportedId,
  reportedAvatar,
  timestamp,
}: UserReportNotificationProps) {
  const { t } = useLanguage();

  const formatTime = (timestamp: number | string): string => {
    const now = new Date();
    const time = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    
    if (isNaN(time.getTime())) {
      return t('justNow') || 'Только что';
    }
    
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return t('justNow') || 'Только что';
    } else if (diffInMinutes < 60) {
      return t('minutesAgo', { minutes: diffInMinutes }) || `${diffInMinutes} мин назад`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return t('hoursAgo', { hours }) || `${hours} ч назад`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return t('daysAgo', { days }) || `${days} дн назад`;
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
        {reportedId ? (
          <CachedAvatar
            playerId={reportedId}
            fallbackAvatarUrl={reportedAvatar}
            size={50}
            style={styles.reportedAvatar}
          />
        ) : reportedAvatar ? (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={24} color="#fff" />
          </View>
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={24} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.reporterName} numberOfLines={1}>
            {reporterName}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(timestamp)}
          </Text>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.actionText}>
            {t('admin.reportNotification', { 
              reporterName, 
              reportedName 
            }) || `${reporterName} пожаловался на ${reportedName}`}
          </Text>
          <View style={styles.flagBadge}>
            <Ionicons name="flag" size={16} color="#fff" />
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
    borderLeftColor: '#2E7D32',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  reportedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  reporterName: {
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
  messageContainer: {
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
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    width: 32,
    height: 32,
  },
});

