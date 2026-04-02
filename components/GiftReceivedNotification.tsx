import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { platformCardShadow } from '../utils/androidShadow';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface GiftReceivedNotificationProps {
  playerName: string;
  starName: string;
  giftName: string;
  giftType: string;
  timestamp: string;
  playerId?: string;
  playerAvatar?: string;
}

export default function GiftReceivedNotification({
  playerName,
  starName,
  giftName,
  giftType,
  timestamp,
  playerId,
  playerAvatar,
}: GiftReceivedNotificationProps) {
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

  const getGiftIcon = (giftType: string) => {
    switch (giftType) {
      case 'autograph': return 'create-outline';
      case 'stick': return 'golf-outline';
      case 'puck': return 'radio-button-on-outline';
      case 'jersey': return 'shirt-outline';
      default: return 'gift-outline';
    }
  };

  return (
    <BlurOrSolid
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
        ) : playerAvatar ? (
          <Image
            source={{ uri: playerAvatar }}
            style={styles.playerAvatar}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person-outline" size={24} color="#fff" />
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

        <View style={styles.giftItem}>
          <Text style={styles.actionText}>
            {t('giftNotification.received')} {giftName} {t('giftNotification.from')} {starName}
          </Text>
          <View style={styles.giftBadge}>
            <Ionicons name={getGiftIcon(giftType)} size={14} color="#fff" />
          </View>
        </View>
      </View>
      </View>
    </BlurOrSolid>
  );
}

const styles = StyleSheet.create({
    containerBlur: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 5,
      elevation: 8,
    }),
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
