import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface AchievementAddedNotificationProps {
  playerName: string;
  playerId?: string;
  achievementsCount: number;
  timestamp: string;
  playerAvatar?: string;
}

const AchievementAddedNotification = React.memo(function AchievementAddedNotification({
  playerName,
  playerId,
  achievementsCount,
  timestamp,
  playerAvatar
}: AchievementAddedNotificationProps) {
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

  const getAchievementText = (count: number): string => {
    if (count === 1) {
      return t('achievementNotification.oneAchievement');
    } else {
      return t('achievementNotification.multipleAchievements', { count });
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
        ) : (
          <View style={styles.avatarPlaceholder}>
          <Ionicons name="trophy-outline" size={24} color="#fff" />
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
        
        <View style={styles.achievementItem}>
          <Text style={styles.actionText}>
            {t('achievementNotification.added')} {getAchievementText(achievementsCount)}
          </Text>
          <View style={styles.achievementsInfo}>
            <Ionicons name="trophy" size={14} color="#000" />
            <Text style={styles.achievementsCountText}>
              +{achievementsCount}
            </Text>
          </View>
        </View>
      </View>
      </View>
    </BlurView>
  );
});

export default AchievementAddedNotification;

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
    borderLeftColor: '#FFD700', // Желтая граница для достижений
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
  achievementItem: {
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
  achievementsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 32,
  },
  achievementsCountText: {
    color: '#000',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 4,
  },
});


