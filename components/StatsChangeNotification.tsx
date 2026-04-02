import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { platformCardShadow } from '../utils/androidShadow';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';

interface StatChange {
  field: string;
  oldValue: number;
  newValue: number;
  change: number;
  timestamp: string;
}

interface StatsChangeNotificationProps {
  changes: StatChange[];
  playerName: string;
  playerId?: string;
  playerAvatar?: string;
  timestamp: number;
}

const StatsChangeNotification = React.memo<StatsChangeNotificationProps>(({
  changes,
  playerName,
  playerId,
  timestamp,
  playerAvatar
}) => {
  const { t } = useLanguage();

  const fieldNames = useMemo(() => ({
    'goals': t('goals'),
    'assists': t('assists'), 
    'games': t('games'),
    'minutes': t('profile.minutes'),
    'shots': t('profile.shots'),
    'saves': t('profile.saves'),
    'pullUps': t('pullUps'),
    'pushUps': t('pushUps'),
    'plankTime': t('plankTime'),
    'sprint100m': t('sprint100m'),
    'longJump': t('longJump'),
    'jumpRope': t('jumpRope')
  }), [t]);

  const getFieldName = (field: string): string => {
    return fieldNames[field] || field;
  };

  const formatValue = (value: number, field: string): string => {
    if (field === 'plankTime' || field === 'sprint100m') {
      return `${value}с`;
    }
    if (field === 'longJump') {
      return `${value}м`;
    }
    return value.toString();
  };

  const formatTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // меньше минуты
      return t('justNow');
    } else if (diff < 3600000) { // меньше часа
      const minutes = Math.floor(diff / 60000);
      return t('minutesAgo', { minutes });
    } else if (diff < 86400000) { // меньше дня
      const hours = Math.floor(diff / 3600000);
      return t('hoursAgo', { hours });
    } else {
      const days = Math.floor(diff / 86400000);
      return t('daysAgo', { days });
    }
  }, [t]);

  return (
    <BlurOrSolid
      intensity={20}
      tint="dark"
      style={styles.containerBlur}
    >
      <View style={styles.container}>
        {/* Аватар слева */}
        <View style={styles.avatarContainer}>
        {(playerAvatar || playerId) ? (
          <CachedAvatar
            playerId={playerId || ''}
            fallbackAvatarUrl={playerAvatar}
            size={50}
            style={styles.playerAvatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="trending-up" size={24} color="#FF4444" />
          </View>
        )}
      </View>
      
      {/* Информация справа */}
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.playerName}>{playerName}</Text>
          <Text style={styles.timeText}>{formatTime(timestamp)}</Text>
        </View>
        
        <View style={styles.changesContainer}>
          {changes.map((change, index) => (
          <View key={index} style={styles.changeItem}>
              <Text style={styles.fieldName}>{getFieldName(change.field)}</Text>
              <View style={styles.valueContainer}>
              <Text style={styles.oldValue}>
                  {formatValue(change.oldValue, change.field)}
              </Text>
                <Ionicons name="arrow-forward" size={16} color="#666" />
              <Text style={styles.newValue}>
                  {formatValue(change.newValue, change.field)}
              </Text>
              <View style={[
                  styles.changeBadge,
                  { backgroundColor: change.change > 0 ? '#FF4444' : '#FF9800' }
              ]}>
                <Text style={styles.changeText}>
                    {change.change > 0 ? '+' : ''}{change.change}
                </Text>
                </View>
              </View>
            </View>
          ))}
          </View>
      </View>
      </View>
    </BlurOrSolid>
  );
});

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
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
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
  playerName: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#999',
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
  fieldName: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oldValue: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#999',
    textDecorationLine: 'line-through',
  },
  newValue: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  playerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
});

export default StatsChangeNotification;