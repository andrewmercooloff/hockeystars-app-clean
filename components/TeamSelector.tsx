import React, { useCallback } from 'react';
import {
    StyleSheet,
    View
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Team } from '../utils/playerStorage';
import DraggableTeamItem from './DraggableTeamItem';

interface TeamSelectorProps {
  selectedTeams: Team[];
  onTeamsChange: (teams: Team[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const TeamSelector = React.memo(({ selectedTeams, onTeamsChange, placeholder = "Select teams", readOnly = false }: TeamSelectorProps) => {

  // Удаление команды
  const removeTeam = useCallback((teamId: string) => {
    const newTeams = selectedTeams.filter(t => t.id !== teamId);
    onTeamsChange(newTeams);
  }, [selectedTeams, onTeamsChange]);

  // Обработка изменения порядка команд
  const handleDragEnd = useCallback(({ data }: { data: Team[] }) => {
    onTeamsChange(data);
  }, [onTeamsChange]);

  // Рендер элемента команды
  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Team>) => {
    return (
      <DraggableTeamItem
        team={item}
        onRemove={readOnly ? undefined : removeTeam}
        drag={readOnly ? undefined : drag}
        isActive={isActive}
        readOnly={readOnly}
      />
    );
  }, [removeTeam, readOnly]);

  // Key extractor для DraggableFlatList
  const keyExtractor = useCallback((item: Team) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Выбранные команды с drag-and-drop */}
      <View style={styles.selectedTeamsContainer}>
        <DraggableFlatList
          data={selectedTeams}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onDragEnd={readOnly ? undefined : handleDragEnd}
          contentContainerStyle={styles.flatListContent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={5}
        />
      </View>
    </View>
  );
});

export default TeamSelector;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 999999,
    elevation: 100,
  },
  selectedTeamsContainer: {
    marginBottom: 15,
  },
  flatListContent: {
    paddingBottom: 10,
  },
}); 