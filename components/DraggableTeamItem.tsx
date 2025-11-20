import React from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PastTeam } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { getTeamDisplayName, getCityDisplayName, getCountryDisplayName } from '../utils/teamTranslations';

interface DraggableTeamItemProps {
  team: PastTeam;
  onRemove?: (teamId: string) => void;
  onEdit?: (team: PastTeam) => void;
  drag?: () => void;
  isActive: boolean;
  readOnly?: boolean;
}

const DraggableTeamItem = ({ team, onRemove, onEdit, drag, isActive, readOnly = false }: DraggableTeamItemProps) => {
  const { t, language } = useLanguage();
  // Отображение периода команды
  const getPeriodText = (team: PastTeam) => {
    // Для текущих команд (isCurrent = true) всегда показываем "настоящее время"
    if (team.isCurrent) {
      return `(${team.startYear} - ${t('profile.настоящее время')})`;
    }
    // Для прошлых команд показываем период
    if (team.endYear && team.endYear !== team.startYear) {
      return `(${team.startYear} - ${team.endYear})`;
    }
    return `(${team.startYear})`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isActive && styles.activeContainer
      ]}
    >
      {!readOnly && (
        <TouchableOpacity
          style={styles.dragHandle}
          onLongPress={drag}
          disabled={isActive}
        >
          <Ionicons name="menu" size={20} color="#888" />
        </TouchableOpacity>
      )}
      
      <View style={styles.teamIconWrapper}>
        <Ionicons name="shirt-outline" size={20} color="#fa2f40" />
      </View>
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{getTeamDisplayName(team.teamNameRu || team.teamName, language)}</Text>
        <Text style={styles.teamPeriod}>{getPeriodText(team)}</Text>
        {(team.teamCity || team.teamCountry) && (
          <Text style={styles.teamLocation}>
            {[
              team.teamCity ? getCityDisplayName(team.teamCity, language) : null,
              team.teamCountry ? getCountryDisplayName(team.teamCountry, language) : null
            ].filter(Boolean).join(', ')}
          </Text>
        )}
      </View>
      
      {!readOnly && (
        <View style={styles.actionButtons}>
          {onEdit && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit(team)}
            >
              <Ionicons name="create-outline" size={16} color="#FF4444" />
            </TouchableOpacity>
          )}
          {onRemove && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(team.id)}
            >
              <Ionicons name="close-circle" size={20} color="#FF4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
  },
  activeContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderColor: 'rgba(255, 68, 68, 0.5)',
    boxShadow: '0 4px 8px rgba(255, 68, 68, 0.3)',
    elevation: 8,
  },
  dragHandle: {
    padding: 4,
    marginRight: 8,
  },
  teamIconWrapper: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 2,
  },
  teamPeriod: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginBottom: 2,
  },
  teamLocation: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
});

export default DraggableTeamItem; 