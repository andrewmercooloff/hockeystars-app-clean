import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayerTeam } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { getCityDisplayName, getTeamDisplayName } from '../utils/teamTranslations';

interface TeamsDisplayProps {
  teams: PlayerTeam[];
  onTeamPress?: (team: PlayerTeam) => void;
  compact?: boolean;
}

const TeamsDisplay = React.memo(function TeamsDisplay({ teams, onTeamPress, compact = false }: TeamsDisplayProps) {
  const { t, language } = useLanguage();
  
  // Мемоизируем пустое состояние
  const emptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={24} color="#FF4444" />
      <Text style={styles.emptyText}>{t('noTeamsSpecified')}</Text>
    </View>
  ), [t]);

  // Функция для получения отображаемого названия команды
  const getDisplayTeamName = (team: PlayerTeam) => {
    if (language === 'ru') {
      return team.teamNameRu || team.teamName;
    }
    return getTeamDisplayName(team.teamNameRu || team.teamName, language) || team.teamName;
  };

  // Мемоизируем компактный режим
  const compactView = useMemo(() => (
    <View style={styles.compactContainer}>
      {teams.map((team, index) => (
        <View key={team.teamId} style={styles.compactTeam}>
          <Text style={styles.compactTeamName}>{getDisplayTeamName(team)}</Text>
          {index < teams.length - 1 && <Text style={styles.compactSeparator}>, </Text>}
        </View>
      ))}
    </View>
  ), [teams, language]);

  if (!teams || teams.length === 0) {
    return emptyState;
  }

  if (compact) {
    return compactView;
  }

  return (
    <View style={styles.container}>
      <View style={styles.teamsList}>
        {teams.map((team) => (
          <TouchableOpacity
            key={team.teamId}
            style={styles.teamItem}
            onPress={() => onTeamPress?.(team)}
            disabled={!onTeamPress}
          >
                         <View style={styles.teamInfo}>
              <View style={styles.teamHeader}>
                <Ionicons 
                  name="star" 
                  size={16} 
                  color="#FF4444" 
                />
                <Text style={styles.teamName}>
                  {getDisplayTeamName(team)}
                </Text>
              </View>
              
              {team.teamCity && (
                <Text style={styles.teamCity}>{getCityDisplayName(team.teamCity, language)}</Text>
              )}
            </View>
            
            {onTeamPress && (
              <Ionicons name="chevron-forward" size={20} color="#FF4444" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

export default TeamsDisplay;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginTop: 8,
  },
  teamsList: {
    gap: 8,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  teamInfo: {
    flex: 1,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  teamName: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
  },
  teamCity: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginBottom: 2,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  compactTeam: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTeamName: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  compactSeparator: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
}); 