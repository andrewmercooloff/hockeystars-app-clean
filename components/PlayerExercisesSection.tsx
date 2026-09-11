import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
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

  // Сигнатура по содержимому: родитель может пересобирать объект player при каждом
  // рендере — без этого секция уходила в «Загрузка…» и меняла высоту, дёргая скролл.
  const exerciseStatsSignature = JSON.stringify(player.exerciseStats ?? null);
  useEffect(() => {
    if (isLanguageLoaded) { // Загружаем упражнения, когда язык загружен (для всех языков, включая английский)
      loadExerciseStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id, exerciseStatsSignature, language, isLanguageLoaded]);

  // Ref для отслеживания предыдущего языка (для очистки кеша только при реальной смене языка)
  const previousLanguageRef = React.useRef<string | null>(null);

  const loadExerciseStats = async () => {
    try {
      setLoading(true);
      
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      // ОПТИМИЗАЦИЯ: Очищаем кеш только при реальной смене языка, не каждый раз
      if (previousLanguageRef.current !== null && previousLanguageRef.current !== language) {
        try {
          const keys = await AsyncStorage.getAllKeys();
          const exerciseTitleKeys = keys.filter((key: string) => key.startsWith('exercise_title_'));
          if (exerciseTitleKeys.length > 0) {
            await AsyncStorage.multiRemove(exerciseTitleKeys);
          }
          setExerciseTitles({});
        } catch (error) {
          // Игнорируем ошибки очистки кеша
        }
      }
      previousLanguageRef.current = language;
      
      const stats = await getPlayerExerciseStats(player.id);
      setExerciseStats(stats);
      
      // Загружаем названия упражнений только если их нет в кеше
      if (stats && stats.completions.length > 0) {
        const titles: { [key: string]: string } = {};
        const uncachedExerciseIds: string[] = [];
        
        // ОПТИМИЗАЦИЯ: Батч-загрузка всех ключей из AsyncStorage вместо последовательных вызовов
        const cacheKeys = stats.completions.map(c => `exercise_title_${c.exerciseId}_${language}`);
        try {
          const cachedResults = await AsyncStorage.multiGet(cacheKeys);
          cachedResults.forEach((result: [string, string | null], index: number) => {
            const exerciseId = stats.completions[index].exerciseId;
            if (result[1]) {
              titles[exerciseId] = result[1];
            } else {
              uncachedExerciseIds.push(exerciseId);
            }
          });
        } catch (error) {
          // При ошибке считаем все как некешированные
          uncachedExerciseIds.push(...stats.completions.map(c => c.exerciseId));
        }
        
        // Устанавливаем кешированные названия сразу
        if (Object.keys(titles).length > 0) {
          setExerciseTitles(titles);
          setLoading(false); // Показываем данные сразу, пока загружаем остальные
        }
        
        // ОПТИМИЗАЦИЯ: Загружаем некешированные названия параллельно вместо последовательно
        if (uncachedExerciseIds.length > 0) {
          setTitlesLoading(true);
          
          const fetchPromises = uncachedExerciseIds.map(async (exerciseId) => {
            try {
              const exercise = await ExerciseService.getExerciseById(exerciseId);
              if (exercise) {
                const localizedExercise = localizeExercise(exercise, language as Language);
                return { exerciseId, title: localizedExercise.title };
              }
            } catch (error) {
              // Тихая обработка ошибки
            }
            return { exerciseId, title: t('exercises.exerciseNumber', { id: exerciseId }) };
          });
          
          const results = await Promise.all(fetchPromises);
          
          // Обновляем названия и кеш
          const newTitles: { [key: string]: string } = { ...titles };
          const cacheEntries: [string, string][] = [];
          
          results.forEach(result => {
            newTitles[result.exerciseId] = result.title;
            cacheEntries.push([`exercise_title_${result.exerciseId}_${language}`, result.title]);
          });
          
          setExerciseTitles(newTitles);
          
          // ОПТИМИЗАЦИЯ: Батч-сохранение в AsyncStorage
          if (cacheEntries.length > 0) {
            try {
              await AsyncStorage.multiSet(cacheEntries);
            } catch (error) {
              // Игнорируем ошибки кеширования
            }
          }
          
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
    router.push(`/exercises/${exerciseId}`);
  }, [router]);

  // Показываем секцию только для игроков
  if (player.status !== 'player') {
    return null;
  }

  const containerStyle = [styles.section, style];

  // Плейсхолдер только пока данных нет вообще: при фоновом обновлении держим
  // прежний контент, чтобы высота секции не прыгала под пальцем.
  if (loading && !exerciseStats) {
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
          <Ionicons name="barbell-outline" size={48} color="#8a8a92" />
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
      <View style={containerStyle}>
        <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
        <View style={styles.emptyStateContent}>
          <Ionicons name="barbell-outline" size={48} color="#8a8a92" />
          <Text style={styles.emptyText}>{t('exercisesSection.noExercises')}</Text>
        </View>
      </View>
    );
  }

  // Названия, которых ещё нет, подставляются как «Упражнение #id» в renderItem —
  // без переключения всей секции в состояние загрузки.

  return (
    <View style={containerStyle}>
      <Text style={styles.sectionTitle}>{t('exercisesSection.title')}</Text>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.exercisesScroll}
        nestedScrollEnabled
      >
        {sortedCompletions.map((completion) => (
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(22, 22, 26, 0.78)',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  exercisesScroll: {
    paddingRight: 12,
    paddingTop: 4,
  },
  exerciseCard: {
    width: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
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
