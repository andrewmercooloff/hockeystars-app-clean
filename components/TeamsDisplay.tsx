import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayerTeam } from '../utils/playerStorage';

interface TeamsDisplayProps {
  teams: PlayerTeam[];
  onTeamPress?: (team: PlayerTeam) => void;
  compact?: boolean;
}

export default function TeamsDisplay({ teams, onTeamPress, compact = false }: TeamsDisplayProps) {
  if (!teams || teams.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={24} color="#FF4444" />
        <Text style={styles.emptyText}>Команды не указаны</Text>
      </View>
    );
  }

  if (compact) {
    // Компактный режим - показываем все команды в одну строку
    return (
      <View style={styles.compactContainer}>
        {teams.map((team, index) => (
          <View key={team.teamId} style={styles.compactTeam}>
            <Text style={styles.compactTeamName}>{team.teamName}</Text>
            {index < teams.length - 1 && <Text style={styles.compactSeparator}>, </Text>}
          </View>
        ))}
      </View>
    );
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
                  {team.teamName}
                </Text>
              </View>
              
              {team.teamCity && (
                <Text style={styles.teamCity}>{team.teamCity}</Text>
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
}

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