import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatChange, NormativeChange } from '../utils/playerStorage';

interface StatsChangeNotificationProps {
  playerName: string;
  statChanges: StatChange[];
  normativeChanges: NormativeChange[];
  timestamp: string;
}

const StatsChangeNotification: React.FC<StatsChangeNotificationProps> = ({
  playerName,
  statChanges,
  normativeChanges,
  timestamp
}) => {
  const formatChange = (change: number): string => {
    return change > 0 ? `+${change}` : change.toString();
  };

  const getFieldName = (field: string): string => {
    const fieldNames: { [key: string]: string } = {
      goals: 'голы',
      assists: 'передачи',
      games: 'игры',
      pullUps: 'подтягивания',
      pushUps: 'отжимания',
      plankTime: 'планка',
      sprint100m: '100м',
      longJump: 'прыжок в длину',
      jumpRope: 'скакалка'
    };
    return fieldNames[field] || field;
  };

  const allChanges = [...statChanges, ...normativeChanges];

  if (allChanges.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={20} color="#4CAF50" />
        <Text style={styles.title}>
          {playerName} обновил статистику
        </Text>
      </View>
      
      <View style={styles.changesList}>
        {allChanges.map((change, index) => (
          <View key={index} style={styles.changeItem}>
            <Text style={styles.fieldName}>
              {getFieldName(change.field)}
            </Text>
            <View style={styles.changeValue}>
              <Text style={styles.oldValue}>
                {change.oldValue}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#888" />
              <Text style={styles.newValue}>
                {change.newValue}
              </Text>
              <View style={[
                styles.changeIndicator,
                change.change > 0 ? styles.positiveChange : styles.negativeChange
              ]}>
                <Text style={styles.changeText}>
                  {formatChange(change.change)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      
      <Text style={styles.timestamp}>
        {new Date(timestamp).toLocaleString('ru-RU')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
  },
  changesList: {
    gap: 8,
  },
  changeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fieldName: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: '#fff',
    flex: 1,
  },
  changeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oldValue: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
  },
  newValue: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  changeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  positiveChange: {
    backgroundColor: '#4CAF50',
  },
  negativeChange: {
    backgroundColor: '#F44336',
  },
  changeText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    marginTop: 8,
    textAlign: 'right',
  },
});

export default StatsChangeNotification;
