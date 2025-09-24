import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    ImageBackground,
} from 'react-native';
import { loadCurrentUser } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { useExercises } from '../hooks/useExercises';
import { LocalizedExercise, Language } from '../types/exercise';

const iceBg = require('../assets/images/led.jpg');

const { width } = Dimensions.get('window');

export default function ExercisesScreen() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Используем новый хук для загрузки упражнений из базы данных
  const {
    exercises,
    loading,
    error,
    categories,
    difficulties,
    refreshExercises,
    userStats,
    exerciseRankings
  } = useExercises(language as Language, {
    category: selectedCategory || undefined,
    search: searchQuery || undefined
  });

  // Загружаем данные пользователя
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await loadCurrentUser();
          setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Обновляем упражнения при изменении категории или поиска
  useEffect(() => {
    refreshExercises();
  }, [selectedCategory, searchQuery]);

  // Фильтруем и сортируем упражнения с мемоизацией
  const sortedExercises = useMemo(() => {
    const filtered = exercises.filter(exercise => {
      if (selectedCategory && exercise.category !== selectedCategory) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      // Сортируем по общему рейтингу (популярности среди всех пользователей)
      const aCompletions = exerciseRankings[a.exerciseId] || 0;
      const bCompletions = exerciseRankings[b.exerciseId] || 0;
      return bCompletions - aCompletions;
    });
  }, [exercises, selectedCategory, exerciseRankings]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Начинающий':
      case 'Beginner':
      case 'Легкая':
        return '#4CAF50';
      case 'Средний':
      case 'Intermediate':
        return '#FF9800';
      case 'Продвинутый':
      case 'Advanced':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'Начинающий':
      case 'Beginner':
      case 'Легкая':
        return 'star-outline';
      case 'Средний':
      case 'Intermediate':
        return 'star-half-outline';
      case 'Продвинутый':
      case 'Advanced':
        return 'star';
      default:
        return 'help-outline';
    }
  };

  if (loading) {
    return (
            <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('common.error')}: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshExercises}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          {/* Заголовок страницы */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t('exercises.title')}</Text>
          </View>
          
          {/* Фильтры по категориям */}
          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === null && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === null && styles.categoryButtonTextActive
                ]}>
                  {t('exercises.all')}
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category && styles.categoryButtonTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {/* Список упражнений */}
          <View style={styles.exercisesContainer}>
            {sortedExercises.map((exercise, index) => (
              <TouchableOpacity
                key={`${exercise.exerciseId}-${index}`}
                style={styles.exerciseCard}
                onPress={() => {
                  // Навигация к деталям упражнения
                  console.log('🔄 Навигация к упражнению:', exercise.exerciseId);
                  console.log('🔄 Полный объект упражнения:', exercise);
                  try {
                    router.navigate({
                      pathname: '/exercise-details',
                      params: { id: exercise.exerciseId }
                    });
                  } catch (error) {
                    console.error('❌ Ошибка навигации:', error);
                    // Fallback к старому способу
                    router.push(`/exercise-details?id=${exercise.exerciseId}`);
                  }
                }}
              >
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                    <Text style={styles.exerciseDescription} numberOfLines={2}>
                      {exercise.description}
                    </Text>
                          </View>
                  <View style={styles.exerciseMeta}>
                    <View style={styles.difficultyContainer}>
                      <Ionicons
                        name={getDifficultyIcon(exercise.difficulty) as any}
                        size={16}
                        color={getDifficultyColor(exercise.difficulty)}
                      />
                      <Text style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(exercise.difficulty) }
                      ]}>
                        {exercise.difficulty}
                      </Text>
                    </View>
                    <Text style={styles.durationText}>{exercise.duration}</Text>
                    
                    {/* Общее количество выполнений (популярность) */}
                    {exerciseRankings[exercise.exerciseId] > 0 && (
                      <View style={styles.popularityContainer}>
                        <Ionicons name="flame" size={14} color="#FF6B35" />
                        <Text style={styles.popularityText}>
                          {exerciseRankings[exercise.exerciseId]}
                        </Text>
                      </View>
                    )}
                    
                    {/* Статистика выполнения пользователя */}
                    {userStats[exercise.exerciseId] > 0 && (
                      <View style={styles.userCompletionContainer}>
                        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                        <Text style={styles.userCompletionText}>
                          {userStats[exercise.exerciseId]}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.exerciseFooter}>
                  <View style={styles.categoryContainer}>
                    <Ionicons name="fitness" size={16} color="#FF4444" />
                    <Text style={styles.categoryText}>{exercise.category}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scrollView: {
    flex: 1,
    paddingTop: 107, // Отступ для заголовка + фильтры
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    textAlign: 'left',
  },
  categoriesContainer: {
    position: 'absolute',
    top: 43, // Поднято еще на 5 пикселей выше
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 0, // Убираем горизонтальные отступы
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  categoriesScroll: {
    flexDirection: 'row',
    paddingHorizontal: 20, // Отступы для кнопок фильтров
    paddingRight: 20, // Дополнительный отступ справа
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryButtonActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  categoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Gilroy-Medium',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Gilroy-Bold',
  },
  exercisesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exerciseCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Gilroy-Bold',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    fontFamily: 'Gilroy-Regular',
  },
  exerciseMeta: {
    alignItems: 'flex-end',
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#999',
  },
  exerciseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: '#FF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  completionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  popularityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  userCompletionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  userCompletionText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  popularityText: {
    fontSize: 12,
    color: '#FF6B35',
    marginLeft: 2,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});