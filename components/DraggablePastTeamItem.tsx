import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PastTeam } from '../utils/playerStorage';

interface DraggablePastTeamItemProps {
  team: PastTeam;
  onEdit: (team: PastTeam) => void;
  onDelete: (teamId: string) => void;
  drag?: () => void;
  isActive: boolean;
  isEditing: boolean;
}

const DraggablePastTeamItem = ({ 
  team, 
  onEdit, 
  onDelete, 
  drag, 
  isActive, 
  isEditing 
}: DraggablePastTeamItemProps) => {
  
  const getPeriodText = (team: PastTeam) => {
    if (team.isCurrent) {
      return `${team.startYear} - настоящее время`;
    }
    if (team.endYear) {
      return `${team.startYear} - ${team.endYear}`;
    }
    return `${team.startYear}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isActive && styles.activeContainer
      ]}
    >
      {drag && (
        <TouchableOpacity
          style={styles.dragHandle}
          onLongPress={drag}
          disabled={isActive}
        >
          <Ionicons name="menu" size={20} color="#888" />
        </TouchableOpacity>
      )}
      
      <View style={styles.teamContent}>
        <View style={styles.teamHeader}>
          <Ionicons 
            name="time" 
            size={20} 
            color="#ccc" 
          />
          <Text style={styles.teamName}>{team.teamName}</Text>
          {isEditing && (
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEdit(team)}
              >
                <Ionicons name="create" size={16} color="#FF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDelete(team.id)}
              >
                <Ionicons name="trash" size={16} color="#FF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.teamDetails}>
          <Text style={styles.teamPeriod}>{getPeriodText(team)}</Text>
          {(team.teamCity || team.teamCountry) && (
            <Text style={styles.teamLocation}>
              {[team.teamCity, team.teamCountry].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
  },
  activeContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderColor: 'rgba(255, 68, 68, 0.5)',
    shadowColor: '#FF4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    padding: 4,
    marginRight: 8,
  },
  teamContent: {
    flex: 1,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  teamName: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  editButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 4,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  teamDetails: {
    marginLeft: 28,
  },
  teamPeriod: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginBottom: 2,
  },
  teamLocation: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#999',
  },
});

export default DraggablePastTeamItem; 