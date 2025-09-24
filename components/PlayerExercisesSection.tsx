import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ExerciseCompletion, getPlayerExerciseStats, Player, PlayerExerciseStats } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { ExerciseService } from '../services/exerciseService';

interface PlayerExercisesSectionProps {
  player: Player;
  isOwnProfile: boolean;
}

export default function PlayerExercisesSection({ player, isOwnProfile }: PlayerExercisesSectionProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [exerciseStats, setExerciseStats] = useState<PlayerExerciseStats | null>(null);
  const [exerciseTitles, setExerciseTitles] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExerciseStats();
  }, [player.id, player.exerciseStats]); // Добавляем зависимость от exerciseStats

  const loadExerciseStats = async () => {
    try {
      const stats = await getPlayerExerciseStats(player.id);
      setExerciseStats(stats);
      
      // Загружаем названия упражнений
      if (stats && stats.completions.length > 0) {
        const titles: { [key: string]: string } = {};
        for (const completion of stats.completions) {
          try {
            const exercise = await ExerciseService.getExerciseById(completion.exerciseId);
            if (exercise) {
              titles[completion.exerciseId] = language === 'ru' ? exercise.titleRu : exercise.titleEn;
            }
          } catch (error) {
            console.error(`Ошибка загрузки упражнения ${completion.exerciseId}:`, error);
            titles[completion.exerciseId] = `Упражнение #${completion.exerciseId}`;
          }
        }
        setExerciseTitles(titles);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики упражнений:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExercisePress = (exerciseId: string) => {
    router.navigate({
      pathname: '/exercise-details',
      params: { id: exerciseId }
    });
  };

  // Показываем секцию только для игроков
  if (player.status !== 'player') {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
        <Text style={styles.loadingText}>{t('exercisesSection.loading')}</Text>
      </View>
    );
  }

  if (!exerciseStats || exerciseStats.totalCompletions === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
        <View style={styles.emptyStateContent}>
          <Text style={styles.emptyStateText}>
            {isOwnProfile ? t('exercisesSection.noExercisesOwn') : t('exercisesSection.noExercisesOther')}
          </Text>
        </View>
      </View>
    );
  }

  // Сортируем упражнения по количеству выполнений (убывание)
  const sortedCompletions = [...exerciseStats.completions]
    .sort((a, b) => b.count - a.count);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (sortedCompletions.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
        <Text style={styles.emptyText}>{t('exercisesSection.noExercises')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
      
      <View style={styles.exercisesGrid}>
        {sortedCompletions.map((completion, index) => (
          <TouchableOpacity 
            key={completion.exerciseId} 
            style={styles.exerciseCard}
            onPress={() => handleExercisePress(completion.exerciseId)}
            activeOpacity={0.7}
          >
            <View style={styles.exerciseContent}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName} numberOfLines={2}>
                  {exerciseTitles[completion.exerciseId] || `Упражнение #${completion.exerciseId}`}
                </Text>
                <Text style={styles.exerciseDate}>
                  {formatDate(completion.completedAt)}
                </Text>
              </View>
              <View style={styles.exerciseRank}>
                <Text style={styles.exerciseRankText}>{completion.count}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  exerciseCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
  },
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 8,
  },
  exerciseRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseRankText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  exerciseName: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 4,
    lineHeight: 16,
  },
  exerciseDate: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 250,
  },
});
