import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, ImageBackground } from 'react-native';
import { completeExercise, getExerciseCompletionCount, getPlayerById, loadCurrentUser, saveCurrentUser, Player, getLastExerciseCompletion } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { useExercises } from '../hooks/useExercises';
import { Language } from '../types/exercise';

const iceBg = require('../assets/images/led.jpg');
const { width } = Dimensions.get('window');

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const exerciseId = localParams.id || globalParams.id;
  
  // Используем хук для загрузки упражнений из базы данных
  const { getExerciseById, loading, error, markAsCompleted } = useExercises(language as Language);
  const [exercise, setExercise] = useState<any>(null);
  const [exerciseLoading, setExerciseLoading] = useState(true);
  
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [completionCount, setCompletionCount] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastCompletionTime, setLastCompletionTime] = useState<Date | null>(null);
  const [canComplete, setCanComplete] = useState(true);
  
  useEffect(() => {
    console.log('🔄 ExerciseDetailsScreen useEffect вызван с exerciseId:', exerciseId);
    loadUserData();
    loadExercise();
  }, [exerciseId]);
  
  const loadExercise = async () => {
    if (exerciseId) {
      try {
        setExerciseLoading(true);
        console.log('🔄 Загружаем упражнение с ID:', exerciseId);
        const exerciseData = await getExerciseById(exerciseId as string);
        console.log('✅ Упражнение загружено:', exerciseData);
        setExercise(exerciseData);
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
      console.log('🔄 Загружаем данные пользователя...');
      const user = await loadCurrentUser();
      console.log('👤 Загруженный пользователь:', user);
      
      if (user) {
        setCurrentUser(user);
        console.log('📊 Получаем количество выполнений для упражнения:', exerciseId);
        const count = await getExerciseCompletionCount(user.id, exerciseId as string);
        console.log('🔢 Количество выполнений:', count);
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
        
        console.log('⏰ Время последнего выполнения:', lastTime);
        console.log('⏰ Часов с последнего выполнения:', hoursSinceLastCompletion);
        console.log('✅ Можно выполнить:', hoursSinceLastCompletion >= 12);
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
    
    if (currentUser.status !== 'player') {
      console.warn('⚠️ Упражнения доступны только для игроков');
      Alert.alert(
        t('exercises.details.error'),
        t('exercises.details.playersOnly'),
        [{ text: 'OK' }]
      );
      return;
    }

    if (!canComplete) {
      const hoursLeft = 12 - Math.floor((new Date().getTime() - (lastCompletionTime?.getTime() || 0)) / (1000 * 60 * 60));
      Alert.alert(
        'Упражнение уже выполнено',
        `Вы можете выполнить это упражнение снова через ${hoursLeft} часов`
      );
      return;
    }
    
    setIsCompleting(true);
    try {
      console.log('🔄 Отмечаем упражнение как выполненное:', { userId: currentUser.id, exerciseId, status: currentUser.status });
      await markAsCompleted(exerciseId as string);
      
      setCompletionCount(prev => prev + 1);
      setCanComplete(false);
      setLastCompletionTime(new Date());
      console.log('✅ Упражнение отмечено как выполненное');
      Alert.alert(
        t('exercises.details.completed'),
        t('exercises.details.markedComplete'),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      Alert.alert(
        t('exercises.details.error'),
        t('exercises.details.saveError'),
        [{ text: 'OK' }]
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
        return '#F44336';
      case 'Сложная':
      case 'Hard':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  if (exerciseLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Загрузка упражнения...</Text>
        </View>
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {error || t('exercises.details.notFound')}
        </Text>
      </View>
    );
  }

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
          <Text style={styles.pageTitle}>{exercise?.title || 'Упражнение'}</Text>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

            {/* Основная информация */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
            <Ionicons name="folder-outline" size={20} color="#fff" />
            <Text style={styles.infoLabel}>{t('exercises.details.category')}:</Text>
            <Text style={styles.infoValue}>{exercise?.category || ''}</Text>
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
              <Text style={styles.difficultyText}>{exercise?.difficulty || ''}</Text>
                </View>
              </View>
            </View>

            {/* Описание */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{t('exercises.details.description')}</Text>
              <Text style={styles.description}>{exercise?.description || ''}</Text>
            </View>

            {/* Польза */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{t('exercises.details.benefits')}</Text>
              {exercise?.benefits?.map((benefit: string, index: number) => (
                <View key={index} style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#FF4444" />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {/* Инструкции */}
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

            {/* Советы */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{t('exercises.details.tips')}</Text>
              {exercise?.tips?.map((tip: string, index: number) => (
                <View key={index} style={styles.tipItem}>
                  <Ionicons name="bulb-outline" size={20} color="#FF4444" />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

        {/* Дополнительная информация */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{t('exercises.details.additionalInfo')}</Text>
              <View style={styles.bottomInfoRow}>
                <Ionicons name="fitness-outline" size={20} color="#FF4444" />
                <Text style={styles.bottomInfoLabel}>{t('exercises.details.equipment')}:</Text>
                <Text style={styles.bottomInfoValue}>{exercise?.equipment || ''}</Text>
              </View>
              
              <View style={styles.bottomInfoRow}>
                <Ionicons name="flame-outline" size={20} color="#FF4444" />
                <Text style={styles.bottomInfoLabel}>{t('exercises.details.calories')}:</Text>
                <Text style={styles.bottomInfoValue}>{exercise?.calories || ''}</Text>
              </View>
            </View>

        {/* Статистика выполнения */}
        {currentUser && (
          <View style={styles.completionStatsCard}>
            <View style={styles.completionStatsContent}>
              <Ionicons name="checkmark-circle" size={20} color="#FF4444" />
              <Text style={styles.completionStatsText}>
                {t('exercises.details.completed')} {completionCount}
              </Text>
            </View>
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
                       !canComplete ? 'Уже выполнено' : 
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
    paddingTop: 0, // Убираем отступ, так как заголовок теперь фиксированный
  },
  header: {
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
  infoSection: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingTop: 60, // Отступ для фиксированного заголовка
    paddingBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: 'Gilroy-Medium',
    color: '#ccc',
    marginLeft: 10,
    marginRight: 10,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
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
    fontFamily: 'Gilroy-SemiBold',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionContainer: {
    marginTop: 10,
    marginBottom: 20,
    marginHorizontal: 20,
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
    backgroundColor: '#FF4444',
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
    fontFamily: 'Gilroy-Medium',
    color: '#ccc',
    marginLeft: 12,
    marginRight: 8,
  },
  bottomInfoValue: {
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
    color: '#fff',
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statsTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: '#FF4444',
    textAlign: 'center',
  },
  completionStatsCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
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
    fontFamily: 'Gilroy-Medium',
    color: '#FF4444',
    marginLeft: 8,
  },
  completeButton: {
    backgroundColor: '#FF4444',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
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
    marginTop: 100,
  },
});
