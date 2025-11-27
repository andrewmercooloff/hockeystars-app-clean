/**
 * ИЗМЕРЕНИЕ СКОРОСТИ ШАЙБЫ ПО ЗВУКУ
 * 
 * Гибридное решение:
 * - ВЕБ-ВЕРСИЯ: Автоматическая детекция через Web Audio API (AnalyserNode)
 * - МОБИЛЬНАЯ: Ручная отметка звуков (работает в Expo Go)
 * 
 * Расстояние: 5 метров (фиксированное)
 * Скорость = 5 м / время между ударами
 * 
 * Для веб-версии: запустите `npm run web` или `expo start --web`
 * Для мобильного: работает в Expo Go с ручной отметкой
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
// Динамический импорт для react-native-audio-recorder-player (только для нативных платформ)
// Не импортируем на web, чтобы избежать ошибок
import CachedBackground from '../components/CachedBackground';
import CustomAlert from '../components/CustomAlert';
import { savePuckSpeedResult, getPlayerById } from '../utils/playerStorage';
import { useUser } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SoundEvent {
  timestamp: number; // время в миллисекундах
  amplitude: number; // амплитуда звука (0-1)
}

interface SpeedResult {
  speedMs: number;      // м/с (для расчетов)
  speedKmh: number;    // км/ч
  speedMph: number;    // мили/час
  timeMs: number;       // время в миллисекундах
  distance: number;     // метры (фиксированное расстояние 5м)
  timestamp: number;    // время создания результата (мс)
}

// Типы для Web Audio API (только для веб)
declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

export default function PuckSpeedSoundScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const { currentUser, refreshUser } = useUser();
  const { t } = useLanguage();
  
  // Инициализируем статус с переводом
  const initialStatus = t('puckSpeed.ready') || 'Готов к измерению';
  
  // Web Audio API refs (только для веб)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // iOS Audio Recorder Player refs (только для iOS)
  const audioRecorderPlayerRef = useRef<any | null>(null);
  const recordBackListenerRef = useRef<any>(null);
  const expoAVRecordingRef = useRef<Audio.Recording | null>(null); // Fallback на expo-av
  const useExpoAVRef = useRef<boolean>(false); // Флаг использования expo-av вместо AudioRecorderPlayer
  const expoAVMeteringIntervalRef = useRef<NodeJS.Timeout | null>(null); // Интервал для опроса метеринга expo-av
  const callbackCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout для проверки callback AudioRecorderPlayer
  
  const isAnalyzingRef = useRef(false);
  const soundEventsRef = useRef<SoundEvent[]>([]); // Ref для синхронного доступа
  const recordingStartTimeRef = useRef<number | null>(null); // Время начала записи
  const previousAmplitudeRef = useRef<number>(0); // Предыдущая амплитуда для детекции пиков
  const isMeasuringRef = useRef<boolean>(false); // Ref для синхронной проверки isMeasuring
  const soundTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Таймаут ожидания второго звука
  
  // НОВАЯ ЛОГИКА: Отслеживание полных циклов звука (подъем -> падение)
  type SoundState = 'idle' | 'firstSoundRising' | 'firstSoundFalling' | 'firstSoundComplete' | 'secondSoundRising' | 'secondSoundFalling' | 'secondSoundComplete';
  const soundStateRef = useRef<SoundState>('idle');
  const firstSoundStartTimeRef = useRef<number>(0); // Время начала первого звука
  const firstSoundPeakAmplitudeRef = useRef<number>(0); // Пиковая амплитуда первого звука
  const firstSoundFallingStartTimeRef = useRef<number>(0); // Время начала затухания первого звука
  const secondSoundStartTimeRef = useRef<number>(0); // Время начала второго звука
  const secondSoundPeakAmplitudeRef = useRef<number>(0); // Пиковая амплитуда второго звука
  const secondSoundFallingStartTimeRef = useRef<number>(0); // Время начала затухания второго звука
  const lastAmplitudeRef = useRef<number>(0); // Последняя амплитуда для определения направления
  
  // State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [soundEvents, setSoundEvents] = useState<SoundEvent[]>([]);
  const [speedResults, setSpeedResults] = useState<SpeedResult[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>(initialStatus);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentAmplitude, setCurrentAmplitude] = useState(0);
  const [distanceCm, setDistanceCm] = useState<string>('500'); // Расстояние в см (по умолчанию 5м = 500см)
  const [showInstructions, setShowInstructions] = useState(false); // Показывать ли инструкцию
  const [sensitivity, setSensitivity] = useState(50); // Чувствительность (0-100, по умолчанию 50)
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    onConfirm: () => {},
  });
  const prevSpeedResultsLengthRef = useRef(0); // Для отслеживания появления новых результатов
  const blinkAnim = useRef(new Animated.Value(1)).current; // Анимация мигания для радара
  const sliderWidthRef = useRef<number>(300); // Ширина слайдера для вычислений
  const distanceSliderWidthRef = useRef<number>(280); // Ширина ползунка расстояния
  const distanceSliderContainerRef = useRef<View>(null); // Ref для контейнера ползунка
  const distanceInputRef = useRef<TextInput>(null); // Ref для поля ввода расстояния
  const scrollViewRef = useRef<ScrollView>(null); // Ref для ScrollView
  const distanceInputContainerRef = useRef<View>(null); // Ref для контейнера поля ввода
  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX } = e.nativeEvent;
        const width = sliderWidthRef.current || 300;
        if (locationX !== undefined && !isNaN(locationX) && width > 0) {
          const rawValue = (locationX / width) * 100;
          // Округляем до 10 шагов (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
          const newValue = Math.round(Math.max(0, Math.min(100, rawValue)) / 10) * 10;
          setSensitivity(newValue);
        }
      },
      onPanResponderMove: (e) => {
        const { locationX } = e.nativeEvent;
        const width = sliderWidthRef.current || 300;
        if (locationX !== undefined && !isNaN(locationX) && width > 0) {
          const rawValue = (locationX / width) * 100;
          // Округляем до 10 шагов (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
          const newValue = Math.round(Math.max(0, Math.min(100, rawValue)) / 10) * 10;
          setSensitivity(newValue);
        }
      },
    })
  ).current;

  // PanResponder для ползунка расстояния (аналогично ползунку чувствительности)
  const distanceSliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isMeasuring,
      onMoveShouldSetPanResponder: () => !isMeasuring,
      onPanResponderGrant: (e) => {
        if (isMeasuring) return;
        const { locationX } = e.nativeEvent;
        const width = distanceSliderWidthRef.current || 280;
        if (locationX !== undefined && !isNaN(locationX) && width > 0) {
          const ratio = Math.max(0, Math.min(1, locationX / width));
          // Округляем до шага 5 (300, 305, 310, ... 600)
          const rawValue = 300 + ratio * (600 - 300);
          const newValue = Math.max(300, Math.min(600, Math.round(rawValue / 5) * 5));
          setDistanceCm(newValue.toString());
        }
      },
      onPanResponderMove: (e) => {
        if (isMeasuring) return;
        const { locationX } = e.nativeEvent;
        const width = distanceSliderWidthRef.current || 280;
        if (locationX !== undefined && !isNaN(locationX) && width > 0) {
          const ratio = Math.max(0, Math.min(1, locationX / width));
          // Округляем до шага 5 (300, 305, 310, ... 600)
          const rawValue = 300 + ratio * (600 - 300);
          const newValue = Math.max(300, Math.min(600, Math.round(rawValue / 5) * 5));
          setDistanceCm(newValue.toString());
        }
      },
    })
  ).current;
  
  // Параметры
  const MIN_TIME_BETWEEN_SOUNDS_MS = 100; // Минимальное время между звуками (100мс)
  // Расстояние конвертируем из см в метры
  const distanceMeters = parseFloat(distanceCm) / 100 || 5; // По умолчанию 5м если не указано
  const DEBOUNCE_MS = 200; // Debounce для предотвращения ложных срабатываний (увеличено до 200мс)
  
  // Ref для отслеживания времени последней детекции звука
  const lastSoundDetectionTimeRef = useRef<number>(0);
  // Ref для отслеживания времени последнего расчета скорости (чтобы не детектировать сразу после расчета)
  const lastSpeedCalculationTimeRef = useRef<number>(0);
  const COOLDOWN_AFTER_SPEED_MS = 500; // Период покоя после расчета скорости (500мс)
  
  // Вычисляем пороги на основе чувствительности (0 = менее чувствительный, 100 = более чувствительный)
  // VOLUME_THRESHOLD: от 180 (нечувствительный) до 120 (очень чувствительный) - ПОВЫШЕНЫ для снижения чувствительности
  // Чем больше чувствительность, тем меньше порог громкости
  const VOLUME_THRESHOLD = React.useMemo(() => {
    return 180 - (sensitivity * 0.6); // 180 до 120 (было 150 до 80) - повышено для снижения чувствительности
  }, [sensitivity]);
  
  // PEAK_DETECTION_THRESHOLD: от 100 (нечувствительный) до 50 (очень чувствительный) - ПОВЫШЕНЫ для снижения чувствительности
  const PEAK_DETECTION_THRESHOLD = React.useMemo(() => {
    return 100 - (sensitivity * 0.5); // 100 до 50 (было 80 до 30) - повышено для снижения чувствительности
  }, [sensitivity]);
  
  // Ref для актуальных порогов (чтобы callback всегда использовал актуальные значения)
  const volumeThresholdRef = useRef<number>(VOLUME_THRESHOLD);
  const peakDetectionThresholdRef = useRef<number>(PEAK_DETECTION_THRESHOLD);
  
  // Обновляем ref при изменении порогов
  useEffect(() => {
    volumeThresholdRef.current = VOLUME_THRESHOLD;
    peakDetectionThresholdRef.current = PEAK_DETECTION_THRESHOLD;
  }, [VOLUME_THRESHOLD, PEAK_DETECTION_THRESHOLD]);

  // Запрос разрешения на микрофон
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('Ошибка запроса разрешения:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  // Автоматическая прокрутка при появлении клавиатуры
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Прокручиваем к полю ввода при появлении клавиатуры
        if (distanceInputRef.current && scrollViewRef.current) {
          const keyboardHeight = e.endCoordinates?.height || 0;
          setTimeout(() => {
            // Используем measureLayout для получения позиции относительно ScrollView
            distanceInputRef.current?.measureLayout(
              scrollViewRef.current as any,
              (x, y, width, height) => {
                // y уже относительно ScrollView, получаем размеры экрана
                const screenHeight = Dimensions.get('window').height;
                const visibleArea = screenHeight - keyboardHeight;
                // Вычисляем позицию низа поля относительно ScrollView
                const inputBottom = y + height;
                // Вычисляем, насколько нужно прокрутить, чтобы поле было видно
                // visibleArea - это видимая область над клавиатурой
                // Нужно прокрутить так, чтобы низ поля был на visibleArea - 150px от верха
                const targetY = inputBottom - visibleArea + 120; // 120px отступ сверху
                
                if (targetY > 0) {
                  scrollViewRef.current?.scrollTo({ 
                    y: targetY, 
                    animated: true 
                  });
                }
              },
              () => {
                // Fallback: используем measure если measureLayout не работает
                distanceInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                  const screenHeight = Dimensions.get('window').height;
                  const visibleArea = screenHeight - keyboardHeight;
                  const inputBottom = pageY + height;
                  const scrollOffset = inputBottom - visibleArea + 120; // 120px отступ сверху
                  
                  if (scrollOffset > 0) {
                    scrollViewRef.current?.scrollTo({ 
                      y: scrollOffset, 
                      animated: true 
                    });
                  }
                });
              }
            );
          }, Platform.OS === 'ios' ? 100 : 300);
        }
      }
    );

    return () => {
      keyboardWillShowListener.remove();
    };
  }, []);

  // Инициализация Web Audio API для веб-версии
  useEffect(() => {
    if (!isWeb || !hasPermission) return;

    const initializeWebAudio = async () => {
      try {
        // Проверяем поддержку Web Audio API
        if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) {
          console.warn('⚠️ Web Audio API не поддерживается');
          return;
        }

        // Создаём AudioContext
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass({ sampleRate: 44100 });
        audioContextRef.current = audioContext;
        const initMsg = '🔧 [Web] Создан AudioContext';
        console.log(initMsg);
        // Debug logs removed

        // Получаем микрофонный поток
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1, // Моно
            sampleRate: 44100,
            echoCancellation: true,
          },
        });
        streamRef.current = stream;
        const streamMsg = '✅ [Web] Получен поток микрофона';
        console.log(streamMsg);
        // setDebugLogs(prev => [...prev.slice(-9), streamMsg]);

        // Создаём источник из потока
        const source = audioContext.createMediaStreamSource(stream);

        // Создаём анализатор
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        // Подключаем источник к анализатору
        source.connect(analyser);
        analyserRef.current = analyser;

        // Массив для данных частот
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        const successMsg = '✅ [Web] Web Audio API инициализирован';
        console.log(successMsg);
        // setDebugLogs(prev => [...prev.slice(-9), successMsg]);
      } catch (error) {
        console.error('❌ Ошибка инициализации Web Audio:', error);
        setAlert({
          visible: true,
          title: 'Ошибка',
          message: 'Не удалось инициализировать микрофон. Проверьте разрешения.',
          type: 'error',
          onConfirm: () => setAlert({ ...alert, visible: false }),
        });
      }
    };

    if (hasPermission) {
      initializeWebAudio();
    }

    // Очистка при размонтировании
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
        soundTimeoutRef.current = null;
      }
    };
  }, [isWeb, hasPermission]);

  // Инициализация AudioRecorderPlayer для iOS
  useEffect(() => {
    if ((!isIOS && !isAndroid) || !hasPermission || isWeb) return;

    const initializeIOSAudio = async () => {
      try {
        const logMsg = '🔧 [iOS] Инициализируем AudioRecorderPlayer...';
        console.log(logMsg);
        
        // Динамический импорт только для нативных платформ (не web)
        const AudioRecorderPlayerModule = await import('react-native-audio-recorder-player');
        
        // Проверяем, как экспортируется модуль в production
        const AudioRecorderPlayer = AudioRecorderPlayerModule.default || AudioRecorderPlayerModule;
        console.log('📦 [iOS] Тип AudioRecorderPlayerModule:', typeof AudioRecorderPlayerModule);
        console.log('📦 [iOS] AudioRecorderPlayerModule:', AudioRecorderPlayerModule);
        console.log('📦 [iOS] AudioRecorderPlayerModule.default:', AudioRecorderPlayerModule.default);
        console.log('📦 [iOS] Ключи AudioRecorderPlayerModule:', Object.keys(AudioRecorderPlayerModule || {}));
        
        let audioRecorderPlayer: any = null;
        
        // Пробуем разные способы создания экземпляра
        if (typeof AudioRecorderPlayer === 'function') {
          // Если это функция/класс, создаем через new
          console.log('✅ [iOS] AudioRecorderPlayerModule - это функция, создаем через new');
          audioRecorderPlayer = new AudioRecorderPlayer();
        } else if (AudioRecorderPlayer && typeof AudioRecorderPlayer === 'object') {
          // Если это объект, проверяем default
          if (AudioRecorderPlayer.default && typeof AudioRecorderPlayer.default === 'function') {
            console.log('✅ [iOS] Используем AudioRecorderPlayerModule.default как функцию');
            audioRecorderPlayer = new AudioRecorderPlayer.default();
          } else if (AudioRecorderPlayer.default && typeof AudioRecorderPlayer.default === 'object') {
            // Возможно, default уже является экземпляром
            console.log('✅ [iOS] AudioRecorderPlayerModule.default - это объект, используем напрямую');
            audioRecorderPlayer = AudioRecorderPlayer.default;
          } else {
            // Возможно, сам модуль уже является экземпляром
            console.log('✅ [iOS] AudioRecorderPlayerModule - это объект, используем напрямую');
            audioRecorderPlayer = AudioRecorderPlayer;
          }
        } else {
          throw new Error(`Неожиданный тип AudioRecorderPlayerModule: ${typeof AudioRecorderPlayer}`);
        }
        
        // Проверяем, что у объекта есть нужные методы
        if (!audioRecorderPlayer) {
          throw new Error('Не удалось создать экземпляр AudioRecorderPlayer');
        }
        
        console.log('📋 [iOS] Методы audioRecorderPlayer:', Object.keys(audioRecorderPlayer));
        console.log('📋 [iOS] startRecorder:', typeof audioRecorderPlayer.startRecorder);
        console.log('📋 [iOS] addRecordBackListener:', typeof audioRecorderPlayer.addRecordBackListener);
        
        audioRecorderPlayerRef.current = audioRecorderPlayer;
        const successMsg = '✅ [iOS] AudioRecorderPlayer инициализирован успешно';
        console.log(successMsg);
      } catch (error) {
        const errorMsg = `❌ [iOS] Ошибка инициализации: ${error instanceof Error ? error.message : String(error)}`;
        console.error('❌ [iOS] Ошибка инициализации AudioRecorderPlayer:', error);
        if (error instanceof Error && error.stack) {
          const stackTrace = error.stack.substring(0, 200);
          console.error('Stack:', stackTrace);
        }
      }
    };

    if (hasPermission) {
      initializeIOSAudio();
    }

    // Очистка при размонтировании
    return () => {
      if (audioRecorderPlayerRef.current && recordBackListenerRef.current) {
        try {
          if (typeof audioRecorderPlayerRef.current.removeRecordBackListener === 'function') {
            audioRecorderPlayerRef.current.removeRecordBackListener();
          }
        } catch (e) {
          // Игнорируем ошибки при очистке
        }
        recordBackListenerRef.current = null;
      }
      if (audioRecorderPlayerRef.current) {
        try {
          if (typeof audioRecorderPlayerRef.current.stopRecorder === 'function') {
            audioRecorderPlayerRef.current.stopRecorder().catch(() => {});
          }
        } catch (e) {
          // Игнорируем ошибки при очистке
        }
        audioRecorderPlayerRef.current = null;
      }
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
        soundTimeoutRef.current = null;
      }
    };
  }, [isIOS, isAndroid, hasPermission, isWeb]);

  // Обновляем ref при изменении soundEvents
  useEffect(() => {
    soundEventsRef.current = soundEvents;
  }, [soundEvents]);

  // Обновляем ref при изменении isMeasuring
  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
  }, [isMeasuring]);

  // НОВАЯ ФУНКЦИЯ: Обработка амплитуды с отслеживанием полных циклов звука (подъем -> падение)
  const processAmplitudeWithCycleDetection = useCallback((averageAmplitude: number, nowMs: number) => {
    const currentState = soundStateRef.current;
    const amplitudeJump = averageAmplitude - previousAmplitudeRef.current;
    const currentVolumeThreshold = volumeThresholdRef.current;
    const currentPeakThreshold = peakDetectionThresholdRef.current;
    
    // Определяем направление изменения амплитуды
    const isRising = averageAmplitude > lastAmplitudeRef.current;
    const isFalling = averageAmplitude < lastAmplitudeRef.current;
    lastAmplitudeRef.current = averageAmplitude;
    
    // Обновляем previousAmplitudeRef для следующего расчета
    if (averageAmplitude < previousAmplitudeRef.current) {
      previousAmplitudeRef.current = averageAmplitude * 0.9 + previousAmplitudeRef.current * 0.1;
    } else {
      previousAmplitudeRef.current = averageAmplitude;
    }
    
    switch (currentState) {
      case 'idle':
        // Ждем начала первого звука: резкий подъем амплитуды выше порога
        if (isRising && 
            amplitudeJump > currentPeakThreshold * 1.1 && 
            averageAmplitude > currentVolumeThreshold &&
            amplitudeJump > 70) {
          soundStateRef.current = 'firstSoundRising';
          firstSoundStartTimeRef.current = nowMs;
          firstSoundPeakAmplitudeRef.current = averageAmplitude;
          console.log(`🔊 [Cycle] Первый звук начался: амплитуда=${averageAmplitude.toFixed(1)}, скачок=${amplitudeJump.toFixed(1)}, время=${nowMs}`);
          handleSoundDetected(nowMs, averageAmplitude / 255);
        }
        break;
        
      case 'firstSoundRising':
        // Первый звук растет - отслеживаем пик
        if (averageAmplitude > firstSoundPeakAmplitudeRef.current) {
          firstSoundPeakAmplitudeRef.current = averageAmplitude;
        }
        
        // КРИТИЧНО: Для быстрых скоростей второй звук может начаться ДО затухания первого
        // Проверяем, прошло ли достаточно времени с начала первого звука (минимум 30мс)
        const timeSinceFirstStartRising = nowMs - firstSoundStartTimeRef.current;
        const canStartSecondSoundRising = timeSinceFirstStartRising > 20; // Минимум 20мс для очень быстрых скоростей (до ~900 км/ч)
        
        // Если прошло достаточно времени И амплитуда снова поднялась (второй звук), начинаем второй звук
        // Это позволяет фиксировать очень быстрые скорости, когда второй звук начинается сразу после пика первого
        // Для очень быстрых скоростей значительно снижаем пороги
        const isVeryFastSpeedRising = timeSinceFirstStartRising < 300; // Если время < 300мс, это очень быстрая скорость (> 60 км/ч)
        const isExtremelyFastSpeedRising = timeSinceFirstStartRising < 150; // Если время < 150мс, это экстремально быстрая скорость (> 120 км/ч)
        const isUltraFastSpeedRising = timeSinceFirstStartRising < 80; // Если время < 80мс, это ультра быстрая скорость (> 225 км/ч)
        const secondSoundPeakThresholdRising = isUltraFastSpeedRising 
          ? currentPeakThreshold * 0.1   // 10% для ультра быстрых скоростей
          : isExtremelyFastSpeedRising 
            ? currentPeakThreshold * 0.12  // 12% для экстремально быстрых скоростей
            : isVeryFastSpeedRising 
              ? currentPeakThreshold * 0.18  // 18% для очень быстрых скоростей
              : currentPeakThreshold * 0.3; // 30% для обычных скоростей
        const secondSoundJumpThresholdRising = isUltraFastSpeedRising 
          ? 8   // 8 для ультра быстрых скоростей
          : isExtremelyFastSpeedRising 
            ? 9   // 9 для экстремально быстрых скоростей
            : isVeryFastSpeedRising 
              ? 11  // 11 для очень быстрых скоростей
              : 15; // 15 для обычных скоростей
        const secondSoundVolumeThresholdRising = isUltraFastSpeedRising 
          ? currentVolumeThreshold * 0.45  // 45% для ультра быстрых скоростей
          : isExtremelyFastSpeedRising 
            ? currentVolumeThreshold * 0.48  // 48% для экстремально быстрых скоростей
            : isVeryFastSpeedRising 
              ? currentVolumeThreshold * 0.52  // 52% для очень быстрых скоростей
              : currentVolumeThreshold * 0.6; // 60% для обычных скоростей
        
        // Для очень быстрых скоростей проверяем резкий скачок амплитуды
        // Это позволяет зафиксировать второй звук даже если он начинается во время пика первого
        // Для очень быстрых скоростей (< 200мс) проверяем только скачок и громкость, без проверки на рост
        const isSecondSoundDetected = canStartSecondSoundRising && 
            amplitudeJump > secondSoundJumpThresholdRising && 
            averageAmplitude > secondSoundVolumeThresholdRising &&
            // Для очень быстрых скоростей проверяем, что это не продолжение первого звука
            // Но для экстремально быстрых скоростей (< 100мс) разрешаем даже если амплитуда близка к пику первого
            (isExtremelyFastSpeedRising || 
             (isVeryFastSpeedRising && (isRising || averageAmplitude < firstSoundPeakAmplitudeRef.current * 0.98)) ||
             (!isVeryFastSpeedRising && isRising && averageAmplitude < firstSoundPeakAmplitudeRef.current * 0.95 && amplitudeJump > secondSoundPeakThresholdRising));
        
        if (isSecondSoundDetected) {
          // Второй звук начался ДО затухания первого - это нормально для очень быстрых скоростей
          soundStateRef.current = 'secondSoundRising';
          secondSoundStartTimeRef.current = nowMs;
          secondSoundPeakAmplitudeRef.current = averageAmplitude;
          const timeBetweenSounds = secondSoundStartTimeRef.current - firstSoundStartTimeRef.current;
          console.log(`🔊 [Cycle] Второй звук начался (во время роста первого, очень быстрая скорость): амплитуда=${averageAmplitude.toFixed(1)}, скачок=${amplitudeJump.toFixed(1)}, время между звуками=${timeBetweenSounds}мс, ультра быстрая=${isUltraFastSpeedRising}, экстремально быстрая=${isExtremelyFastSpeedRising}, очень быстрая=${isVeryFastSpeedRising}`);
          handleSoundDetected(nowMs, averageAmplitude / 255);
        }
        // Переходим к затуханию, если амплитуда упала на 10% от пика (более чувствительно для быстрых звуков)
        // Для быстрых скоростей важно быстро переходить к затуханию, чтобы второй звук мог начаться раньше
        else if (isFalling && averageAmplitude < firstSoundPeakAmplitudeRef.current * 0.9) {
          // Амплитуда упала на 10% от пика - звук начал затухать
          soundStateRef.current = 'firstSoundFalling';
          firstSoundFallingStartTimeRef.current = nowMs; // Фиксируем время начала затухания
          console.log(`🔊 [Cycle] Первый звук начал затухать: пик=${firstSoundPeakAmplitudeRef.current.toFixed(1)}, текущая=${averageAmplitude.toFixed(1)}`);
        }
        break;
        
      case 'firstSoundFalling':
        // Первый звук затухает - но для быстрых скоростей второй звук может начаться ДО завершения первого
        // Проверяем, прошло ли достаточно времени с начала первого звука (минимум 50мс для очень быстрых скоростей)
        const timeSinceFirstStart = nowMs - firstSoundStartTimeRef.current;
        const canStartSecondSound = timeSinceFirstStart > 20; // Минимум 20мс для очень быстрых скоростей (до ~900 км/ч)
        
        // Если прошло достаточно времени И амплитуда снова поднялась (второй звук), начинаем второй звук
        // Для быстрых скоростей второй звук может начаться во время затухания первого
        // Для быстрых скоростей значительно снижаем пороги второго звука, так как он может быть тише
        const isVeryFastSpeed = timeSinceFirstStart < 300; // Если время < 300мс, это очень быстрая скорость (> 60 км/ч)
        const isExtremelyFastSpeed = timeSinceFirstStart < 150; // Если время < 150мс, это экстремально быстрая скорость (> 120 км/ч)
        const isUltraFastSpeed = timeSinceFirstStart < 80; // Если время < 80мс, это ультра быстрая скорость (> 225 км/ч)
        const secondSoundPeakThreshold = isUltraFastSpeed 
          ? currentPeakThreshold * 0.1   // 10% для ультра быстрых скоростей
          : isExtremelyFastSpeed 
            ? currentPeakThreshold * 0.12  // 12% для экстремально быстрых скоростей
            : isVeryFastSpeed 
              ? currentPeakThreshold * 0.18  // 18% для очень быстрых скоростей
              : currentPeakThreshold * 0.4; // 40% для обычных скоростей
        const secondSoundJumpThreshold = isUltraFastSpeed 
          ? 8   // 8 для ультра быстрых скоростей
          : isExtremelyFastSpeed 
            ? 9   // 9 для экстремально быстрых скоростей
            : isVeryFastSpeed 
              ? 11  // 11 для очень быстрых скоростей
              : 20; // 20 для обычных скоростей
        const secondSoundVolumeThreshold = isUltraFastSpeed 
          ? currentVolumeThreshold * 0.45  // 45% для ультра быстрых скоростей
          : isExtremelyFastSpeed 
            ? currentVolumeThreshold * 0.48  // 48% для экстремально быстрых скоростей
            : isVeryFastSpeed 
              ? currentVolumeThreshold * 0.52  // 52% для очень быстрых скоростей
              : currentVolumeThreshold * 0.7; // 70% для обычных скоростей
        
        if (canStartSecondSound && isRising && 
            amplitudeJump > secondSoundPeakThreshold && 
            averageAmplitude > secondSoundVolumeThreshold &&
            amplitudeJump > secondSoundJumpThreshold) {
          // Второй звук начался ДО завершения первого - это нормально для быстрых скоростей
          soundStateRef.current = 'secondSoundRising';
          secondSoundStartTimeRef.current = nowMs;
          secondSoundPeakAmplitudeRef.current = averageAmplitude;
          const timeBetweenSounds = secondSoundStartTimeRef.current - firstSoundStartTimeRef.current;
          console.log(`🔊 [Cycle] Второй звук начался (во время затухания первого, быстрая скорость): амплитуда=${averageAmplitude.toFixed(1)}, скачок=${amplitudeJump.toFixed(1)}, время между звуками=${timeBetweenSounds}мс, ультра быстрая=${isUltraFastSpeed}, экстремально быстрая=${isExtremelyFastSpeed}, очень быстрая=${isVeryFastSpeed}`);
          handleSoundDetected(nowMs, averageAmplitude / 255);
        } else {
          // Продолжаем отслеживать затухание первого звука
          const firstSoundEndThreshold = Math.min(
            firstSoundPeakAmplitudeRef.current * 0.5, // 50% от пика
            currentVolumeThreshold * 0.8 // ИЛИ 80% от порога громкости (что меньше)
          );
          
          if (averageAmplitude < firstSoundEndThreshold) {
            // Амплитуда упала достаточно низко - звук завершен (частичное затухание)
            soundStateRef.current = 'firstSoundComplete';
            console.log(`✅ [Cycle] Первый звук завершен (частичное затухание): начало=${firstSoundStartTimeRef.current}, конец=${nowMs}, длительность=${nowMs - firstSoundStartTimeRef.current}мс, пик=${firstSoundPeakAmplitudeRef.current.toFixed(1)}, порог=${firstSoundEndThreshold.toFixed(1)}, текущая=${averageAmplitude.toFixed(1)}`);
          } else if (isRising && amplitudeJump > currentPeakThreshold * 0.7 && averageAmplitude > firstSoundPeakAmplitudeRef.current * 0.9) {
            // Амплитуда снова поднялась очень близко к пику (90%+) - возможно, это продолжение первого звука
            soundStateRef.current = 'firstSoundRising';
            if (averageAmplitude > firstSoundPeakAmplitudeRef.current) {
              firstSoundPeakAmplitudeRef.current = averageAmplitude;
            }
          }
        }
        break;
        
      case 'firstSoundComplete':
        // Первый звук завершен - ждем начала второго звука
        // Второй звук начинается: резкий подъем амплитуды выше порога
        // Для быстрых скоростей снижаем пороги второго звука
        const timeSinceFirstStartComplete = nowMs - firstSoundStartTimeRef.current;
        const isVeryFastSpeedComplete = timeSinceFirstStartComplete < 300; // Если время < 300мс, это очень быстрая скорость (> 60 км/ч)
        const isExtremelyFastSpeedComplete = timeSinceFirstStartComplete < 150; // Если время < 150мс, это экстремально быстрая скорость (> 120 км/ч)
        const isUltraFastSpeedComplete = timeSinceFirstStartComplete < 80; // Если время < 80мс, это ультра быстрая скорость (> 225 км/ч)
        const secondSoundPeakThresholdComplete = isUltraFastSpeedComplete 
          ? currentPeakThreshold * 0.1   // 10% для ультра быстрых скоростей
          : isExtremelyFastSpeedComplete 
            ? currentPeakThreshold * 0.12  // 12% для экстремально быстрых скоростей
            : isVeryFastSpeedComplete 
              ? currentPeakThreshold * 0.18  // 18% для очень быстрых скоростей
              : currentPeakThreshold * 0.4; // 40% для обычных скоростей
        const secondSoundJumpThresholdComplete = isUltraFastSpeedComplete 
          ? 8   // 8 для ультра быстрых скоростей
          : isExtremelyFastSpeedComplete 
            ? 9   // 9 для экстремально быстрых скоростей
            : isVeryFastSpeedComplete 
              ? 11  // 11 для очень быстрых скоростей
              : 20; // 20 для обычных скоростей
        const secondSoundVolumeThresholdComplete = isUltraFastSpeedComplete 
          ? currentVolumeThreshold * 0.45  // 45% для ультра быстрых скоростей
          : isExtremelyFastSpeedComplete 
            ? currentVolumeThreshold * 0.48  // 48% для экстремально быстрых скоростей
            : isVeryFastSpeedComplete 
              ? currentVolumeThreshold * 0.52  // 52% для очень быстрых скоростей
              : currentVolumeThreshold * 0.7; // 70% для обычных скоростей
        
        if (isRising && 
            amplitudeJump > secondSoundPeakThresholdComplete && 
            averageAmplitude > secondSoundVolumeThresholdComplete &&
            amplitudeJump > secondSoundJumpThresholdComplete) {
          soundStateRef.current = 'secondSoundRising';
          secondSoundStartTimeRef.current = nowMs;
          secondSoundPeakAmplitudeRef.current = averageAmplitude; // Инициализируем пик второго звука
          const timeBetweenSounds = secondSoundStartTimeRef.current - firstSoundStartTimeRef.current;
          console.log(`🔊 [Cycle] Второй звук начался: амплитуда=${averageAmplitude.toFixed(1)}, скачок=${amplitudeJump.toFixed(1)}, время между звуками=${timeBetweenSounds}мс, ультра быстрая=${isUltraFastSpeedComplete}, экстремально быстрая=${isExtremelyFastSpeedComplete}, очень быстрая=${isVeryFastSpeedComplete}`);
          handleSoundDetected(nowMs, averageAmplitude / 255);
        }
        break;
        
      case 'secondSoundRising':
        // Второй звук растет - отслеживаем пик
        if (averageAmplitude > secondSoundPeakAmplitudeRef.current) {
          secondSoundPeakAmplitudeRef.current = averageAmplitude;
        }
        // Переходим к затуханию, если амплитуда упала на 10% от пика (более чувствительно для быстрых звуков)
        // Для быстрых скоростей важно быстро переходить к затуханию
        if (isFalling && averageAmplitude < secondSoundPeakAmplitudeRef.current * 0.9) {
          // Амплитуда начала падать - звук начал затухать
          soundStateRef.current = 'secondSoundFalling';
          secondSoundFallingStartTimeRef.current = nowMs; // Фиксируем время начала затухания
          console.log(`🔊 [Cycle] Второй звук начал затухать: пик=${secondSoundPeakAmplitudeRef.current.toFixed(1)}, текущая=${averageAmplitude.toFixed(1)}`);
        }
        break;
        
      case 'secondSoundFalling':
        // Второй звук затухает - завершаем при частичном затухании (60% от пика) для повышения чувствительности
        // Звук считается завершенным, если амплитуда упала ниже 60% от пика ИЛИ ниже порога громкости
        // Используем более высокий порог (60% вместо 50%), чтобы звук завершался быстрее
        const secondSoundEndThreshold = Math.min(
          secondSoundPeakAmplitudeRef.current * 0.6, // 60% от пика (повышено для более быстрого завершения)
          currentVolumeThreshold * 0.9 // ИЛИ 90% от порога громкости (что меньше)
        );
        
        // Также проверяем время с начала затухания - если прошло достаточно времени (> 200мс), завершаем звук
        const timeSinceFallingStart = nowMs - secondSoundFallingStartTimeRef.current;
        const hasEnoughTimePassed = timeSinceFallingStart > 200; // Прошло более 200мс с начала затухания
        
        if (averageAmplitude < secondSoundEndThreshold || (hasEnoughTimePassed && isFalling && averageAmplitude < secondSoundPeakAmplitudeRef.current * 0.7)) {
          // Амплитуда упала достаточно низко ИЛИ прошло достаточно времени - звук завершен (частичное затухание)
          soundStateRef.current = 'secondSoundComplete';
          console.log(`✅ [Cycle] Второй звук завершен (частичное затухание): начало=${secondSoundStartTimeRef.current}, конец=${nowMs}, пик=${secondSoundPeakAmplitudeRef.current.toFixed(1)}, порог=${secondSoundEndThreshold.toFixed(1)}, текущая=${averageAmplitude.toFixed(1)}, время затухания=${timeSinceFallingStart}мс`);
          
          // Рассчитываем скорость на основе времени между началами звуков
          const timeBetweenStarts = secondSoundStartTimeRef.current - firstSoundStartTimeRef.current;
          if (timeBetweenStarts > 0) {
            const speedMs = distanceMeters / (timeBetweenStarts / 1000);
            const speedKmh = speedMs * 3.6;
            console.log(`⏱️ Время между началами звуков: ${timeBetweenStarts}мс (${(timeBetweenStarts / 1000).toFixed(3)}с)`);
            console.log(`⚡ Скорость рассчитана: ${speedKmh.toFixed(2)} км/ч`);
            
            // Проверка: если скорость больше 120 км/ч, не сохраняем результат
            if (speedKmh > 120) {
              console.log(`⚠️ Скорость ${speedKmh.toFixed(2)} км/ч превышает лимит 120 км/ч, результат не сохранен`);
            } else {
              // Сохраняем результат
              const speedMph = speedKmh / 1.60934;
              const result: SpeedResult = {
                speedMs,
                speedKmh,
                speedMph,
                timeMs: timeBetweenStarts,
                timestamp: Date.now(),
                distance: distanceMeters
              };
              setSpeedResults(prev => [...prev, result]);
              setCurrentStatus(`${t('puckSpeed.speedCalculated') || '⚡ Скорость:'} ${speedKmh.toFixed(1)} ${t('puckSpeed.kmh') || 'км/ч'}`);
              lastSpeedCalculationTimeRef.current = Date.now();
            }
          }
          
          // Сбрасываем состояние
          soundStateRef.current = 'idle';
          soundEventsRef.current = [];
          setSoundEvents([]);
          previousAmplitudeRef.current = 0;
          lastSoundDetectionTimeRef.current = 0;
        } else if (isRising && amplitudeJump > currentPeakThreshold * 0.4 && averageAmplitude > currentVolumeThreshold * 0.8) {
          // Амплитуда снова поднялась высоко - возможно, это продолжение второго звука
          soundStateRef.current = 'secondSoundRising';
        }
        break;
        
      case 'secondSoundComplete':
        // Второй звук завершен - сбрасываем состояние (должно было произойти выше)
        soundStateRef.current = 'idle';
        break;
    }
  }, [distanceMeters, handleSoundDetected, t]);

  // Обработка обнаруженного звука (автоматически для веб, вручную для мобильного)
  const handleSoundDetected = useCallback((timestamp: number, amplitude: number) => {
    setSoundEvents(prev => {
      const newEvent: SoundEvent = {
        timestamp: timestamp,
        amplitude: amplitude,
      };

      const updatedEvents = [...prev, newEvent];
      
      console.log(`📊 События звука: ${updatedEvents.length}/2`);
      if (updatedEvents.length === 1) {
        console.log(`✅ Первый звук зафиксирован в ${timestamp}мс`);
        setCurrentStatus(t('puckSpeed.sound1Detected') || '🔊 Звук 1 обнаружен! Готов к второму...');
        
        // Устанавливаем таймаут ожидания второго звука (3 секунды)
        if (soundTimeoutRef.current) {
          clearTimeout(soundTimeoutRef.current);
        }
        soundTimeoutRef.current = setTimeout(() => {
          // Проверяем, что все еще ждем второй звук (только один звук зафиксирован)
          if (soundEventsRef.current.length === 1 && isMeasuringRef.current) {
            console.log('⏱️ Таймаут ожидания второго звука (3 секунды) - сброс состояния');
            setSoundEvents([]);
            soundEventsRef.current = [];
            setCurrentStatus((isWeb || isIOS || isAndroid) ? (t('puckSpeed.analyzing') || '🎤 Анализирую звук...') : (t('puckSpeed.readyForSound') || 'Готов к первому звуку...'));
            previousAmplitudeRef.current = 0;
            lastSoundDetectionTimeRef.current = 0;
          }
          soundTimeoutRef.current = null;
        }, 3000);
      } else if (updatedEvents.length === 2) {
        // Рассчитываем скорость
        const firstSound = updatedEvents[0];
        const timeDiffMs = timestamp - firstSound.timestamp;
        const timeDiffSeconds = timeDiffMs / 1000;

        console.log(`⏱️ Время между звуками: ${timeDiffMs.toFixed(0)}мс (${timeDiffSeconds.toFixed(3)}с)`);

        if (timeDiffSeconds > 0) {
          const speedMs = distanceMeters / timeDiffSeconds;
          const speedKmh = speedMs * 3.6;
          
          // Проверка: если скорость больше 120 км/ч, не сохраняем результат
          if (speedKmh > 120) {
            console.log(`⚠️ Скорость ${speedKmh.toFixed(2)} км/ч превышает лимит 120 км/ч, результат не сохранен`);
            setCurrentStatus(t('puckSpeed.speedExceedsLimit') || '⚠️ Скорость превышает 120 км/ч, измерение не засчитано');
            
            // Очищаем таймаут
            if (soundTimeoutRef.current) {
              clearTimeout(soundTimeoutRef.current);
              soundTimeoutRef.current = null;
            }
            
            // Сбрасываем события для следующего измерения
            return [];
          }
          
          const speedMph = speedKmh / 1.60934; // Конвертация в мили/час

          console.log(`⚡ Скорость рассчитана: ${speedKmh.toFixed(2)} км/ч`);

          const result: SpeedResult = {
            speedMs,
            speedKmh,
            speedMph,
            timeMs: timeDiffMs,
            distance: distanceMeters,
            timestamp: Date.now(), // Время создания результата
          };

          // Очищаем таймаут, так как второй звук уже получен
          if (soundTimeoutRef.current) {
            clearTimeout(soundTimeoutRef.current);
            soundTimeoutRef.current = null;
          }

          setSpeedResults(prevResults => [...prevResults, result]);
          setCurrentStatus(`${t('puckSpeed.speedCalculated') || '⚡ Скорость:'} ${speedKmh.toFixed(1)} ${t('puckSpeed.kmh') || 'км/ч'}`);

          // ВАЖНО: Фиксируем время расчета скорости для периода покоя
          lastSpeedCalculationTimeRef.current = Date.now();

          // Сбрасываем события для следующего измерения
          // ВАЖНО: также сбрасываем ref синхронно
          soundEventsRef.current = [];
          previousAmplitudeRef.current = 0; // Сбрасываем предыдущую амплитуду для следующего измерения
          lastSoundDetectionTimeRef.current = 0; // Сбрасываем время последней детекции
          return [];
        } else {
          console.warn('⚠️ Время между звуками <= 0, пропускаем расчет');
        }
      }

      return updatedEvents;
    });
  }, [distanceMeters]);

  // Цикл анализа для веб-версии (Web Audio API)
  useEffect(() => {
    // Проверяем все условия
    if (!isWeb) {
      return; // Не веб-версия
    }
    
    if (!analyserRef.current || !dataArrayRef.current) {
      console.log('⚠️ Анализ не готов:', { hasAnalyser: !!analyserRef.current, hasDataArray: !!dataArrayRef.current });
      return; // Анализатор еще не готов
    }
    
    if (!isMeasuring) {
      // Если измерение остановлено, останавливаем анализ
      isAnalyzingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const startMsg = `🎤 [Web] Запускаем анализ, чувствительность: ${sensitivity}%, порог: ${VOLUME_THRESHOLD.toFixed(1)}`;
    console.log(`🎤 Запускаем анализ звука (Web Audio API), чувствительность: ${sensitivity}%, порог громкости: ${VOLUME_THRESHOLD.toFixed(1)}, порог скачка: ${PEAK_DETECTION_THRESHOLD.toFixed(1)}`);
    // setDebugLogs removed
    isAnalyzingRef.current = true;
    recordingStartTimeRef.current = Date.now(); // Фиксируем время начала записи
    previousAmplitudeRef.current = 0; // Сбрасываем предыдущую амплитуду
    soundStateRef.current = 'idle'; // Сбрасываем состояние звука
    lastAmplitudeRef.current = 0; // Сбрасываем последнюю амплитуду

    const analyzeAudio = () => {
      // Проверяем состояние измерения через ref для синхронного доступа
      if (!isAnalyzingRef.current || !isMeasuringRef.current || !analyserRef.current || !dataArrayRef.current || !audioContextRef.current) {
        if (!isMeasuringRef.current) {
          isAnalyzingRef.current = false;
        }
        return;
      }

      // Получаем частотные данные
      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

      // Рассчитываем среднюю амплитуду
      const averageAmplitude = dataArrayRef.current.reduce((sum, val) => sum + val, 0) / dataArrayRef.current.length;
      setCurrentAmplitude(averageAmplitude / 255); // Нормализуем к 0-1

      // Используем ref для синхронного доступа к событиям
      const currentEvents = soundEventsRef.current;

      // Логируем периодически для отладки
      const frameCount = Math.floor(Date.now() / 1000) % 5; // Логируем каждые 5 секунд
      if (frameCount === 0 && Math.random() < 0.1) {
        console.log(`📊 Чувствительность: ${sensitivity}%, Порог громкости: ${VOLUME_THRESHOLD.toFixed(1)}, Порог скачка: ${PEAK_DETECTION_THRESHOLD.toFixed(1)}`);
        console.log(`📊 Амплитуда: ${averageAmplitude.toFixed(1)}/${VOLUME_THRESHOLD.toFixed(1)}, событий: ${currentEvents.length}/2, состояние: ${soundStateRef.current}, громкость: ${(averageAmplitude / 255 * 100).toFixed(1)}%`);
      }

      // НОВАЯ ЛОГИКА: Используем отслеживание полных циклов звука вместо детекции пиков
      const nowMs = Date.now();
      processAmplitudeWithCycleDetection(averageAmplitude, nowMs);

      // Продолжаем анализ
      if (isAnalyzingRef.current) {
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      }
    };

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);

    return () => {
      isAnalyzingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isWeb, isMeasuring, processAmplitudeWithCycleDetection]);

  // Цикл анализа для iOS (AudioRecorderPlayer)
  useEffect(() => {
    if ((!isIOS && !isAndroid) || !hasPermission) return;
    
    if (!audioRecorderPlayerRef.current) {
      return; // AudioRecorderPlayer еще не готов
    }
    
    if (!isMeasuring) {
      // Если измерение остановлено, останавливаем анализ
      isAnalyzingRef.current = false;
      
      // Останавливаем expo-av, если используется
      if (useExpoAVRef.current) {
        if (expoAVMeteringIntervalRef.current) {
          clearInterval(expoAVMeteringIntervalRef.current);
          expoAVMeteringIntervalRef.current = null;
        }
        if (expoAVRecordingRef.current) {
          expoAVRecordingRef.current.stopAndUnloadAsync().catch(() => {});
          expoAVRecordingRef.current = null;
        }
        useExpoAVRef.current = false;
      } else {
        // Останавливаем AudioRecorderPlayer
        if (recordBackListenerRef.current && audioRecorderPlayerRef.current) {
          try {
            (audioRecorderPlayerRef.current as any).removeRecordBackListener(recordBackListenerRef.current);
          } catch (e) {
            // Игнорируем ошибки при удалении слушателя
          }
          recordBackListenerRef.current = null;
        }
        if (audioRecorderPlayerRef.current) {
          try {
            if (typeof audioRecorderPlayerRef.current.stopRecorder === 'function') {
              audioRecorderPlayerRef.current.stopRecorder().catch(() => {});
            }
          } catch (e) {
            // Игнорируем ошибки при остановке
          }
        }
      }
      return;
    }

    console.log(`🎤 Запускаем анализ звука (iOS AudioRecorderPlayer), чувствительность: ${sensitivity}%, порог громкости: ${VOLUME_THRESHOLD.toFixed(1)}, порог скачка: ${PEAK_DETECTION_THRESHOLD.toFixed(1)}`);
      isAnalyzingRef.current = true;
      recordingStartTimeRef.current = Date.now();
      previousAmplitudeRef.current = 0; // ВАЖНО: сбрасываем предыдущую амплитуду при старте
      soundStateRef.current = 'idle'; // Сбрасываем состояние звука
      lastAmplitudeRef.current = 0; // Сбрасываем последнюю амплитуду

    // Fallback функция для использования expo-av вместо AudioRecorderPlayer
    const startExpoAVRecording = async () => {
      try {
        const enableLogs = typeof process !== 'undefined' &&
          process.env?.EXPO_PUBLIC_ENABLE_LOGS === 'true';
        const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
        const shouldLog = isDev || enableLogs;
        
        const platform = isIOS ? 'iOS' : 'Android';
        if (shouldLog) {
          console.log(`📹 [${platform}] Запускаем запись через expo-av...`);
          console.log(`📹 [${platform}] isAnalyzingRef.current:`, isAnalyzingRef.current);
          console.log(`📹 [${platform}] isMeasuringRef.current:`, isMeasuringRef.current);
        }
        
        // Настраиваем аудиосессию
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: isIOS,
          staysActiveInBackground: false,
          playsInSilentModeIOS: isIOS,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        
        if (shouldLog) {
          console.log(`✅ [${platform}] Аудиосессия настроена`);
        }
        
        // Создаем запись с включенным метерингом
        const { recording } = await Audio.Recording.createAsync(
          {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true, // ВАЖНО: включаем метеринг для получения данных об амплитуде
          },
          undefined, // onRecordingStatusUpdate - не используем, будем опрашивать вручную
          100 // updateInterval - минимальный интервал
        );
        
        expoAVRecordingRef.current = recording;
        if (shouldLog) {
          console.log(`✅ [${platform}] Запись через expo-av начата, recording:`, recording);
        }
        
        // Запускаем опрос метеринга через интервал
        let meteringCallCount = 0;
        expoAVMeteringIntervalRef.current = setInterval(async () => {
          if (!isAnalyzingRef.current || !isMeasuringRef.current || !expoAVRecordingRef.current) {
            return;
          }
          
          try {
            const status = await expoAVRecordingRef.current.getStatusAsync();
            meteringCallCount++;
            
            if (status.metering !== undefined && status.metering !== null) {
              const db = status.metering;
              
              // Преобразуем децибелы в амплитуду (как в AudioRecorderPlayer)
              const normalizedDb = db <= -160 ? -160 : Math.max(-80, Math.min(0, db));
              let averageAmplitude = 0;
              if (db <= -160) {
                averageAmplitude = 0;
              } else {
                averageAmplitude = Math.max(0, Math.min(255, ((normalizedDb + 80) / 80) * 255));
              }
              
              setCurrentAmplitude(averageAmplitude / 255);
              
              // Логируем первые вызовы для диагностики
              const enableLogs = typeof process !== 'undefined' &&
                process.env?.EXPO_PUBLIC_ENABLE_LOGS === 'true';
              const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
              const shouldLog = isDev || enableLogs;
              
              if (shouldLog) {
                const platform = isIOS ? 'iOS' : 'Android';
                if (meteringCallCount <= 20) {
                  console.log(`📊 [${platform}] Expo AV метринг #${meteringCallCount}:`, {
                    metering: db,
                    amplitude: averageAmplitude.toFixed(1),
                    isRecording: status.isRecording,
                    normalizedDb: normalizedDb.toFixed(1)
                  });
                } else if (meteringCallCount % 50 === 0) {
                  console.log(`📊 [${platform}] Expo AV метринг работает (#${meteringCallCount}), metering=${db.toFixed(1)}`);
                }
              }
              
              // НОВАЯ ЛОГИКА: Используем отслеживание полных циклов звука вместо детекции пиков
              const nowMs = Date.now();
              processAmplitudeWithCycleDetection(averageAmplitude, nowMs);
            } else {
              const enableLogs = typeof process !== 'undefined' &&
                process.env?.EXPO_PUBLIC_ENABLE_LOGS === 'true';
              const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
              const platform = isIOS ? 'iOS' : 'Android';
              if ((isDev || enableLogs) && meteringCallCount <= 20) {
                console.warn(`⚠️ [${platform}] Expo AV метринг #${meteringCallCount}: metering отсутствует, status:`, status);
              }
            }
          } catch (statusError) {
            const enableLogs = typeof process !== 'undefined' &&
              process.env?.EXPO_PUBLIC_ENABLE_LOGS === 'true';
            const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
            const platform = isIOS ? 'iOS' : 'Android';
            if (isDev || enableLogs) {
              console.error(`❌ [${platform}] Ошибка получения статуса expo-av:`, statusError);
            }
          }
        }, 100); // Опрашиваем каждые 100ms
        
        console.log(`✅ [${platform}] Цикл опроса метеринга expo-av запущен`);
      } catch (error) {
        console.error(`❌ [${platform}] Ошибка запуска expo-av:`, error);
        throw error;
      }
    };

    const startIOSRecording = async () => {
      // Используем expo-av сразу, так как AudioRecorderPlayer не работает в production
      console.log('📹 [iOS] Используем expo-av для записи с метерингом...');
      useExpoAVRef.current = true;
      
      try {
        await startExpoAVRecording();
      } catch (error) {
        console.error('❌ [iOS] Ошибка запуска expo-av:', error);
        setAlert({
          visible: true,
          title: 'Ошибка записи',
          message: `Не удалось запустить запись звука: ${error instanceof Error ? error.message : String(error)}. Проверьте разрешения на микрофон в настройках.`,
          type: 'error',
          onConfirm: () => setAlert({ ...alert, visible: false }),
        });
        isAnalyzingRef.current = false;
      }
      
      // Старый код с AudioRecorderPlayer удален - он не работает в production
    };

    startIOSRecording();

    return () => {
      isAnalyzingRef.current = false;
      
      // Очищаем timeout проверки callback
      if (callbackCheckTimeoutRef.current) {
        clearTimeout(callbackCheckTimeoutRef.current);
        callbackCheckTimeoutRef.current = null;
      }
      
      // Останавливаем expo-av, если используется
      if (useExpoAVRef.current && expoAVMeteringIntervalRef.current) {
        clearInterval(expoAVMeteringIntervalRef.current);
        expoAVMeteringIntervalRef.current = null;
      }
      if (expoAVRecordingRef.current) {
        expoAVRecordingRef.current.stopAndUnloadAsync().catch(() => {});
        expoAVRecordingRef.current = null;
      }
      
      // Останавливаем AudioRecorderPlayer, если используется
      if (!useExpoAVRef.current) {
        if (recordBackListenerRef.current && audioRecorderPlayerRef.current) {
          try {
            (audioRecorderPlayerRef.current as any).removeRecordBackListener(recordBackListenerRef.current);
          } catch (e) {
            // Игнорируем ошибки при удалении слушателя
          }
          recordBackListenerRef.current = null;
        }
        if (audioRecorderPlayerRef.current) {
          try {
            if (typeof audioRecorderPlayerRef.current.stopRecorder === 'function') {
              audioRecorderPlayerRef.current.stopRecorder().catch(() => {});
            }
          } catch (e) {
            // Игнорируем ошибки при остановке
          }
        }
      }
    };
  }, [isIOS, isAndroid, isMeasuring, handleSoundDetected, hasPermission]); // Убрали VOLUME_THRESHOLD и PEAK_DETECTION_THRESHOLD из зависимостей, используем ref

  // Останавливаем микрофон при уходе со страницы (используем useFocusEffect для отслеживания фокуса)
  useFocusEffect(
    useCallback(() => {
      // Экран в фокусе - ничего не делаем, микрофон работает
      return () => {
        // Экран потерял фокус - останавливаем микрофон
        console.log('🛑 [Focus] Останавливаем микрофон при уходе со страницы');
        
        // Останавливаем анализ
        isAnalyzingRef.current = false;
        isMeasuringRef.current = false;
        soundStateRef.current = 'idle'; // Сбрасываем состояние звука
        
        // Для веб-версии: останавливаем анализ
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // Для веб-версии: останавливаем поток микрофона и закрываем аудио контекст
        if (isWeb) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
          }
        }
        
        // Для iOS и Android: останавливаем запись и удаляем слушатель
        if (isIOS || isAndroid) {
          // Очищаем timeout проверки callback
          if (callbackCheckTimeoutRef.current) {
            clearTimeout(callbackCheckTimeoutRef.current);
            callbackCheckTimeoutRef.current = null;
          }
          
          // Останавливаем expo-av, если используется
          if (useExpoAVRef.current) {
            if (expoAVMeteringIntervalRef.current) {
              clearInterval(expoAVMeteringIntervalRef.current);
              expoAVMeteringIntervalRef.current = null;
            }
            if (expoAVRecordingRef.current) {
              expoAVRecordingRef.current.stopAndUnloadAsync().catch(() => {});
              expoAVRecordingRef.current = null;
            }
            useExpoAVRef.current = false;
          } else if (audioRecorderPlayerRef.current) {
            // Удаляем слушатель
            if (recordBackListenerRef.current) {
              try {
                (audioRecorderPlayerRef.current as any).removeRecordBackListener(recordBackListenerRef.current);
              } catch (e) {
                // Игнорируем ошибки
              }
              recordBackListenerRef.current = null;
            }
            
            // Останавливаем запись
            try {
              if (typeof audioRecorderPlayerRef.current.stopRecorder === 'function') {
                audioRecorderPlayerRef.current.stopRecorder().catch(() => {});
              }
            } catch (e) {
              // Игнорируем ошибки при остановке
            }
          }
        }
        
        // Сбрасываем состояние
        setCurrentAmplitude(0);
        setSoundEvents([]);
        soundEventsRef.current = [];
        previousAmplitudeRef.current = 0;
        lastSoundDetectionTimeRef.current = 0;
        lastSpeedCalculationTimeRef.current = 0;
      };
    }, [isIOS, isWeb])
  );

  // Cleanup: останавливаем микрофон и анализ при размонтировании компонента
  useEffect(() => {
    return () => {
      console.log('🛑 [Cleanup] Останавливаем микрофон и анализ при размонтировании');
      
      // Останавливаем анализ
      isAnalyzingRef.current = false;
      isMeasuringRef.current = false;
      
      // Для веб-версии: останавливаем анализ
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Для веб-версии: останавливаем поток микрофона и закрываем аудио контекст
      if (isWeb) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
      }
      
      // Для iOS и Android: останавливаем запись и удаляем слушатель
      if (isIOS || isAndroid) {
        // Очищаем timeout проверки callback
        if (callbackCheckTimeoutRef.current) {
          clearTimeout(callbackCheckTimeoutRef.current);
          callbackCheckTimeoutRef.current = null;
        }
        
        // Останавливаем expo-av, если используется
        if (useExpoAVRef.current) {
          if (expoAVMeteringIntervalRef.current) {
            clearInterval(expoAVMeteringIntervalRef.current);
            expoAVMeteringIntervalRef.current = null;
          }
          if (expoAVRecordingRef.current) {
            expoAVRecordingRef.current.stopAndUnloadAsync().catch(() => {});
            expoAVRecordingRef.current = null;
          }
          useExpoAVRef.current = false;
        } else if (audioRecorderPlayerRef.current) {
          // Удаляем слушатель
          if (recordBackListenerRef.current) {
            try {
              (audioRecorderPlayerRef.current as any).removeRecordBackListener(recordBackListenerRef.current);
            } catch (e) {
              // Игнорируем ошибки
            }
            recordBackListenerRef.current = null;
          }
          
          // Останавливаем запись
          audioRecorderPlayerRef.current.stopRecorder().catch(() => {});
        }
      }
      
      // Сбрасываем состояние
      setCurrentAmplitude(0);
      setSoundEvents([]);
      soundEventsRef.current = [];
      previousAmplitudeRef.current = 0;
      lastSoundDetectionTimeRef.current = 0;
      lastSpeedCalculationTimeRef.current = 0;
    };
  }, []); // Пустой массив зависимостей = выполняется только при размонтировании

  // Анимация мигания цифр при новом результате
  useEffect(() => {
    // Анимируем только когда появляется новый результат (длина массива увеличилась)
    if (speedResults.length > prevSpeedResultsLengthRef.current && speedResults.length > 0) {
      // Обновляем предыдущую длину
      prevSpeedResultsLengthRef.current = speedResults.length;
      
      // Запускаем мигание только цифр (не всего радара)
      blinkAnim.setValue(1);
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Обновляем предыдущую длину даже если нет нового результата
      prevSpeedResultsLengthRef.current = speedResults.length;
    }
  }, [speedResults.length, blinkAnim]);

  // Начало измерения
  const startMeasuring = () => {
    if (!hasPermission) {
      setAlert({
        visible: true,
        title: t('puckSpeed.errorSaveFailed') || 'Ошибка',
        message: t('puckSpeed.needMicrophone') || 'Необходим доступ к микрофону',
        type: 'error',
        onConfirm: () => setAlert({ ...alert, visible: false }),
      });
      return;
    }

    console.log('🎬 Начинаем измерение скорости');
    // Очищаем предыдущий таймаут если есть
    if (soundTimeoutRef.current) {
      clearTimeout(soundTimeoutRef.current);
      soundTimeoutRef.current = null;
    }
    
    // Сбрасываем состояние
    setSoundEvents([]);
    soundEventsRef.current = []; // Сбрасываем ref тоже
    previousAmplitudeRef.current = 0; // Сбрасываем предыдущую амплитуду
    lastSoundDetectionTimeRef.current = 0; // Сбрасываем время последней детекции
    lastSpeedCalculationTimeRef.current = 0; // Сбрасываем время последнего расчета скорости
    setCurrentAmplitude(0);
    setCurrentStatus((isWeb || isIOS) ? (t('puckSpeed.analyzing') || '🎤 Анализирую звук...') : (t('puckSpeed.readyForSound') || 'Готов к первому звуку...'));
    
    // Устанавливаем isMeasuring и обновляем ref синхронно
    isMeasuringRef.current = true;
    setIsMeasuring(true);
  };

  // Остановка измерения
  const stopMeasuring = () => {
    // Сбрасываем состояние звука
    soundStateRef.current = 'idle';
    // Очищаем таймаут
    if (soundTimeoutRef.current) {
      clearTimeout(soundTimeoutRef.current);
      soundTimeoutRef.current = null;
    }
    
    isMeasuringRef.current = false;
    setIsMeasuring(false);
    setSoundEvents([]);
    soundEventsRef.current = [];
    setCurrentStatus(t('puckSpeed.ready') || 'Готов к измерению');
    setCurrentAmplitude(0);
    isAnalyzingRef.current = false;
  };

  // Сброс результатов
  const resetResults = () => {
    // Очищаем таймаут
    if (soundTimeoutRef.current) {
      clearTimeout(soundTimeoutRef.current);
      soundTimeoutRef.current = null;
    }
    
    setSpeedResults([]);
    setSoundEvents([]);
    soundEventsRef.current = [];
    setCurrentStatus(t('puckSpeed.ready') || 'Готов к измерению');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.text}>Запрос разрешений...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="mic-off" size={64} color="#F44336" />
        <Text style={styles.errorText}>Нет доступа к микрофону</Text>
        <Text style={styles.text}>
          Разрешите доступ к микрофону в настройках приложения
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
      <CachedBackground
        source={require('../assets/images/led.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Заголовок страницы */}
          <View style={styles.pageHeader}>
            <TouchableOpacity 
              onPress={() => {
                // Если идет измерение, останавливаем его
                if (isMeasuring) {
                  stopMeasuring();
                  return;
                }
                // Возвращаемся на предыдущую страницу
                if (router.canGoBack()) {
                  router.back();
                } else {
                  // Если нет истории, возвращаемся на главную
                  router.replace('/');
                }
              }} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t('puckSpeed.title') || 'Измерение скорости шайбы'}</Text>
            {/* Кнопка с вопросиком показывается всегда */}
            <TouchableOpacity 
              onPress={() => setShowInstructions(!showInstructions)} 
              style={styles.helpButton}
            >
              <Ionicons name="help" size={18} color="#fff" style={{ fontWeight: 'bold' }} />
            </TouchableOpacity>
          </View>

          {/* Название Hockeystars Radar */}
          <View style={styles.radarTitleContainer}>
            <View style={styles.radarTitleBackground}>
              <Text style={styles.radarTitle}>HOCKEYSTARS RADAR</Text>
            </View>
          </View>

          {/* Уровень звука (наложен на название снизу) */}
          {isMeasuring && (isWeb || isIOS || isAndroid) && hasPermission !== null && (
            <View style={styles.amplitudeBarContainer}>
              <View style={styles.amplitudeBar}>
                <View 
                  style={[
                    styles.amplitudeBarFill, 
                    { width: `${Math.max(currentAmplitude * 100, 1)}%` }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Последний результат (показываем только при измерении) */}
          {isMeasuring && (
            <View style={styles.latestResult}>
              {/* Статус "Готов" / "Ready" над радаром */}
              {soundEvents.length === 0 && (
                <Text style={styles.readyStatusText}>{t('puckSpeed.ready') || 'Готов'}</Text>
              )}
              {soundEvents.length === 1 && (
                <Text style={styles.readyStatusText}>{t('puckSpeed.waitingForSecond') || 'Ожидание 2-го звука'}</Text>
              )}
              <View style={styles.speedContainer}>
                <View style={styles.speedBox}>
                  <View style={styles.speedBoxHighlight} />
                  <Animated.Text style={[
                    styles.speedValue,
                    { opacity: blinkAnim }
                  ]}>
                    {speedResults.length > 0 
                      ? Math.round(speedResults[speedResults.length - 1].speedKmh).toString().padStart(3, '0')
                      : '000'
                    }
                  </Animated.Text>
                  <Text style={styles.speedUnit}>{t('puckSpeed.kmh') || 'км/ч'}</Text>
                </View>
              </View>
              
              {/* Ползунок чувствительности (компактный, под радаром) */}
              <View style={styles.sensitivityContainerCompact}>
                <Text style={styles.sensitivityLabelCompact}>{t('puckSpeed.sensitivity') || 'Чувствительность:'}{' '}{isNaN(sensitivity) ? 50 : Math.max(0, Math.min(100, sensitivity))}%</Text>
                <View 
                  style={styles.sliderContainerCompact}
                  onLayout={(e) => {
                    const { width } = e.nativeEvent.layout;
                    if (width > 0) {
                      sliderWidthRef.current = width;
                    }
                  }}
                >
                  <View style={styles.sliderTrackCompact}>
                    <View 
                      style={[
                        styles.sliderFillCompact, 
                        { width: `${Math.max(0, Math.min(100, sensitivity ?? 50))}%` }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.sliderThumbCompact,
                        { left: `${Math.max(0, Math.min(100, sensitivity ?? 50))}%` }
                      ]}
                    />
                  </View>
                  <View
                    style={styles.sliderTouchableCompact}
                    {...sliderPanResponder.panHandlers}
                  />
                </View>
              </View>
            </View>
          )}

          {/* История результатов (показываем только когда измерение активно) */}
          {isMeasuring && (() => {
            // Находим максимальную скорость из текущих измерений
            const maxSpeedFromResults = speedResults.length > 0 
              ? speedResults.reduce((max, current) => 
                  current.speedKmh > max.speedKmh ? current : max
                ).speedKmh
              : 0;
            
            // Сравниваем с рекордом из профиля и берем большее значение
            const profileRecord = currentUser?.puckSpeed || 0;
            const maxSpeedKmh = Math.round(Math.max(maxSpeedFromResults, profileRecord));
            
            // Находим результат с максимальной скоростью для отображения (только из текущих измерений)
            const maxSpeedResult = speedResults.length > 0
              ? speedResults.find(r => Math.round(r.speedKmh) === maxSpeedKmh) || null
              : null;
            
            // Определяем, является ли рекорд из профиля (т.е. нет результатов или рекорд из профиля больше)
            const isRecordFromProfile = profileRecord > 0 && (speedResults.length === 0 || profileRecord > maxSpeedFromResults);
            
            // Остальные результаты в обратном порядке (новые сверху), исключая рекорд (если он из текущих измерений)
            const allResults = speedResults.slice().reverse();
            const otherResults = maxSpeedResult && maxSpeedResult.timestamp 
              ? allResults.filter(result => result.timestamp !== maxSpeedResult.timestamp)
              : allResults;
            
            return (
              <ScrollView 
                style={styles.historyContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Мой рекорд - показываем всегда, если есть рекорд из профиля или текущие измерения */}
                {(profileRecord > 0 || speedResults.length > 0) && (
                  <>
                    <Text style={styles.historyTitle}>{t('puckSpeed.myRecord') || 'Мой рекорд:'}</Text>
                    <View style={[styles.historyItem, styles.recordHistoryItem]}>
                      <Text style={styles.historySpeed}>
                        {maxSpeedKmh}{' '}{t('puckSpeed.kmh') || 'км/ч'}
                      </Text>
                      {/* Показываем кнопку только если рекорд из текущих измерений (не из профиля) */}
                      {maxSpeedResult && maxSpeedResult.timestamp && !isRecordFromProfile && (
                        <TouchableOpacity
                          style={styles.addToProfileButton}
                          onPress={async () => {
                            if (!currentUser?.id) {
                              setAlert({
                                visible: true,
                                title: t('puckSpeed.errorSaveFailed') || 'Ошибка',
                                message: t('puckSpeed.errorNoProfile') || 'Необходимо войти в профиль для сохранения результата',
                                type: 'error',
                                onConfirm: () => setAlert({ ...alert, visible: false }),
                              });
                              return;
                            }
                            
                            try {
                              const previousMaxSpeed = currentUser.puckSpeed || 0;
                              const success = await savePuckSpeedResult(currentUser.id, maxSpeedKmh);
                              if (success) {
                                await refreshUser(true);
                                const isNewMaxSpeed = maxSpeedKmh > previousMaxSpeed;
                                if (isNewMaxSpeed) {
                                  setAlert({
                                    visible: true,
                                    title: t('puckSpeed.successAddedToProfile') || 'Скорость добавлена в профиль',
                                    message: `${t('puckSpeed.successNewMax') || 'Новая максимальная скорость:'} ${maxSpeedKmh} ${t('puckSpeed.kmh') || 'км/ч'}`,
                                    type: 'success',
                                    onConfirm: () => setAlert({ ...alert, visible: false }),
                                  });
                                } else {
                                  setAlert({
                                    visible: true,
                                    title: t('puckSpeed.successAddedToProfile') || 'Скорость добавлена в профиль',
                                    message: `${maxSpeedKmh} ${t('puckSpeed.kmh') || 'км/ч'}`,
                                    type: 'success',
                                    onConfirm: () => setAlert({ ...alert, visible: false }),
                                  });
                                }
                              } else {
                                setAlert({
                                  visible: true,
                                  title: t('puckSpeed.errorSaveFailed') || 'Ошибка',
                                  message: t('puckSpeed.errorSaveFailed') || 'Не удалось сохранить результат',
                                  type: 'error',
                                  onConfirm: () => setAlert({ ...alert, visible: false }),
                                });
                              }
                            } catch (error) {
                              console.error('Ошибка сохранения:', error);
                              setAlert({
                                visible: true,
                                title: 'Ошибка',
                                message: 'Не удалось сохранить результат',
                                type: 'error',
                                onConfirm: () => setAlert({ ...alert, visible: false }),
                              });
                            }
                          }}
                        >
                          <Text style={styles.addToProfileButtonText}>{t('puckSpeed.addToProfile') || 'Добавить в профиль'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
                
                {/* Текущие измерения */}
                {otherResults.length > 0 && (
                  <>
                    <Text style={[styles.historyTitle, styles.historyTitleSecondary]}>{t('puckSpeed.history') || 'История измерений:'}</Text>
                    {otherResults.map((result, index) => {
                      const speedKmh = Math.round(result.speedKmh);
                      return (
                        <View key={`other-${index}`} style={styles.historyItem}>
                          <Text style={styles.historySpeed}>
                            {speedKmh}{' '}{t('puckSpeed.kmh') || 'км/ч'}
                          </Text>
                          <TouchableOpacity
                            style={styles.addToProfileButton}
                            onPress={async () => {
                              if (!currentUser?.id) {
                                setAlert({
                                  visible: true,
                                  title: t('puckSpeed.errorSaveFailed') || 'Ошибка',
                                  message: t('puckSpeed.errorNoProfile') || 'Необходимо войти в профиль для сохранения результата',
                                  type: 'error',
                                  onConfirm: () => setAlert({ ...alert, visible: false }),
                                });
                                return;
                              }
                              
                              try {
                                const previousMaxSpeed = currentUser.puckSpeed || 0;
                                const success = await savePuckSpeedResult(currentUser.id, speedKmh);
                                if (success) {
                                  await refreshUser(true);
                                  const isNewMaxSpeed = speedKmh > previousMaxSpeed;
                                  if (isNewMaxSpeed) {
                                    setAlert({
                                      visible: true,
                                      title: t('puckSpeed.successAddedToProfile') || 'Скорость добавлена в профиль',
                                      message: `${t('puckSpeed.successNewMax') || 'Новая максимальная скорость:'} ${speedKmh} ${t('puckSpeed.kmh') || 'км/ч'}`,
                                      type: 'success',
                                      onConfirm: () => setAlert({ ...alert, visible: false }),
                                    });
                                  } else {
                                    setAlert({
                                      visible: true,
                                      title: t('puckSpeed.successAddedToProfile') || 'Скорость добавлена в профиль',
                                      message: `${speedKmh} ${t('puckSpeed.kmh') || 'км/ч'}`,
                                      type: 'success',
                                      onConfirm: () => setAlert({ ...alert, visible: false }),
                                    });
                                  }
                                } else {
                                  setAlert({
                                    visible: true,
                                    title: t('puckSpeed.errorSaveFailed') || 'Ошибка',
                                    message: t('puckSpeed.errorSaveFailed') || 'Не удалось сохранить результат',
                                    type: 'error',
                                    onConfirm: () => setAlert({ ...alert, visible: false }),
                                  });
                                }
                              } catch (error) {
                                console.error('Ошибка сохранения:', error);
                                setAlert({
                                  visible: true,
                                  title: t('puckSpeed.errorSaveFailed') || 'Ошибка',
                                  message: t('puckSpeed.errorSaveFailed') || 'Не удалось сохранить результат',
                                  type: 'error',
                                  onConfirm: () => setAlert({ ...alert, visible: false }),
                                });
                              }
                            }}
                          >
                            <Text style={styles.addToProfileButtonText}>{t('puckSpeed.addToProfile') || 'Добавить в профиль'}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </>
                )}
              </ScrollView>
            );
          })()}

          {/* Поле ввода расстояния и кнопка (когда не измеряется) */}
          {!isMeasuring && (
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 500 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.buttonContainer}>
                  <View style={styles.distanceBlockContainer}>
                    <View 
                      ref={distanceInputContainerRef}
                      style={styles.distanceInputContainer}
                    >
                      <View style={styles.distanceSliderWrapper}>
                        <View style={styles.sliderLabels}>
                          <Text style={styles.sliderLabel}>300</Text>
                          <Text style={styles.sliderLabel}>600</Text>
                        </View>
                        <View 
                          ref={distanceSliderContainerRef}
                          style={styles.sliderContainer}
                          onLayout={(e) => {
                            const { width } = e.nativeEvent.layout;
                            if (width > 0) {
                              distanceSliderWidthRef.current = width;
                            }
                          }}
                        >
                          <View style={styles.sliderTrack} />
                          <View
                            style={[
                              styles.sliderThumb,
                              {
                                left: `${((parseInt(distanceCm) - 300) / (600 - 300)) * 100}%`,
                              },
                            ]}
                          />
                          <View
                            style={styles.sliderTouchable}
                            {...distanceSliderPanResponder.panHandlers}
                          />
                        </View>
                        <View style={styles.sliderValueContainer}>
                          <Text style={styles.sliderValue}>{distanceCm}</Text>
                          <Text style={styles.distanceInputSuffix}>{t('puckSpeed.cm') || 'см'}</Text>
                        </View>
                      </View>
                      <Text style={styles.distanceLabel}>{t('puckSpeed.distanceLabel') || 'Расстояние от шайбы до сетки'}</Text>
                    </View>
                  </View>
                  <View style={styles.buttonShadow}>
                  <TouchableOpacity style={styles.startButton} onPress={startMeasuring} activeOpacity={0.8}>
                    <View style={styles.buttonHighlight} />
                    <View style={styles.iconContainer}>
                      <Ionicons name="play" size={151} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.instructionHintContainer}>
                  <Text style={styles.instructionHintText}>
                    {t('puckSpeed.readInstructions') || 'Ознакомьтесь с инструкцией перед использованием'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setShowInstructions(!showInstructions)} 
                    style={styles.instructionHintButton}
                  >
                    <Ionicons name="help-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                </View>
              </TouchableWithoutFeedback>
            </ScrollView>
          )}

          {/* Кнопки управления (когда измеряется) */}
          {isMeasuring && (
            <View style={styles.controls}>
              <TouchableOpacity style={styles.stopButton} onPress={stopMeasuring}>
                <Ionicons name="stop" size={18} color="#fff" />
                <Text style={styles.stopButtonText}>{t('puckSpeed.stop') || 'Остановить'}</Text>
              </TouchableOpacity>
              
              {speedResults.length > 0 && (
                <TouchableOpacity style={styles.resetButton} onPress={resetResults}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.resetButtonText}>{t('puckSpeed.reset') || 'Сбросить'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}


          {/* Инструкция (показываем когда открыта) */}
          {showInstructions && (
            <View style={styles.instructions}>
              <View style={styles.instructionsHeader}>
                <Text style={styles.instructionsTitle}>{t('puckSpeed.instructions') || 'Инструкция:'}</Text>
                <TouchableOpacity 
                  onPress={() => setShowInstructions(false)} 
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionWarningText}>{t('puckSpeed.instructionWarning') || 'Внимание! Точная скорость гарантируется только при отсутствии посторонних звуков и при использовании 2 микрофонов-петличек. Пожалуйста, записывайте в результаты только корректную скорость!'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>1</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction1') || 'Измерьте расстояние от сетки до места удара и выставьте ее в поле расстояния'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>2</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction2') || 'Поставьте телефон равноудаленно от места удара по шайбе и от ворот или разместите одну петличку возле места удара, а вторую закрепите в безопасном месте на сетке'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>3</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction3') || 'Ударьте по шайбе - радар считает время удара и попадания в ворота и рассчитает скорость'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>4</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction4') || 'Совершите несколько попыток - выберите корректную скорость и добавьте ее в профиль'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>5</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction5') || 'Отрегулируйте чувствительность, если скорость рассчитана неверно.'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>6</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction6') || 'Выберите корректную и лучшую скорость для внесения в профиль'}</Text>
              </View>
            </View>
          )}
        </View>
      </CachedBackground>
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onConfirm={() => {
          setAlert({ ...alert, visible: false });
          if (alert.onConfirm) alert.onConfirm();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa2f40',
    borderRadius: 13,
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'left',
  },
  radarTitleContainer: {
    position: 'absolute',
    top: 70, // Поднято на 10px выше (было 80)
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  radarTitleBackground: {
    backgroundColor: 'rgba(250, 47, 64, 0.9)',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
    gap: 10,
  },
  radarTitle: {
    fontSize: 34,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  statusContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
    marginBottom: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  readyStatusText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginTop: 10, // Опущено еще на 3px (было 7)
    marginBottom: 10,
    opacity: 0.9,
  },
  amplitudeBarContainer: {
    position: 'absolute',
    top: 112, // Опущено еще на 2px (было 110)
    left: '50%',
    marginLeft: -150, // Сдвинуто влево, чтобы начиналась на уровне буквы H
    alignItems: 'flex-start', // Выравнивание по левому краю
    zIndex: 51, // Выше названия
  },
  amplitudeText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'center',
  },
  amplitudeBar: {
    width: 300, // Уже (было 100%) - полоска громкости уже
    height: 6, // Немного тоньше (было 8)
    backgroundColor: 'rgba(255,255,255,0.15)', // Более темный оттенок (было 0.2)
    borderRadius: 3,
    overflow: 'hidden',
  },
  amplitudeBarFill: {
    height: '100%',
    backgroundColor: '#d02030', // Более темный оттенок красного (было #fa2f40)
    borderRadius: 4,
  },
  soundButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  soundButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  soundButtonFirst: {
    backgroundColor: '#4CAF50',
  },
  soundButtonSecond: {
    backgroundColor: '#FF9800',
  },
  soundButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 15,
  },
  soundButtonSubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    opacity: 0.9,
  },
  latestResult: {
    marginTop: 114, // Уменьшено примерно в 1.3 раза (было 150), чтобы не наезжать на название
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 150,
  },
  sensitivityContainerCompact: {
    marginTop: 8, // Уменьшено (было 15)
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4, // Уменьшено (было 8)
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 0,
  },
  sensitivityLabelCompact: {
    color: '#fff',
    fontSize: 11, // Уменьшено (было 12)
    fontFamily: 'Gilroy-Bold',
    marginBottom: 4, // Уменьшено (было 6)
    textAlign: 'center',
  },
  sliderContainerCompact: {
    position: 'relative',
    height: 24, // Уменьшено (было 30) для компактности
    justifyContent: 'center',
  },
  sliderTrackCompact: {
    height: 4, // Уменьшено (было 6) для компактности
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
    width: '100%',
  },
  sliderFillCompact: {
    height: '100%',
    backgroundColor: '#fa2f40',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumbCompact: {
    width: 14, // Уменьшено (было 16) для компактности
    height: 14, // Уменьшено (было 16) для компактности
    borderRadius: 7,
    backgroundColor: '#fa2f40',
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    top: -5, // Скорректировано под новую высоту трека
    marginLeft: -7, // Скорректировано под новый размер
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  sliderTouchableCompact: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
  },
  resultTitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 10,
  },
  speedContainer: {
    width: '100%',
    marginBottom: 0,
  },
  speedBox: {
    width: '100%',
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderWidth: 4,
    borderColor: '#fa2f40',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#fa2f40',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden', // Для эффекта подсветки
    position: 'relative', // Для позиционирования подсветки
  },
  speedBoxHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  speedValue: {
    fontSize: 180,
    fontFamily: 'DigifaceRegular',
    color: '#fa2f40',
    marginBottom: 0, // Убрано для приближения "км/ч" к числу (было 5)
  },
  speedUnit: {
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginTop: -8, // Уменьшен отступ сверху для приближения к числу
    marginBottom: -5, // Уменьшен отступ снизу
  },
  resultDetails: {
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  detailText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginVertical: 5,
  },
  historyContainer: {
    marginTop: 10, // Уменьшено (было 20) - чтобы таблица начиналась выше
    marginHorizontal: 20,
    marginBottom: 60, // Уменьшено (было 80) - больше места для таблицы
    padding: 12, // Уменьшено (было 15) - еще компактнее
    flex: 1,
    maxHeight: '65%', // Увеличено (было 60%) - больше места для таблицы
    zIndex: 50,
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  historyTitle: {
    fontSize: 12, // Уменьшено (было 14) - еще компактнее
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 6, // Уменьшено (было 8)
    marginTop: 3, // Уменьшено (было 5)
  },
  historyTitleSecondary: {
    marginTop: 8, // Уменьшено (было 12)
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 6, // Уменьшено (было 8) - еще компактнее
    borderRadius: 6, // Уменьшено (было 8)
    marginBottom: 4, // Уменьшено (было 6)
  },
  recordHistoryItem: {
    backgroundColor: 'rgba(250, 47, 64, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.5)',
  },
  historySpeed: {
    color: '#fff',
    fontSize: 12, // Уменьшено (было 13) - еще компактнее
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  addToProfileButton: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 8, // Уменьшено (было 10)
    paddingVertical: 4, // Уменьшено (было 5)
    borderRadius: 4, // Уменьшено (было 5)
    marginLeft: 6, // Уменьшено (было 8)
  },
  addToProfileButtonText: {
    color: '#fff',
    fontSize: 10, // Уменьшено (было 11)
    fontFamily: 'Gilroy-Bold',
  },
  buttonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 200, // Фиксированная позиция, не зависит от результатов
    zIndex: 100,
  },
  distanceBlockContainer: {
    backgroundColor: 'transparent',
    width: '100%',
    marginTop: -30, // Опускаем на 30px ниже (было -60)
    marginBottom: 50, // Отступ снизу до кнопки старт
    alignItems: 'center',
  },
  distanceInputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  distanceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fa2f40',
    paddingRight: 15,
  },
  distanceInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#000',
    fontSize: 31,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  distanceInputSuffix: {
    color: '#fff',
    fontSize: 31,
    fontFamily: 'Gilroy-Regular',
    marginRight: 10,
  },
  distanceSliderWrapper: {
    width: '80%',
    alignItems: 'center',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
  },
  sliderContainer: {
    width: 280,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 3,
    width: '100%',
  },
  sliderThumb: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: '#fa2f40',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
  },
  sliderValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(1, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: '#fa2f40',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sliderValue: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Gilroy-Bold',
    marginRight: 8,
  },
  distanceLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    marginTop: 10,
    marginBottom: 0,
    textAlign: 'center',
  },
  instructionHintContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  instructionHintText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginRight: 8,
  },
  instructionHintButton: {
    padding: 4,
  },
  buttonShadow: {
    width: 225,
    height: 225,
    borderRadius: 112.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 15,
    marginTop: -20,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa2f40',
    borderWidth: 4,
    borderColor: '#000',
    width: 225,
    height: 225,
    borderRadius: 112.5,
    overflow: 'hidden',
  },
  buttonHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopLeftRadius: 112.5,
    borderTopRightRadius: 112.5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 151,
    height: 151,
    marginTop: -15,
    marginLeft: 15,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    marginTop: -20,
    textAlign: 'center',
  },
  sensitivityContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 2,
    borderColor: '#fa2f40',
    zIndex: 200,
  },
  sensitivityLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  sensitivityLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sensitivityLabelSmall: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
  controls: {
    position: 'absolute',
    bottom: 10, // Уменьшено (было 20) - ближе к краю
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10, // Уменьшено (было 15)
    zIndex: 200,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fa2f40',
    paddingHorizontal: 20, // Уменьшено (было 30)
    paddingVertical: 8, // Уменьшено (было 15) - тоньше
    borderRadius: 20,
    gap: 6, // Уменьшено (было 10)
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 13, // Уменьшено (было 16)
    fontWeight: 'bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderWidth: 1.5, // Уменьшено (было 2)
    borderColor: '#fa2f40',
    paddingHorizontal: 15, // Уменьшено (было 20)
    paddingVertical: 8, // Уменьшено (было 15) - тоньше
    borderRadius: 20,
    gap: 5, // Уменьшено (было 8)
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 13, // Уменьшено (было 16)
    fontFamily: 'Gilroy-Bold',
  },
  instructions: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fa2f40',
    zIndex: 300,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  instructionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  numberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fa2f40',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  numberText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  instructionWarningText: {
    color: '#ff6b7a',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    lineHeight: 18,
    textAlign: 'left',
    marginBottom: 10,
  },
  instructionItemText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 16,
    flex: 1,
  },
  text: {
    fontSize: 16,
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
