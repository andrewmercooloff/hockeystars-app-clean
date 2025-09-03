import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExerciseCompletion, getPlayerExerciseStats, Player, PlayerExerciseStats } from '../utils/playerStorage';

// Импортируем данные упражнений для получения названий
const exercisesData = [
  { id: '1', title: 'Интервальный бег' },
  { id: '2', title: 'Берпи с прыжком' },
  { id: '3', title: 'Велосипед' },
  { id: '4', title: 'Планка' },
  { id: '5', title: 'Отжимания' },
  { id: '6', title: 'Приседания' },
  { id: '7', title: 'Прыжки на скакалке' },
  { id: '8', title: 'Подтягивания' },
  { id: '9', title: 'Бег на месте' },
  { id: '10', title: 'Махи гирей' },
  { id: '11', title: 'Выпады' },
  { id: '12', title: 'Альпинист' },
  { id: '13', title: 'Джампинг Джекс' },
  { id: '14', title: 'Скручивания' },
  { id: '15', title: 'Супермен' },
  { id: '16', title: 'Гребля на тренажере' },
  { id: '17', title: 'Плавание' },
  { id: '18', title: 'Эллиптический тренажер' },
  { id: '19', title: 'Степ-ап' },
  { id: '20', title: 'Кроссфит комплекс' },
  { id: '21', title: 'Спринты' },
  { id: '22', title: 'Прыжки в длину' },
  { id: '23', title: 'Прыжки на ящик' },
  { id: '24', title: 'Взрывные отжимания' },
  { id: '25', title: 'Медбол броски' }
];

const getExerciseTitle = (exerciseId: string): string => {
  const exercise = exercisesData.find(e => e.id === exerciseId);
  return exercise ? exercise.title : `Упражнение #${exerciseId}`;
};

interface PlayerExercisesSectionProps {
  player: Player;
  isOwnProfile: boolean;
}

export default function PlayerExercisesSection({ player, isOwnProfile }: PlayerExercisesSectionProps) {
  const [exerciseStats, setExerciseStats] = useState<PlayerExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExerciseStats();
  }, [player.id]);

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
        <View style={styles.sectionHeader}>
          <Ionicons name="fitness-outline" size={24} color="#FF4444" />
          <Text style={styles.sectionTitle}>Упражнения</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={48} color="#666" />
          <Text style={styles.emptyStateText}>
            {isOwnProfile ? 'Вы ещё не выполнили ни одного упражнения' : 'Игрок ещё не выполнил ни одного упражнения'}
          </Text>
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
        {/* Топ упражнений в едином блоке */}
        <View style={styles.exercisesBlock}>
          <Text style={styles.sectionTitle}>Упражнения</Text>
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
      </View>
    );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginBottom: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
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
