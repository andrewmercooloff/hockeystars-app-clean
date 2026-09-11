import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';
import { NOTIFICATION_CARD, NOTIFICATION_CARD_BLUR } from '../utils/notificationCard';

interface PhysicalDataChangedNotificationProps {
  playerName: string;
  playerId: string;
  playerAvatar?: string;
  changes: { field: 'height' | 'weight', oldValue: number, newValue: number }[];
  timestamp: string;
  reactionsFooter?: ReactNode;
}

const PhysicalDataChangedNotification = React.memo(function PhysicalDataChangedNotification({
  playerName,
  playerId,
  playerAvatar,
  changes,
  timestamp,
  reactionsFooter,
}: PhysicalDataChangedNotificationProps) {
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

  const getFieldName = (field: 'height' | 'weight'): string => {
    return field === 'height' ? t('height') : t('weight');
  };

  const getUnit = (field: 'height' | 'weight'): string => {
    return field === 'height' ? t('cm') : t('kg');
  };

  const getChangeValue = (change: { field: 'height' | 'weight', oldValue: number, newValue: number }): number => {
    return change.newValue - change.oldValue;
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
        <CachedAvatar
          playerId={playerId}
          fallbackAvatarUrl={playerAvatar}
          size={44}
          style={styles.playerAvatar}
        />
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
        
        <View style={styles.changesContainer}>
          {changes.map((change, index) => (
            <View key={index} style={styles.changeItem}>
              <Text style={styles.actionText}>
                {getFieldName(change.field)}: {change.newValue} {getUnit(change.field)}
              </Text>
              <View style={[
                styles.physicalBadge,
                { backgroundColor: getChangeValue(change) > 0 ? '#fa2f40' : '#FF9800' }
              ]}>
                <Text style={styles.badgeText}>
                  {getChangeValue(change) > 0 ? '+' : ''}{getChangeValue(change)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      </View>

      {reactionsFooter}
    </View>
    </BlurOrSolid>
  );
});

export default PhysicalDataChangedNotification;

const styles = StyleSheet.create({
    containerBlur: {
    ...NOTIFICATION_CARD_BLUR,
  },
  container: {
    ...NOTIFICATION_CARD,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    marginBottom: 2,
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
  changesContainer: {
    gap: 4,
  },
  changeItem: {
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
  physicalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 32,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
});


