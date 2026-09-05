import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';
import { formatPrize } from '../data/hockeyQuiz/utils';
import type { Language } from '../contexts/LanguageContext';

interface GameFirstPlaceNotificationProps {
  playerName: string;
  playerId?: string;
  playerAvatar?: string;
  message: string;
  timestamp: number;
  variant: 'game' | 'quiz';
  prizeAmount?: number;
}

const GameFirstPlaceNotification = React.memo<GameFirstPlaceNotificationProps>(({
  playerName,
  playerId,
  playerAvatar,
  message,
  timestamp,
  variant,
  prizeAmount,
}) => {
  const { t, language } = useLanguage();

  const formatTime = useCallback((ts: number): string => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return t('minutesAgo', { minutes: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('hoursAgo', { hours: Math.floor(diff / 3600000) });
    return t('daysAgo', { days: Math.floor(diff / 86400000) });
  }, [t]);

  const displayMessage = useMemo(() => {
    if (variant === 'quiz' && prizeAmount != null && prizeAmount > 0) {
      const prize = formatPrize(prizeAmount, language as Language);
      const localized = t('quizFirstPlaceNotification.message', { playerName, prize });
      if (localized !== 'quizFirstPlaceNotification.message') return localized;
    }
    if (variant === 'game') {
      const localized = t('gameFirstPlaceNotification.message', { playerName });
      if (localized !== 'gameFirstPlaceNotification.message') return localized;
    }
    return message;
  }, [variant, prizeAmount, playerName, language, t, message]);

  return (
    <BlurOrSolid intensity={55} tint="dark" style={styles.containerBlur}>
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
          {(playerAvatar || playerId) ? (
            <CachedAvatar playerId={playerId || ''} fallbackAvatarUrl={playerAvatar} size={50} style={styles.playerAvatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
            </View>
          )}
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.playerName}>{playerName}</Text>
            <Text style={styles.timeText}>{formatTime(timestamp)}</Text>
          </View>
          <Text style={styles.message}>{displayMessage}</Text>
        </View>
      </View>
    </BlurOrSolid>
  );
});

const styles = StyleSheet.create({
  containerBlur: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  container: {
    backgroundColor: '#1c1c21',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: { marginRight: 12 },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  playerName: { fontSize: 16, fontFamily: 'Gilroy-Bold', color: '#fff', flex: 1 },
  timeText: { fontSize: 12, fontFamily: 'Gilroy-Regular', color: '#a1a1aa', marginLeft: 8 },
  message: { fontSize: 14, fontFamily: 'Gilroy-Regular', color: '#d4d4d8' },
  playerAvatar: { width: 50, height: 50, borderRadius: 25 },
});

export default GameFirstPlaceNotification;
