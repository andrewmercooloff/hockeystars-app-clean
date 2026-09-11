import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { platformCardShadow } from '../utils/androidShadow';
import { NOTIFICATION_DELTA_BADGE } from '../utils/notificationCard';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface AchievementAddedNotificationProps {
  playerName: string;
  playerId?: string;
  achievementsCount: number;
  timestamp: string;
  playerAvatar?: string;
  reactionsFooter?: ReactNode;
}

const AchievementAddedNotification = React.memo(function AchievementAddedNotification({
  playerName,
  playerId,
  achievementsCount,
  timestamp,
  playerAvatar,
  reactionsFooter,
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
    <BlurOrSolid
      intensity={55}
      tint="dark"
      style={styles.containerBlur}
    >
      <View style={styles.container}>
        <View style={styles.bodyRow}>
        <View style={styles.avatarContainer}>
        {playerId ? (
          <CachedAvatar
            playerId={playerId}
            fallbackAvatarUrl={playerAvatar}
            size={44}
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
          {!reactionsFooter ? (
            <Text style={styles.timeText}>
              {formatTime(timestamp)}
            </Text>
          ) : null}
        </View>
        
        <View style={styles.achievementItem}>
          <Text style={styles.actionText}>
            {t('achievementNotification.added')} {getAchievementText(achievementsCount)}
          </Text>
          <View style={styles.achievementsInfo}>
            <Ionicons name="trophy" size={12} color="#fff" />
            <Text style={styles.achievementsCountText}>
              +{achievementsCount}
            </Text>
          </View>
        </View>
      </View>
      </View>

      {reactionsFooter}
    </View>
    </BlurOrSolid>
  );
});

export default AchievementAddedNotification;

const styles = StyleSheet.create({
    containerBlur: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 4,
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
    borderRadius: 14,
    padding: 12,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerAvatar: {
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
    marginBottom: 5,
  },
  playerName: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  timeText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    marginLeft: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  actionText: {
    color: '#d4d4d8',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  achievementsInfo: {
    ...NOTIFICATION_DELTA_BADGE,
  },
  achievementsCountText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
});


