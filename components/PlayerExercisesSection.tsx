import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getExerciseTitle } from '../utils/exercisesData';
import { ExerciseCompletion, getPlayerExerciseStats, Player, PlayerExerciseStats } from '../utils/playerStorage';

interface PlayerExercisesSectionProps {
  player: Player;
  isOwnProfile: boolean;
}

export default function PlayerExercisesSection({ player, isOwnProfile }: PlayerExercisesSectionProps) {
  const [exerciseStats, setExerciseStats] = useState<PlayerExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExerciseStats();
  }, [player.id, player.exerciseStats]); // Добавляем зависимость от exerciseStats

  const loadExerciseStats = async () => {
    try {
      const stats = await getPlayerExerciseStats(player.id);
      setExerciseStats(stats);
    } catch (error) {
      console.error('Ошибка загрузки статистики упражнений:', error);
    } finally {
      setLoading(false);
    }
  };

  // Показываем секцию только для игроков
  if (player.status !== 'player') {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="fitness-outline" size={24} color="#FF4444" />
          <Text style={styles.sectionTitle}>Упражнения</Text>
        </View>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  if (!exerciseStats || exerciseStats.totalCompletions === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.emptyState}>
          <Text style={styles.sectionTitle}>Упражнения</Text>
          <View style={styles.emptyStateContent}>
            <Ionicons name="barbell-outline" size={48} color="#666" />
            <Text style={styles.emptyStateText}>
              {isOwnProfile ? 'Вы ещё не выполнили ни одного упражнения' : 'Игрок ещё не выполнил ни одного упражнения'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Сортируем упражнения по количеству выполнений (убывание)
  const sortedCompletions = [...exerciseStats.completions]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Показываем топ 5

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

      return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Упражнения</Text>
        </View>
        {sortedCompletions.map((completion, index) => (
          <View key={completion.exerciseId} style={styles.exerciseItem}>
            <View style={styles.exerciseRank}>
              <Text style={styles.exerciseRankText}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{getExerciseTitle(completion.exerciseId)}</Text>
              <Text style={styles.exerciseDetails}>
                {completion.count} {completion.count === 1 ? 'раз' : 'раза'} • {formatDate(completion.completedAt)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyState: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  emptyStateContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 250,
  },
  exercisesBlock: {
    // Убираем лишние стили, так как они теперь в section
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  exerciseRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseRankText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 2,
  },
  exerciseDetails: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
});
