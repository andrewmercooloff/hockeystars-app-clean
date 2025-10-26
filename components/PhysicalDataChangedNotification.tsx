import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface PhysicalDataChangedNotificationProps {
  playerName: string;
  playerId?: string; // Добавляем playerId для кеширования
  changes: { field: 'height' | 'weight', oldValue: number, newValue: number }[];
  timestamp: string;
  playerAvatar?: string | null;
}

const PhysicalDataChangedNotification = React.memo(function PhysicalDataChangedNotification({
  playerName,
  playerId,
  changes,
  timestamp,
  playerAvatar
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
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {playerAvatar ? (
          <CachedAvatar
            playerId={playerId}
            fallbackAvatarUrl={playerAvatar}
            size={50}
            style={styles.playerAvatar}
          />
        ) : (
          <Ionicons name="body-outline" size={24} color="#fff" />
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
  );
});

export default PhysicalDataChangedNotification;

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
    borderLeftColor: '#FF6B35', // Оранжевая граница как для stats_change
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
  changesContainer: {
    gap: 8,
  },
  changeItem: {
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


