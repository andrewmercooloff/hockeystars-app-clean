import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from '../../components/BlurOrSolid';
import SkeletonList from '../../components/SkeletonList';
import PressableScale from '../../components/PressableScale';
import CachedBackground from '../../components/CachedBackground';
import { loadCurrentUser } from '../../utils/playerStorage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useScreenContext } from '../../contexts/ScreenContext';
import { useExercises } from '../../hooks/useExercises';
import { LocalizedExercise, Language } from '../../types/exercise';
import { platformCardShadow } from '../../utils/androidShadow';
import { colors } from '../../theme/colors';
import { registerTabScrollHandler } from '../../utils/tabScrollRegistry';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout';

const { width } = Dimensions.get('window');

export default function ExercisesScreen() {
  const { t, language, isLanguageLoaded } = useLanguage();
  const router = useRouter();
  const { setCurrentScreen } = useScreenContext();
  const isFocused = useIsFocused();
  const isDesktop = useIsDesktopLayout();
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
  } = useExercises(language as Language, undefined, { enabled: isLanguageLoaded }); // Убираем фильтры - загружаем все упражнения, ждем загрузки языка

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

  // Устанавливаем currentScreen при фокусе на экране упражнений
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('exercises');
      return () => {
        setCurrentScreen(null);
      };
    }, [setCurrentScreen])
  );

  // Фильтруем и сортируем упражнения с мемоизацией (клиентская фильтрация)
  const sortedExercises = useMemo(() => {
    // Если данные еще загружаются или язык не установлен, возвращаем пустой массив
    // Это предотвращает показ данных на неправильном языке при первом запуске
    if (!isLanguageLoaded || loading || allExercises.length === 0 || !language) {
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
  }, [
    allExercises,
    selectedCategory,
    searchQuery,
    exerciseRankings,
    loading,
    language,
    isLanguageLoaded,
  ]);

  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      registerTabScrollHandler('exercises', () => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      });
      return () => registerTabScrollHandler('exercises', null);
    }, [])
  );

  const openExerciseDetails = useCallback(
    (exerciseId: string) => {
      router.push(`/exercises/${exerciseId}`);
    },
    [router]
  );

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


  // Mobile web: inactive tab scenes can stack over /ru/player — keep this screen empty off-focus.
  if (!isFocused) {
    return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
  }

  if (!isLanguageLoaded || loading) {
    return (
      <View style={styles.container}>
        <CachedBackground style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>{t('exercises.title')}</Text>
            </View>
            <SkeletonList rows={6} avatar={false} rowHeight={112} topInset={52} />
          </View>
        </CachedBackground>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <CachedBackground style={styles.background} resizeMode="cover">
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
              <View style={{ flex: 1, paddingTop: 150 }}>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  {/* Список упражнений */}
                  <View style={styles.exercisesContainer}>
                    {sortedExercises.map((exercise) => (
                      <TouchableOpacity
                        key={exercise.exerciseId}
                        onPress={() => openExerciseDetails(exercise.exerciseId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.exerciseGradientShadow}>
                          <BlurOrSolid
                            intensity={20}
                            tint="dark"
                            style={styles.exerciseCardBlur}
                          >
                            <View style={styles.exerciseCard}>
                            <View style={styles.exerciseHeader}>
                              <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                              <View style={styles.exerciseMeta}>
                                <View style={styles.difficultyContainer}>
                                  <Text style={styles.difficultyText}>
                                    {translateDifficulty(exercise.difficulty)}
                                  </Text>
                                </View>
                                <View style={styles.categoryContainer}>
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
                              <View style={styles.exerciseMeta}>
                                <Ionicons name="time-outline" size={16} color="#888" />
                                <Text style={styles.difficultyText}>{exercise.duration}</Text>
                              </View>
                              
                              {userStats[exercise.id] > 0 && (
                                <View style={styles.categoryContainer}>
                                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                  <Text style={styles.categoryText}>
                                    {userStats[exercise.id]} {userStats[exercise.id] === 1 ? t('exercises.times') : t('exercises.timesPlural')}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                            </BlurOrSolid>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('common.error')}: {error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refreshExercises}>
                  <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </CachedBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CachedBackground style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          {/* Заголовок страницы */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t('exercises.title')}</Text>
          </View>
          
          {/* Общий контейнер для поиска и фильтров */}
          <BlurOrSolid
            intensity={20}
            tint="dark"
            style={styles.searchAndFiltersContainerBlur}
          >
            <View style={styles.searchAndFiltersContainer}>
              {/* Полупрозрачный оверлей */}
              <View style={styles.searchAndFiltersOverlay}>
            {/* Строка поиска */}
            <View style={styles.searchInputWrapper}>
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
            </View>
          </BlurOrSolid>

          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >

          {/* Список упражнений */}
          <View style={[styles.exercisesContainer, isDesktop && styles.exercisesContainerDesktop]}>
            {sortedExercises.map((exercise) => (
              <PressableScale
                key={exercise.exerciseId}
                onPress={() => openExerciseDetails(exercise.exerciseId)}
                style={isDesktop ? styles.exerciseColDesktop : undefined}
              >
                <View style={[styles.exerciseGradientShadow, isDesktop && styles.exerciseGradientShadowDesktop]}>
                  <View style={styles.exerciseCard}>
                    <View style={styles.exerciseTopRow}>
                      <Text style={styles.exerciseTitle} numberOfLines={2} ellipsizeMode="tail">
                        {exercise.title}
                      </Text>
                      <Text style={styles.exerciseNumber}>#{exercise.exerciseId}</Text>
                    </View>
                    <Text style={styles.exerciseDescription} numberOfLines={2}>
                      {exercise.description}
                    </Text>
                    <View style={styles.exerciseTags}>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{translateCategory(exercise.category)}</Text>
                      </View>
                      <View style={styles.tag}>
                        <Ionicons
                          name={getDifficultyIcon(exercise.difficulty) as any}
                          size={12}
                          color={getDifficultyColor(exercise.difficulty)}
                        />
                        <Text style={styles.tagText}>{translateDifficulty(exercise.difficulty)}</Text>
                      </View>
                      <View style={styles.tag}>
                        <Ionicons name="time-outline" size={12} color="#a1a1aa" />
                        <Text style={styles.tagText}>{exercise.duration}</Text>
                      </View>
                      <View style={styles.tagsSpacer} />
                      {exerciseRankings[exercise.exerciseId] > 0 && (
                        <View style={styles.metaItem}>
                          <Ionicons name="flame" size={13} color="#a1a1aa" />
                          <Text style={styles.metaText}>{exerciseRankings[exercise.exerciseId]}</Text>
                        </View>
                      )}
                      {userStats[exercise.exerciseId] > 0 && (
                        <View style={styles.metaItem}>
                          <Ionicons name="checkmark-circle" size={13} color="#4CAF50" />
                          <Text style={[styles.metaText, { color: '#4CAF50' }]}>{userStats[exercise.exerciseId]}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </PressableScale>
            ))}
          </View>
          </ScrollView>
        </View>
      </CachedBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.scene,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.screenOverlay,
  },
  overlayLoading: {
    flex: 1,
    backgroundColor: colors.screenOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
  },
  scrollView: {
    flex: 1,
    paddingTop: 160, // Отступ для заголовка + общий контейнер с поиском и фильтрами + 20
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.headerBar,
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
  searchAndFiltersContainerBlur: {
    position: 'absolute',
    top: 41, // Под заголовком
    left: 0,
    right: 0,
    zIndex: 1001,
    overflow: 'visible', // Разрешаем фильтрам выходить за пределы
  },
  searchAndFiltersContainer: {
    backgroundColor: 'rgba(22, 22, 26, 0.62)',
  },
  searchAndFiltersOverlay: {
    backgroundColor: 'rgba(22, 22, 26, 0.62)',
    paddingVertical: 0,
  },
  searchInputWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  categoriesScroll: {
    flexDirection: 'row',
    paddingTop: 4, // Отступ сверху после поля поиска
    paddingBottom: 8, // Отступ снизу для фильтров
    paddingHorizontal: 20, // Отступы по краям для кнопок фильтров
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
    paddingBottom: 120,
  },
  exercisesContainerDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    alignItems: 'stretch',
  },
  exerciseColDesktop: {
    width: '50%',
  },
  exerciseCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  exerciseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#1c1c21',
    flex: 1,
  },
  exerciseGradientShadow: {
    marginVertical: 6,
    marginHorizontal: 16,
    borderRadius: 16,
    ...platformCardShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  exerciseTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  exerciseTags: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
  tagsSpacer: {
    flex: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
  },
  metaText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  exerciseGradientShadowDesktop: {
    marginHorizontal: 8,
    flex: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseTitle: {
    fontSize: 17,
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    marginRight: 10,
    lineHeight: 22,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#a1a1aa',
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
    color: '#a1a1aa',
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
    color: '#a1a1aa',
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
    backgroundColor: 'rgb(1,0,0)',
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 22, 26, 0.7)',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    height: 44,
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
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  exerciseNumber: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginTop: 3,
  },
});