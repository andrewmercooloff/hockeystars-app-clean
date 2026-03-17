import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface GameFirstPlaceNotificationProps {
  playerName: string;
  playerId?: string;
  playerAvatar?: string;
  message: string;
  timestamp: number;
}

const GameFirstPlaceNotification = React.memo<GameFirstPlaceNotificationProps>(({
  playerName,
  playerId,
  playerAvatar,
  message,
  timestamp,
}) => {
  const { t } = useLanguage();

  const formatTime = useCallback((ts: number): string => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return t('minutesAgo', { minutes: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('hoursAgo', { hours: Math.floor(diff / 3600000) });
    return t('daysAgo', { days: Math.floor(diff / 86400000) });
  }, [t]);

  return (
    <BlurView intensity={20} tint="dark" style={styles.containerBlur}>
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
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </BlurView>
  );
});

const styles = StyleSheet.create({
  containerBlur: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  container: {
    backgroundColor: 'rgba(1, 0, 0, 0.75)',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  playerName: { fontSize: 16, fontFamily: 'Gilroy-Bold', color: '#fff', flex: 1 },
  timeText: { fontSize: 12, fontFamily: 'Gilroy-Regular', color: '#999', marginLeft: 8 },
  message: { fontSize: 14, fontFamily: 'Gilroy-Regular', color: '#ccc' },
  playerAvatar: { width: 50, height: 50, borderRadius: 25 },
});

export default GameFirstPlaceNotification;
