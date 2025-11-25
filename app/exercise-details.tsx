import { useLocalSearchParams, useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, ImageBackground } from 'react-native';
import { BlurView } from 'expo-blur';
import { completeExercise, getExerciseCompletionCount, getPlayerById, loadCurrentUser, saveCurrentUser, Player, getLastExerciseCompletion } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { useExercises } from '../hooks/useExercises';
import { Language } from '../types/exercise';
import { Ionicons } from '@expo/vector-icons';
import { addActivityPoints } from '../services/activityService';

const iceBg = require('../assets/images/led.jpg');
const { width } = Dimensions.get('window');

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const { t, language, isLanguageLoaded } = useLanguage();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const exerciseId = localParams.id || globalParams.id;
  
  // Используем хук для загрузки упражнений из базы данных
  const { getExerciseById, loading, error, markAsCompleted } = useExercises(
    language as Language,
    undefined,
    { enabled: isLanguageLoaded }
  );
  const [exercise, setExercise] = useState<any>(null);
  const [exerciseLoading, setExerciseLoading] = useState(true);
  
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [completionCount, setCompletionCount] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastCompletionTime, setLastCompletionTime] = useState<Date | null>(null);
  const [canComplete, setCanComplete] = useState(true);

  // Функция для перевода категорий
  const translateCategory = (category: string): string => {
    return t(`exercises.categories.${category}`) || category;
  };

  // Функция для перевода сложности
  const translateDifficulty = (difficulty: string): string => {
    return t(`exercises.difficulties.${difficulty}`) || difficulty;
  };

  // Функция для навигации назад - возвращаемся на экран упражнений
  const handleGoBack = () => {
    router.push('/exercises');
  };
  
  // Загружаем данные пользователя при изменении exerciseId
  useEffect(() => {
    // Сбрасываем состояние при смене упражнения
    setCanComplete(true);
    setLastCompletionTime(null);
    setCompletionCount(0);
    
    if (exerciseId) {
    loadUserData();
    }
  }, [exerciseId]);

  useEffect(() => {
    loadExercise();
  }, [exerciseId, language]);
  
  const loadExercise = async () => {
    if (exerciseId && language) {
      try {
        setExerciseLoading(true);
        const exerciseData = await getExerciseById(exerciseId as string);
        setExercise(exerciseData);
        
       // Трекаем просмотр упражнения
       if (currentUser && currentUser.status === 'player') {
         try {
           await addActivityPoints(currentUser.id, 'EXERCISE_VIEW');
         } catch (error) {
           console.error('Failed to track exercise view:', error);
         }
       }
      } catch (error) {
        console.error('❌ Ошибка загрузки упражнения:', error);
        setExercise(null);
      } finally {
        setExerciseLoading(false);
      }
    }
  };

  const loadUserData = async () => {
    try {
      const user = await loadCurrentUser();
      
      if (user) {
        setCurrentUser(user);
        const count = await getExerciseCompletionCount(user.id, exerciseId as string);
        setCompletionCount(count);
        
        // Проверяем время последнего выполнения
        checkLastCompletionTime(user.id);
      } else {
        console.warn('⚠️ Пользователь не найден');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки пользователя:', error);
    }
  };

  const checkLastCompletionTime = async (userId: string) => {
    try {
      // Получаем время последнего выполнения упражнения
      const lastCompletion = await getLastExerciseCompletion(userId, exerciseId as string);
      if (lastCompletion) {
        const lastTime = new Date(lastCompletion.completedAt);
        const now = new Date();
        const hoursSinceLastCompletion = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
        
        setLastCompletionTime(lastTime);
        setCanComplete(hoursSinceLastCompletion >= 12);
        
      } else {
        setCanComplete(true);
      }
    } catch (error) {
      console.error('❌ Ошибка проверки времени выполнения:', error);
      setCanComplete(true);
    }
  };
  
  const handleCompleteExercise = async () => {
    if (!currentUser || !exerciseId) {
      console.warn('⚠️ Нет пользователя или ID упражнения');
      return;
    }
    
    // Защита от повторного вызова
    if (isCompleting) {
      return;
    }
    
    if (currentUser.status !== 'player') {
      console.warn('⚠️ Упражнения доступны только для игроков');
      Alert.alert(
        t('exercises.details.error'),
        t('exercises.details.playersOnly'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    if (!canComplete) {
      const hoursLeft = 12 - Math.floor((new Date().getTime() - (lastCompletionTime?.getTime() || 0)) / (1000 * 60 * 60));
      Alert.alert(
        t('exercises.alreadyCompleted'),
        t('exercises.canRetryIn', { hours: hoursLeft })
      );
      return;
    }
    
    setIsCompleting(true);
    
    try {
      // Выполняем упражнение
      await markAsCompleted(exerciseId as string);
      
      // Трекаем выполнение упражнения
      try {
        await addActivityPoints(currentUser.id, 'EXERCISE_COMPLETE');
      } catch (error) {
        console.error('❌ Failed to track exercise completion:', error);
      }
      
      // Обновляем локальное состояние
      setCompletionCount(prev => prev + 1);
      setCanComplete(false);
      setLastCompletionTime(new Date());
      
      Alert.alert(
        t('exercises.details.completed'),
        t('exercises.details.markedComplete'),
        [{ text: t('common.ok') }]
      );
      
      // Принудительно обновляем данные пользователя через UserContext
      try {
        const { useUser } = await import('../contexts/UserContext');
        // Получаем функцию из контекста (это будет работать только если мы в компоненте)
        // Для этого нужно передать функцию через props или использовать другой подход
      } catch (error) {
        console.error('❌ Ошибка обновления данных пользователя:', error);
      }
      
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      Alert.alert(
        t('exercises.details.error'),
        t('exercises.details.saveError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Начинающий':
      case 'Beginner':
      case 'Легкая':
      case 'Easy':
        return '#4CAF50';
      case 'Средний':
      case 'Intermediate':
      case 'Средняя':
      case 'Medium':
        return '#FF9800';
      case 'Продвинутый':
      case 'Advanced':
        return '#fa2f40';
      case 'Сложная':
      case 'Hard':
        return '#fa2f40';
      default:
        return '#757575';
    }
  };

  if (exerciseLoading) {
    return (
      <View style={styles.container}>
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            {/* Заголовок */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push('/exercises')}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>
                {t('exercises.loadingExercise')}
              </Text>
            </View>
            
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('exercises.loadingExercise')}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View style={styles.container}>
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            {/* Заголовок */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push('/exercises')}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>
                {t('exercises.details.notFound')}
              </Text>
            </View>
            
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#fa2f40" />
              <Text style={styles.errorTitle}>{t('common.error')}</Text>
              <Text style={styles.errorText}>
                {error || t('exercises.details.notFound')}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => {
                  loadExercise();
                }}
              >
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
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
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{exercise?.title || t('exercises.details.title')}</Text>
          </View>
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

            {/* Основная информация */}
            <BlurView
              intensity={20}
              tint="dark"
              style={styles.infoSectionBlur}
            >
              <View style={styles.infoSection}>
                <View style={styles.infoSectionContent}>
                  <View style={styles.infoRow}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.infoLabel}>{t('exercises.details.category')}:</Text>
                    <Text style={styles.infoValue}>{translateCategory(exercise?.category || '')}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={20} color="#fff" />
                    <Text style={styles.infoLabel}>{t('exercises.details.duration')}:</Text>
                    <Text style={styles.infoValue}>{exercise?.duration || ''}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="trending-up-outline" size={20} color="#fff" />
                    <Text style={styles.infoLabel}>{t('exercises.details.difficulty')}:</Text>
                    <View style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(exercise?.difficulty || '') }
                    ]}>
                      <Text style={styles.difficultyText}>{translateDifficulty(exercise?.difficulty || '')}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </BlurView>

            {/* Описание */}
            <View style={styles.sectionWrapper}>
              <BlurView
                intensity={20}
                tint="dark"
                style={styles.sectionContainerBlur}
              >
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>{t('exercises.details.description')}</Text>
                  <Text style={styles.description}>{exercise?.description || ''}</Text>
                </View>
              </BlurView>
            </View>

            {/* Польза */}
            <View style={styles.sectionWrapper}>
              <BlurView
                intensity={20}
                tint="dark"
                style={styles.sectionContainerBlur}
              >
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>{t('exercises.details.benefits')}</Text>
                  {exercise?.benefits?.map((benefit: string, index: number) => (
                    <View key={index} style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#fa2f40" />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </BlurView>
            </View>

            {/* Инструкции */}
            <View style={styles.sectionWrapper}>
              <BlurView
                intensity={20}
                tint="dark"
                style={styles.sectionContainerBlur}
              >
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>{t('exercises.details.instructions')}</Text>
                  {exercise?.instructions?.map((instruction: string, index: number) => (
                    <View key={index} style={styles.instructionItem}>
                      <View style={styles.instructionNumber}>
                        <Text style={styles.instructionNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.instructionText}>{instruction}</Text>
                    </View>
                  ))}
                </View>
              </BlurView>
            </View>

            {/* Советы */}
            <View style={styles.sectionWrapper}>
              <BlurView
                intensity={20}
                tint="dark"
                style={styles.sectionContainerBlur}
              >
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>{t('exercises.details.tips')}</Text>
                  {exercise?.tips?.map((tip: string, index: number) => (
                    <View key={index} style={styles.tipItem}>
                      <Ionicons name="bulb-outline" size={20} color="#fa2f40" />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </BlurView>
            </View>

        {/* Дополнительная информация */}
            <View style={styles.sectionWrapper}>
              <BlurView
                intensity={20}
                tint="dark"
                style={styles.sectionContainerBlur}
              >
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>{t('exercises.details.additionalInfo')}</Text>
                  <View style={styles.bottomInfoRow}>
                    <Ionicons name="barbell-outline" size={20} color="#fa2f40" />
                    <Text style={styles.bottomInfoLabel}>{t('exercises.details.equipment')}:</Text>
                    <Text style={styles.bottomInfoValue}>{exercise?.equipment || ''}</Text>
                  </View>
                  
                  <View style={styles.bottomInfoRow}>
                    <Ionicons name="flame-outline" size={20} color="#fa2f40" />
                    <Text style={styles.bottomInfoLabel}>{t('exercises.details.calories')}:</Text>
                    <Text style={styles.bottomInfoValue}>{exercise?.calories || ''}</Text>
                  </View>
                </View>
              </BlurView>
            </View>

        {/* Статистика выполнения */}
        {currentUser && (
          <View style={styles.completionStatsWrapper}>
            <BlurView
              intensity={20}
              tint="dark"
              style={styles.sectionContainerBlur}
            >
              <View style={styles.completionStatsCard}>
                <View style={styles.completionStatsContent}>
                  <Ionicons name="checkmark-circle" size={20} color="#fa2f40" />
                  <Text style={styles.completionStatsText}>
                    {t('exercises.details.completed')} {completionCount}
                  </Text>
                </View>
              </View>
            </BlurView>
          </View>
        )}

        {/* Кнопка завершения */}
        {currentUser && currentUser.status === 'player' ? (
                <TouchableOpacity
                  style={[styles.completeButton, (!canComplete || isCompleting) && styles.completeButtonDisabled]}
                  onPress={handleCompleteExercise}
                  disabled={!canComplete || isCompleting}
                >
                  <View style={styles.completeButtonContent}>
                    {!isCompleting && canComplete && (
                      <Ionicons name="barbell" size={20} color="#fff" style={styles.completeButtonIcon} />
                    )}
                    <Text style={styles.completeButtonText}>
                      {isCompleting ? t('exercises.details.saving') : 
                       !canComplete ? t('exercises.details.alreadyCompleted') : 
                       t('exercises.details.completedButton')}
                    </Text>
                  </View>
                </TouchableOpacity>
        ) : currentUser ? (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>{t('exercises.details.playersOnly')}</Text>
              </View>
            ) : (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>{t('exercises.details.loginRequired')}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.2)',
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 42, // Отступ для абсолютного заголовка
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
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
  infoSectionBlur: {
    marginTop: -1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  infoSection: {
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  infoSectionContent: {
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginLeft: 10,
    marginRight: 10,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionWrapper: {
    marginTop: 10,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  sectionContainerBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionContainer: {
    backgroundColor: 'rgba(1, 0, 0, 0.75)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    lineHeight: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingVertical: 4,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fa2f40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    flex: 1,
    lineHeight: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  bottomInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#2a2a2a',
  },
  bottomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  bottomInfoLabel: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginLeft: 12,
    marginRight: 8,
  },
  bottomInfoValue: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statsTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: '#fa2f40',
    textAlign: 'center',
  },
  completionStatsWrapper: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  completionStatsCard: {
    backgroundColor: 'rgba(1, 0, 0, 0.75)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  completionStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionStatsText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 8,
  },
  completeButton: {
    backgroundColor: '#fa2f40',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
  },
  completeButtonDisabled: {
    backgroundColor: '#666',
    borderColor: 'rgba(102, 102, 102, 0.3)',
  },
  completeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonIcon: {
    marginRight: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
  },
  loginPrompt: {
    backgroundColor: '#333',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginPromptText: {
    color: '#ccc',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Отступ для фиксированного заголовка
  },
  errorTitle: {
    color: '#fa2f40',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
});
