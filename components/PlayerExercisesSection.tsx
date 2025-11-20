import React, { useEffect, useState, useCallback } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ExerciseCompletion, getPlayerExerciseStats, Player, PlayerExerciseStats } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { ExerciseService } from '../services/exerciseService';
import { Language, localizeExercise } from '../types/exercise';

interface PlayerExercisesSectionProps {
  player: Player;
  isOwnProfile: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function PlayerExercisesSection({ player, isOwnProfile, style }: PlayerExercisesSectionProps) {
  const { t, language, isLanguageLoaded } = useLanguage();
  const router = useRouter();
  const [exerciseStats, setExerciseStats] = useState<PlayerExerciseStats | null>(null);
  const [exerciseTitles, setExerciseTitles] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [titlesLoading, setTitlesLoading] = useState(false);

  useEffect(() => {
    if (isLanguageLoaded) {
      loadExerciseStats();
    }
  }, [player.id, player.exerciseStats, language, isLanguageLoaded]); // Добавляем isLanguageLoaded в зависимости

  const loadExerciseStats = async () => {
    try {
      setLoading(true);
      setExerciseTitles({}); // Очищаем названия при перезагрузке
      const stats = await getPlayerExerciseStats(player.id);
      setExerciseStats(stats);
      
      // Загружаем названия упражнений только если их нет в кеше
      if (stats && stats.completions.length > 0) {
        const titles: { [key: string]: string } = {};
        const uncachedTitles: string[] = [];
        
        // Проверяем, какие названия уже есть в кеше для текущего языка
        for (const completion of stats.completions) {
          const cacheKey = `exercise_title_${completion.exerciseId}_${language}`;
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const cachedTitle = await AsyncStorage.getItem(cacheKey);
            if (cachedTitle) {
              titles[completion.exerciseId] = cachedTitle;
            } else {
              uncachedTitles.push(completion.exerciseId);
            }
          } catch (error) {
            uncachedTitles.push(completion.exerciseId);
          }
        }
        
        // Устанавливаем кешированные названия сразу
        if (Object.keys(titles).length > 0) {
          setExerciseTitles(titles);
        }
        
        // Загружаем только некешированные названия
        if (uncachedTitles.length > 0) {
          setTitlesLoading(true);
          for (const exerciseId of uncachedTitles) {
            try {
              const exercise = await ExerciseService.getExerciseById(exerciseId);
              if (exercise) {
                const localizedExercise = localizeExercise(exercise, language as Language);
                titles[exerciseId] = localizedExercise.title;
                
                // Кешируем название для текущего языка
                const cacheKey = `exercise_title_${exerciseId}_${language}`;
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                await AsyncStorage.setItem(cacheKey, localizedExercise.title);
              }
            } catch (error) {
              console.error(`Ошибка загрузки упражнения ${exerciseId}:`, error);
              titles[exerciseId] = t('exercises.exerciseNumber', { id: exerciseId });
            }
          }
          setExerciseTitles(prev => ({ ...prev, ...titles }));
          setTitlesLoading(false);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики упражнений:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExercisePress = useCallback((exerciseId: string) => {
    router.navigate({
      pathname: '/exercise-details',
      params: { id: exerciseId }
    });
  }, [router]);

  // Показываем секцию только для игроков
  if (player.status !== 'player') {
    return null;
  }

  const containerStyle = [styles.section, style];

  if (loading || titlesLoading) {
    return (
      <View style={containerStyle}>
        <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
        <Text style={styles.loadingText}>{t('exercisesSection.loading')}</Text>
      </View>
    );
  }

  if (!exerciseStats || exerciseStats.totalCompletions === 0) {
    return (
      <View style={containerStyle}>
        <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
        <View style={styles.emptyStateContent}>
          <Ionicons name="barbell-outline" size={48} color="#666" />
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

  // Проверяем, что все названия упражнений загружены
  const allTitlesLoaded = sortedCompletions.every(completion => 
    exerciseTitles[completion.exerciseId]
  );

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
      <View style={containerStyle}>
        <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
        <View style={styles.emptyStateContent}>
          <Ionicons name="barbell-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>{t('exercisesSection.noExercises')}</Text>
        </View>
      </View>
    );
  }

  // Если не все названия загружены, показываем загрузку
  if (!allTitlesLoaded) {
    return (
      <View style={containerStyle}>
        <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
        <Text style={styles.loadingText}>{t('exercisesSection.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
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
                  {exerciseTitles[completion.exerciseId] || t('exercises.exerciseNumber', { id: completion.exerciseId })}
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
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginBottom: 15,
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
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 100,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginTop: 16,
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
    borderColor: 'rgba(250, 47, 64, 0.2)',
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
    backgroundColor: '#fa2f40',
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
