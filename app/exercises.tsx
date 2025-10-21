import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadCurrentUser } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { useScreenContext } from '../contexts/ScreenContext';
import { useExercises } from '../hooks/useExercises';
import { LocalizedExercise, Language } from '../types/exercise';

const iceBg = require('../assets/images/led.jpg');

const { width } = Dimensions.get('window');

export default function ExercisesScreen() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { setCurrentScreen } = useScreenContext();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Функция для перевода категорий
  const translateCategory = (category: string): string => {
    return t(`exercises.categories.${category}`) || category;
  };

  // Функция для перевода сложности
  const translateDifficulty = (difficulty: string): string => {
    return t(`exercises.difficulties.${difficulty}`) || difficulty;
  };

  // Используем новый хук для загрузки упражнений из базы данных (все упражнения)
  const {
    exercises: allExercises,
    loading,
    error,
    categories,
    difficulties,
    refreshExercises,
    userStats,
    exerciseRankings
  } = useExercises(language as Language); // Убираем фильтры - загружаем все упражнения

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

  // Обновляем упражнения при изменении категории (поиск теперь клиентский)
  useEffect(() => {
    refreshExercises();
  }, [selectedCategory]);

  // Устанавливаем currentScreen при фокусе на экране упражнений
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('exercises');
      console.log('💪 УПРАЖНЕНИЯ: Устанавливаем currentScreen = exercises');
      return () => {
        setCurrentScreen(null);
        console.log('💪 УПРАЖНЕНИЯ: Устанавливаем currentScreen = null');
      };
    }, [setCurrentScreen])
  );

  // Фильтруем и сортируем упражнения с мемоизацией (клиентская фильтрация)
  const sortedExercises = useMemo(() => {
    // Если данные еще загружаются, возвращаем пустой массив
    if (loading || allExercises.length === 0) {
      return [];
    }

    const filtered = allExercises.filter(exercise => {
      // Фильтр по категории
      if (selectedCategory && exercise.category !== selectedCategory) {
        return false;
      }
      
      // Фильтр по поиску (клиентский)
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim();
        const searchTerm = searchQuery.replace('#', '').trim(); // Убираем # если пользователь его ввел
        
        const matchesId = exercise.exerciseId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTitle = exercise.title.toLowerCase().includes(searchLower);
        
        if (!matchesId && !matchesTitle) {
          return false;
        }
      }
      
      return true;
    });

    return [...filtered].sort((a, b) => {
      // Сортируем по общему рейтингу (популярности среди всех пользователей)
      const aCompletions = exerciseRankings[a.exerciseId] || 0;
      const bCompletions = exerciseRankings[b.exerciseId] || 0;
      
      // Если популярность разная - сортируем по популярности
      if (bCompletions !== aCompletions) {
        return bCompletions - aCompletions;
      }
      
      // Если популярность одинаковая - сортируем по ID (числовому)
      const aId = parseInt(a.exerciseId);
      const bId = parseInt(b.exerciseId);
      return aId - bId;
    });
  }, [allExercises, selectedCategory, searchQuery, exerciseRankings, loading]);

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
        return '#fa2f40';
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
      <View style={styles.container}>
        <ImageBackground
          source={require('../assets/images/led.jpg')}
          style={styles.background}
          resizeMode="cover"
        >
          <View style={styles.overlayLoading}>
            <ActivityIndicator size="large" color="#fa2f40" />
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (error) {
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
            
            {/* Показываем кешированные данные если они есть, иначе ошибку */}
            {allExercises.length > 0 ? (
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                        {t('exercises.allCategories')}
                      </Text>
                    </TouchableOpacity>
                    
                    {categories.length > 0 ? categories.map((category) => (
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
                          {translateCategory(category)}
                        </Text>
                      </TouchableOpacity>
                    )) : (
                      // Fallback категории если не удалось загрузить
                      ['skating', 'shooting', 'passing', 'defense'].map((category) => (
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
                            {translateCategory(category)}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>

                {/* Список упражнений */}
                <View style={styles.exercisesContainer}>
                  {sortedExercises.map((exercise) => (
                    <TouchableOpacity
                      key={exercise.id}
                      style={styles.exerciseCard}
                      onPress={() => router.push(`/exercise-details?id=${exercise.id}`)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                        <View style={styles.exerciseBadges}>
                          <View style={styles.difficultyBadge}>
                            <Text style={styles.difficultyText}>
                              {translateDifficulty(exercise.difficulty)}
                            </Text>
                          </View>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>
                              {translateCategory(exercise.category)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <Text style={styles.exerciseDescription} numberOfLines={2}>
                        {exercise.description}
                      </Text>
                      
                      <View style={styles.exerciseFooter}>
                        <View style={styles.exerciseStats}>
                          <Ionicons name="time-outline" size={16} color="#888" />
                          <Text style={styles.exerciseDuration}>{exercise.duration}</Text>
                        </View>
                        
                        {userStats[exercise.id] > 0 && (
                          <View style={styles.completionBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                            <Text style={styles.completionText}>
                              {userStats[exercise.id]} {userStats[exercise.id] === 1 ? t('exercises.times') : t('exercises.timesPlural')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('common.error')}: {error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refreshExercises}>
                  <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ImageBackground>
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
          
          {/* Строка поиска */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('exercises.searchPlaceholder')}
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <Ionicons name="close-circle" size={20} color="#888" />
                </TouchableOpacity>
              )}
            </View>
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
                    {translateCategory(category)}
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
                    <View style={styles.exerciseTitleRow}>
                      <View style={styles.exerciseNumberBadge}>
                        <Text style={styles.exerciseNumber}>#{exercise.exerciseId}</Text>
                      </View>
                      <Text style={styles.exerciseTitle} numberOfLines={2} ellipsizeMode="tail">
                        {exercise.title}
                      </Text>
                    </View>
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
                        {translateDifficulty(exercise.difficulty)}
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
                    <Ionicons name="checkmark" size={16} color="#fa2f40" />
                    <Text style={styles.categoryText}>{translateCategory(exercise.category)}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  overlayLoading: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingTop: 157, // Отступ для заголовка + поиск + фильтры
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
    top: 93, // Ниже строки поиска
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 0, // Убираем горизонтальные отступы
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryButtonActive: {
    backgroundColor: '#fa2f40',
    borderColor: '#fa2f40',
  },
  categoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Gilroy-Regular',
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
    borderColor: 'rgba(250, 47, 64, 0.3)',
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
    flex: 1,
    flexWrap: 'wrap',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    fontFamily: 'Gilroy-Regular',
  },
  exerciseMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
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
    fontFamily: 'Gilroy-Regular',
  },
  durationText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Gilroy-Regular',
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
    color: '#fa2f40',
    marginLeft: 4,
    fontWeight: '500',
    fontFamily: 'Gilroy-Regular',
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
    fontFamily: 'Gilroy-Regular',
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
    fontFamily: 'Gilroy-Regular',
  },
  popularityText: {
    fontSize: 12,
    color: '#FF6B35',
    marginLeft: 2,
    fontWeight: '600',
    fontFamily: 'Gilroy-Bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#fa2f40',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Gilroy-Regular',
  },
  retryButton: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Gilroy-Bold',
  },
  // Стили для поиска (как в search.tsx)
  searchContainer: {
    position: 'absolute',
    top: 41, // Под заголовком
    left: 0,
    right: 0,
    zIndex: 1001, // Выше категорий (999)
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8, // Уменьшили отступы
    borderWidth: 0.5,
    borderColor: '#fa2f40',
    height: 40, // Фиксированная высота вместо minHeight
    width: '100%',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14, // Уменьшили размер шрифта
    height: 24, // Фиксированная высота для текста
    textAlignVertical: 'center', // Центрируем текст по вертикали (Android)
    paddingVertical: 0, // Убираем вертикальные отступы
    fontFamily: 'Gilroy-Regular',
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
    width: 28, // Фиксированная ширина
    height: 28, // Фиксированная высота
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Стили для номеров упражнений
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'nowrap',
  },
  exerciseNumberBadge: {
    backgroundColor: '#fa2f40',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  exerciseNumber: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
});