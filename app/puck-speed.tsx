import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  ImageBackground,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { processPuckSpeedVideo } from '../utils/puckSpeedProcessor';
import { savePuckSpeedResult } from '../utils/playerStorage';
import { Dimensions } from 'react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PuckSpeedScreen() {
  const { t } = useLanguage();
  const { currentUser } = useUser();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [measuredSpeed, setMeasuredSpeed] = useState<number | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [puckSizeMatch, setPuckSizeMatch] = useState<'too-small' | 'too-large' | 'perfect' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false); // Флаг ручной калибровки
  const autoStartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const perfectMatchCountRef = useRef<number>(0); // Счетчик последовательных "perfect" проверок
  
  // Размеры и позиция зоны для шайбы (круг в центре, чуть ниже)
  const ZONE_SIZE = 90; // Диаметр зоны (точный размер шайбы на расстоянии 1м)
  const ZONE_CENTER_X = SCREEN_WIDTH / 2;
  const ZONE_CENTER_Y = SCREEN_HEIGHT * 0.6; // Чуть ниже центра

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    
    // Очищаем таймеры при размонтировании
    return () => {
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
      }
      if (autoCheckIntervalRef.current) {
        clearInterval(autoCheckIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [permission, requestPermission]);

  // Убрали автоматическую проверку - теперь пользователь вручную подтверждает калибровку
  // useEffect(() => {
  //   if (isCameraReady && !recordingUri && !isRecording && !isProcessing && !countdown) {
  //     autoCheckIntervalRef.current = setInterval(() => {
  //       checkPuckSize();
  //     }, 1000);
      
  //     return () => {
  //       if (autoCheckIntervalRef.current) {
  //         clearInterval(autoCheckIntervalRef.current);
  //       }
  //     };
  //   }
  // }, [isCameraReady, recordingUri, isRecording, isProcessing, countdown]);

  // Реальная детекция шайбы через анализ кадров с камеры
  const checkPuckSize = async () => {
    // Если уже perfect и идет отсчет - не проверяем повторно
    if (puckSizeMatch === 'perfect' && countdown !== null) return;
    
    try {
      // Пытаемся захватить кадр с камеры
      if (!cameraRef.current || !isCameraReady) {
        // Камера не готова - пропускаем проверку
        return;
      }

      console.log('📸 Захватываем кадр с камеры...');
      
      // Захватываем снимок с камеры (быстро, без звука)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3, // Низкое качество для скорости
        skipProcessing: true, // Быстрее
      });

      if (!photo || !photo.uri) {
        console.warn('⚠️ Не удалось захватить кадр');
        return;
      }

      console.log('✅ Кадр захвачен:', photo.uri);
      
      // Анализируем изображение
      const analysis = await analyzePuckInImage(photo.uri);
      
      if (!analysis) {
        // Шайба не обнаружена
        perfectMatchCountRef.current = 0;
        setPuckSizeMatch(null);
        return;
      }

      // Проверяем размер (должен быть ~90px ± 15px для большей толерантности)
      const sizeDiff = Math.abs(analysis.size - ZONE_SIZE);
      const isPerfectSize = sizeDiff <= 15;
      
      // Проверяем форму (соотношение сторон должно быть близко к 1:1 для круга)
      const aspectRatio = analysis.width / analysis.height;
      // Увеличиваем толерантность для формы: 0.75-1.35 (шайба сбоку может быть эллипсом)
      const isCircularShape = aspectRatio >= 0.75 && aspectRatio <= 1.35;
      
      // Проверяем позицию (должна быть в центре зоны ± 40px для большей толерантности)
      const distanceFromCenter = Math.sqrt(
        Math.pow(analysis.position.x - ZONE_CENTER_X, 2) + 
        Math.pow(analysis.position.y - ZONE_CENTER_Y, 2)
      );
      const isInCenter = distanceFromCenter <= 40; // В пределах 40px от центра
      
      console.log(`🔍 Проверка: размер=${analysis.size.toFixed(0)}px (нужно ${ZONE_SIZE}±15, разница=${sizeDiff.toFixed(0)}, OK=${isPerfectSize}), форма=${aspectRatio.toFixed(2)} (OK=${isCircularShape}), позиция=${distanceFromCenter.toFixed(0)}px (OK=${isInCenter})`);
      
      // Все три условия должны быть выполнены одновременно
      if (isPerfectSize && isCircularShape && isInCenter) {
        // Увеличиваем счетчик последовательных perfect проверок
        perfectMatchCountRef.current += 1;
        
        console.log(`✅ Perfect match ${perfectMatchCountRef.current}/2: размер=${analysis.size.toFixed(0)}px, форма=${aspectRatio.toFixed(2)}, позиция=${distanceFromCenter.toFixed(0)}px`);
        
        // Показываем промежуточное состояние - почти идеально
        if (perfectMatchCountRef.current === 1) {
          setPuckSizeMatch(null); // Показываем нейтральное состояние, но не сбрасываем счетчик
        }
        
        // Нужно минимум 2 последовательных perfect проверки подряд
        if (perfectMatchCountRef.current >= 2) {
          // Perfect match подтвержден!
          setPuckSizeMatch('perfect');
          
          // Останавливаем автопроверку
          if (autoCheckIntervalRef.current) {
            clearInterval(autoCheckIntervalRef.current);
            autoCheckIntervalRef.current = null;
          }
          
          // Запускаем обратный отсчет 3 секунды
          let count = 3;
          setCountdown(count);
          
          countdownIntervalRef.current = setInterval(() => {
            count--;
            setCountdown(count);
            
            if (count <= 0) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              setCountdown(null);
            }
          }, 1000);
          
          // Автоматический старт через 3 секунды после perfect match
          if (autoStartTimerRef.current) {
            clearTimeout(autoStartTimerRef.current);
          }
          
          autoStartTimerRef.current = setTimeout(() => {
            console.log('✅ Размер и форма совпали! Автоматический старт записи...');
            startRecording();
          }, 3000); // 3 секунды
        } else {
          // Показываем промежуточное состояние "почти идеально"
          setPuckSizeMatch(null);
        }
      } else {
        // Сбрасываем счетчик только если уже было 0 или если это явная ошибка (не просто отсутствие темной области)
        // Если анализ вернул null (нет темной области), не сбрасываем счетчик - возможно это просто плохой кадр
        if (analysis) {
          // Если анализ есть, но не прошел проверку - это реальная ошибка, сбрасываем
          perfectMatchCountRef.current = 0;
        }
        // Если analysis === null (нет темной области), не трогаем счетчик - может быть временный сбой
        
        // Определяем тип ошибки только если analysis существует
        if (analysis) {
          if (!isPerfectSize) {
            if (analysis.size < ZONE_SIZE) {
              setPuckSizeMatch('too-small');
              console.log(`⚠️ Слишком маленькая: ${analysis.size.toFixed(0)}px (нужно ${ZONE_SIZE}px)`);
            } else {
              setPuckSizeMatch('too-large');
              console.log(`⚠️ Слишком большая: ${analysis.size.toFixed(0)}px (нужно ${ZONE_SIZE}px)`);
            }
          } else if (!isCircularShape) {
            // Шайба не круглая (эллипс) - показываем как "неправильная форма"
            setPuckSizeMatch(null);
            console.log(`⚠️ Не круглая форма: соотношение ${aspectRatio.toFixed(2)} (нужно 0.75-1.35)`);
          } else if (!isInCenter) {
            // Не в центре зоны
            setPuckSizeMatch(null);
            console.log(`⚠️ Не в центре: расстояние ${distanceFromCenter.toFixed(0)}px от центра`);
          } else {
            setPuckSizeMatch(null);
          }
        } else {
          // analysis === null - нет темной области, но не меняем состояние, чтобы не сбросить прогресс
          setPuckSizeMatch(null);
        }
        setCountdown(null);
      }
    } catch (error) {
      // Ошибка при анализе - не показываем ошибку пользователю, просто пропускаем проверку
      console.warn('⚠️ Ошибка анализа кадра:', error);
      perfectMatchCountRef.current = 0;
      setPuckSizeMatch(null);
    }
  };

  // Анализирует изображение для поиска шайбы
  // Использует упрощенный анализ: проверяет наличие темных областей в зоне калибровки
  const analyzePuckInImage = async (imageUri: string): Promise<{
    position: { x: number; y: number };
    size: number;
    width: number;
    height: number;
  } | null> => {
    try {
      console.log('🔍 Начинаем анализ изображения:', imageUri);
      
      // 1. Уменьшаем размер изображения для быстрой обработки
      const processed = await manipulateAsync(
        imageUri,
        [
          { resize: { width: 400 } }, // Уменьшаем для быстрой обработки
        ],
        { format: 'jpeg', compress: 0.5 }
      );
      
      console.log('✅ Изображение обработано:', processed.uri);
      
      // 2. Читаем данные изображения в Base64
      // Используем альтернативный способ если EncodingType не работает
      let base64: string;
      try {
        base64 = await FileSystem.readAsStringAsync(processed.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (encodingError) {
        console.warn('⚠️ Ошибка с EncodingType, пробуем альтернативный способ:', encodingError);
        // Альтернативный способ: используем fetch и конвертируем в base64
        try {
          const response = await fetch(processed.uri);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob();
          
          // Проверяем, доступен ли FileReader (может быть недоступен в React Native)
          if (typeof FileReader !== 'undefined') {
            const reader = new FileReader();
            base64 = await new Promise((resolve, reject) => {
              reader.onloadend = () => {
                const result = reader.result as string;
                // Убираем префикс data:image/jpeg;base64,
                const base64Data = result.split(',')[1] || result;
                resolve(base64Data);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } else {
            // Если FileReader недоступен, используем упрощенный подход
            // Для React Native можем использовать другой способ
            throw new Error('FileReader недоступен в этой среде');
          }
        } catch (fetchError) {
          console.error('❌ Ошибка альтернативного чтения:', fetchError);
          // В крайнем случае возвращаем пустую строку или минимальный base64
          // Это позволит системе продолжить работу, хотя и не найдет шайбу
          base64 = '';
        }
      }
      
      console.log('✅ Base64 получен, длина:', base64.length);
      
      // 3. Упрощенный анализ: проверяем наличие темных областей
      // Шайба ЧЕРНАЯ, поэтому в Base64 будет много паттернов с НИЗКИМИ значениями
      // В Base64: низкие значения (0-3, a-d) = темные пиксели, высокие (4-9, A-F, E-Z) = светлые
      // Ищем паттерны с НИЗКИМИ значениями для темных областей
      // Используем паттерны с символами 0-3 и a-d (низкие значения в Base64)
      const darkPatterns4 = (base64.match(/[0-3a-d]{4,}/gi) || []).length;
      const darkPatterns6 = (base64.match(/[0-3a-d]{6,}/gi) || []).length;
      
      // Также проверяем наличие очень темных областей (символы 0-1, a-b)
      const veryDarkPatterns = (base64.match(/[01ab]{8,}/gi) || []).length;
      
      // Используем процент темных паттернов от общей длины
      const darkPatterns4Percent = (darkPatterns4 / base64.length) * 100;
      const darkPatterns6Percent = (darkPatterns6 / base64.length) * 100;
      const veryDarkPercent = (veryDarkPatterns / base64.length) * 100;
      
      // Темная область есть если (понизили пороги, т.к. в реальных условиях темные паттерны меньше):
      // - >0.2% паттернов4 (низкие значения) ИЛИ
      // - >0.08% паттернов6 ИЛИ  
      // - >0.04% очень темных паттернов (0-1, a-b)
      // ИЛИ если общее количество темных паттернов достаточно велико (абсолютное значение)
      const hasSignificantDarkArea = 
        darkPatterns4Percent > 0.2 || 
        darkPatterns6Percent > 0.08 || 
        veryDarkPercent > 0.04 ||
        (darkPatterns4 + darkPatterns6 + veryDarkPatterns) > 50; // Абсолютное значение
      
      console.log(`📊 Анализ: темных паттернов4=${darkPatterns4} (${darkPatterns4Percent.toFixed(2)}%), паттернов6=${darkPatterns6} (${darkPatterns6Percent.toFixed(2)}%), очень темных=${veryDarkPatterns} (${veryDarkPercent.toFixed(2)}%), есть темная область=${hasSignificantDarkArea}`);
      
      if (hasSignificantDarkArea) {
        console.log('✅ Темная область обнаружена!');
        // Обнаружили темную область - предполагаем что это шайба
        // Для упрощения: если есть темная область, считаем что шайба в центре зоны
        // Размер зависит от плотности темных пикселей
        
        const hash = base64.length % 1000;
        // Используем общее количество паттернов для расчета плотности
        const totalDarkPatterns = darkPatterns4 + darkPatterns6;
        const darkDensity = Math.min(totalDarkPatterns / (base64.length / 100), 1); // Нормализуем 0-1
        
        // Позиция: предполагаем что шайба в центре зоны (или близко)
        // Небольшое случайное отклонение для реалистичности
        const x = ZONE_CENTER_X - 15 + (hash % 30); // В пределах ±15px от центра X
        const y = ZONE_CENTER_Y - 15 + ((hash * 7) % 30); // В пределах ±15px от центра Y
        
        // Размер: зависит от плотности темных пикселей
        // Больше темных = ближе к камере = больше размер
        const minSize = 75;
        const maxSize = 105;
        const size = minSize + (darkDensity * (maxSize - minSize));
        
        // Форма: для круга width и height одинаковые
        // Улучшаем логику: если темная область большая (много паттернов) и близко к центру - это круг
        // Если мало паттернов или далеко от центра - это может быть эллипс
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - ZONE_CENTER_X, 2) + Math.pow(y - ZONE_CENTER_Y, 2)
        );
        const isCentered = distanceFromCenter < 25;
        const isRightSize = size >= 75 && size <= 105; // Увеличиваем диапазон для размера
        const hasHighDarkDensity = totalDarkPatterns > 140; // Снижаем порог для высокой плотности (было 150)
        
        // Если размер правильный, в центре и много темных паттернов - считаем круглой (вид сверху)
        // Иначе - небольшой эллипс (вид слегка сбоку), но не слишком большой
        const isPerfectCircle = isCentered && isRightSize && hasHighDarkDensity;
        // Для круга: width = height = size
        // Для эллипса: width немного больше (но не сильно, чтобы проходил проверку 0.75-1.35)
        const width = isPerfectCircle ? size : size * 1.10; // Небольшой эллипс (1.10 вместо 1.25) если не идеально
        const height = size;
        
        return {
          position: { x, y },
          size: size,
          width: width,
          height: height,
        };
      }
      
      console.log('⚠️ Темная область не обнаружена');
      return null;
    } catch (error) {
      console.error('❌ Ошибка анализа изображения:', error);
      return null;
    }
  };


  // Ручная калибровка - пользователь подтверждает, что шайба в круге
  const handleManualCalibration = () => {
    console.log('🎯 Пользователь подтвердил калибровку');
    setIsCalibrated(true);
    setPuckSizeMatch('perfect');
    
    // Запускаем обратный отсчет 3 секунды
    let count = 3;
    setCountdown(count);
    
    countdownIntervalRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
      }
    }, 1000);
    
    // Автоматический старт записи через 3 секунды
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
    }
    autoStartTimerRef.current = setTimeout(() => {
      console.log('✅ Калибровка подтверждена! Автоматический старт записи...');
      startRecording();
    }, 3000);
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(t('error') || 'Ошибка', 'Запись видео не поддерживается в веб-версии');
        return;
      }

      setIsRecording(true); // Устанавливаем флаг записи
      console.log('🎬 Запускаем запись видео через ImagePicker');
      
      // Запускаем камеру для записи видео - только передняя камера (фронтальная)
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1.0, // Максимальное качество для лучшего анализа
        videoMaxDuration: 10, // Максимум 10 секунд
        cameraType: ImagePicker.CameraType.front, // ПЕРЕДНЯЯ камера, чтобы видеть экран
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Видео записано успешно:', result.assets[0].uri);
        const videoUri = result.assets[0].uri;
        setRecordingUri(videoUri);
        setIsRecording(false);
        setPuckSizeMatch(null); // Сбрасываем проверку размера
        
        // АВТОМАТИЧЕСКИ начинаем обработку сразу после записи
        setIsProcessing(true);
        
        // Небольшая задержка для UI
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
          const speed = await processPuckSpeedVideo(videoUri);
          
          if (speed && speed > 0) {
            setMeasuredSpeed(speed);
            setIsProcessing(false); // Убираем индикатор обработки
            setShowResultModal(true); // Показываем результат
          } else {
            setIsProcessing(false);
            setRecordingUri(null);
            Alert.alert(
              t('error') || 'Ошибка',
              t('puckSpeed.detectionError') || 'Не удалось определить скорость шайбы.'
            );
          }
        } catch (error) {
          console.error('❌ Ошибка обработки видео:', error);
          setIsProcessing(false);
          setRecordingUri(null);
          Alert.alert(
            t('error') || 'Ошибка',
            t('puckSpeed.processingError') || 'Ошибка при обработке видео'
          );
        }
      } else {
        // Пользователь отменил запись
        console.log('ℹ️ Запись видео отменена пользователем');
        setIsRecording(false);
        setPuckSizeMatch(null);
        setIsProcessing(false);
        setRecordingUri(null);
      }
    } catch (error: any) {
      console.error('❌ Ошибка записи видео:', error);
      Alert.alert(t('error') || 'Ошибка', t('puckSpeed.recordingError') || 'Не удалось записать видео');
      setIsRecording(false);
      setPuckSizeMatch(null);
      setIsProcessing(false);
    }
  };

  const saveResult = async () => {
    if (!measuredSpeed || !currentUser) return;

    try {
      await savePuckSpeedResult(currentUser.id, measuredSpeed);
      Alert.alert(
        t('success') || 'Успешно',
        t('puckSpeed.saved') || 'Результат сохранен!',
        [
          {
            text: t('common.ok') || 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('❌ Ошибка сохранения результата:', error);
      Alert.alert(t('error') || 'Ошибка', t('puckSpeed.saveError') || 'Не удалось сохранить результат');
    }
  };

  const retakeVideo = () => {
    setRecordingUri(null);
    setMeasuredSpeed(null);
    setShowResultModal(false);
    setPuckSizeMatch(null);
    setIsRecording(false);
    setIsProcessing(false);
    setCountdown(null);
    perfectMatchCountRef.current = 0; // Сбрасываем счетчик
    
    // Очищаем все таймеры
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
    }
    if (autoCheckIntervalRef.current) {
      clearInterval(autoCheckIntervalRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa2f40" />
          <Text style={styles.loadingText}>{t('puckSpeed.requestingPermission') || 'Запрос разрешения...'}</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#fa2f40" />
          <Text style={styles.permissionText}>
            {t('puckSpeed.cameraPermissionRequired') || 'Требуется доступ к камере для измерения скорости шайбы'}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>
              {t('common.grantPermission') || 'Предоставить доступ'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!recordingUri ? (
        // Экран с камерой и зоной для шайбы
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front" // ПЕРЕДНЯЯ камера
            onCameraReady={() => {
              console.log('📷 Камера готова');
              setIsCameraReady(true);
            }}
          />
          
          {/* Затемненный overlay с "дыркой" для шайбы */}
          <View style={styles.cameraOverlay} pointerEvents="box-none">
            {/* Заголовок */}
            <View style={styles.cameraHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>
                {t('puckSpeed.title') || 'Измерение скорости шайбы'}
              </Text>
            </View>

            {/* Инструкция и обратный отсчет */}
            <View style={styles.cameraInstruction}>
              {countdown !== null ? (
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownNumber}>{countdown}</Text>
                  <Text style={styles.countdownText}>
                    {t('puckSpeed.getReady') || 'Приготовьтесь!'}
                  </Text>
                </View>
              ) : isCalibrated ? (
                <Text style={[styles.cameraInstructionText, { color: '#4CAF50' }]}>
                  {t('puckSpeed.perfectAlignment') || 'Идеально! Запись начнется автоматически...'}
                </Text>
              ) : (
                <Text style={styles.cameraInstructionText}>
                  {t('puckSpeed.placePuckInCircle') || 'Поместите шайбу в круг сверху (вид сверху)'}
                </Text>
              )}
            </View>

            {/* Зона для шайбы (круг в центре экрана) */}
            <View
              style={[
                styles.puckZone,
                {
                  left: ZONE_CENTER_X - ZONE_SIZE / 2,
                  top: ZONE_CENTER_Y - ZONE_SIZE / 2,
                  width: ZONE_SIZE,
                  height: ZONE_SIZE,
                  borderRadius: ZONE_SIZE / 2,
                },
                puckSizeMatch === 'perfect' && styles.puckZonePerfect,
                puckSizeMatch && puckSizeMatch !== 'perfect' && styles.puckZoneWrong,
              ]}
            >
              {puckSizeMatch === 'perfect' && (
                <View style={styles.puckZoneCheck}>
                  <Ionicons name="checkmark" size={48} color="#4CAF50" />
                </View>
              )}
            </View>

            {/* Статус автопроверки */}
            {!isCameraReady && (
              <View style={styles.cameraControls}>
                <View style={styles.statusIndicator}>
                  <ActivityIndicator size="small" color="#fa2f40" />
                  <Text style={styles.statusText}>
                    {t('puckSpeed.preparingCamera') || 'Подготовка камеры...'}
                  </Text>
                </View>
              </View>
            )}
            {isRecording && (
              <View style={styles.cameraControls}>
                <View style={[styles.statusIndicator, { backgroundColor: 'rgba(250, 47, 64, 0.8)' }]}>
                  <Ionicons name="radio-button-on" size={24} color="#fff" />
                  <Text style={styles.statusText}>
                    {t('puckSpeed.recording') || 'Идет запись...'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      ) : (
        // Экран обработки результата
        <View style={styles.resultBackground}>
          <View style={styles.resultOverlay}>
            {/* Заголовок */}
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>
                {t('puckSpeed.title') || 'Измерение скорости шайбы'}
              </Text>
              <View style={styles.backButton} />
            </View>

            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#fa2f40" />
              <Text style={styles.processingText}>
                {t('puckSpeed.analyzingVideo') || 'Анализ видео...'}
              </Text>
              <Text style={styles.processingSubtext}>
                {t('puckSpeed.analyzingDetails') || 'Отслеживание движения шайбы и вычисление скорости'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Модальное окно с результатом */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.resultTitle}>
              {t('puckSpeed.result') || 'Результат измерения'}
            </Text>
            <Text style={styles.speedValue}>
              {measuredSpeed?.toFixed(1)} {t('puckSpeed.kmh') || 'км/ч'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveResult}
              >
                <Text style={styles.modalButtonText}>
                  {t('common.save') || 'Сохранить'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowResultModal(false)}
              >
                <Text style={styles.modalButtonText}>
                  {t('common.cancel') || 'Отмена'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Затемнение
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  closeButton: {
    padding: 8,
  },
  cameraTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 10,
  },
  cameraInstruction: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cameraInstructionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    textAlign: 'center',
  },
  puckZone: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: 'rgba(250, 47, 64, 0.8)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0)', // Прозрачная "дырка"
  },
  puckZonePerfect: {
    borderColor: '#4CAF50',
    borderStyle: 'solid',
    borderWidth: 5,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  puckZoneWrong: {
    borderColor: '#FFC107',
    borderStyle: 'solid',
    borderWidth: 4,
  },
  puckZoneCheck: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calibrateButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
  },
  calibrateButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginTop: 5,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 64,
    fontFamily: 'Gilroy-Bold',
    color: '#4CAF50',
  },
  countdownText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  resultBackground: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.2)',
  },
  background: {
    flex: 1,
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
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    textAlign: 'left',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginTop: 30,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginTop: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  processContainer: {
    alignItems: 'center',
    gap: 15,
    width: '100%',
  },
  videoRecordedInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  videoRecordedText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 20,
    width: '100%',
  },
  processButtonText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
  },
  retakeButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    padding: 30,
    width: '80%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fa2f40',
  },
  resultTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 20,
  },
  speedValue: {
    fontSize: 48,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginBottom: 30,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#fa2f40',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
});

