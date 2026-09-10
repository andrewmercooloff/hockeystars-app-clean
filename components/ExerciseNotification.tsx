import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';
import { NOTIFICATION_CARD, NOTIFICATION_CARD_BLUR } from '../utils/notificationCard';

interface ExerciseNotificationProps {
  playerName: string;
  playerId: string;
  playerAvatar?: string;
  exerciseId: string;
  timestamp: string;
}

export default function ExerciseNotification({
  playerName,
  playerId,
  playerAvatar,
  exerciseId,
  timestamp,
}: ExerciseNotificationProps) {
  const { t } = useLanguage();

  // Функция для получения локализованного названия упражнения
  const getLocalizedExerciseName = (exerciseId: string): string => {
    // Пытаемся получить локализованное название из переводов
    const localizedName = t(`exercises.items.${exerciseId}.title`);
    // Если перевод не найден, возвращаем fallback
    if (localizedName === `exercises.items.${exerciseId}.title`) {
      return t('exerciseNotification.exercise') + ` #${exerciseId}`;
    }
    return localizedName;
  };

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

  return (
    <BlurOrSolid
      intensity={55}
      tint="dark"
      style={styles.containerBlur}
    >
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
        <CachedAvatar
          playerId={playerId}
          fallbackAvatarUrl={playerAvatar}
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
            {formatTime(timestamp)}
          </Text>
        </View>

        <View style={styles.exerciseItem}>
               <Text style={styles.actionText}>
                 {t('exerciseNotification.completed')} "{getLocalizedExerciseName(exerciseId)}"
               </Text>
          <View style={styles.exerciseBadge}>
            <Ionicons name="barbell-outline" size={16} color="#000" />
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
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionText: {
    color: '#d4d4d8',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    width: 32,
    height: 32,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 4,
  },
});
