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
  AppState,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
// Пробуем разные способы импорта для совместимости с production
import AudioRecorderPlayerModule from 'react-native-audio-recorder-player';
import CachedBackground from '../components/CachedBackground';
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
  
  // Expo AV Recording refs (альтернатива для iOS с метерингом)
  const expoRecordingRef = useRef<Audio.Recording | null>(null);
  const expoMeteringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const isAnalyzingRef = useRef(false);
  const soundEventsRef = useRef<SoundEvent[]>([]); // Ref для синхронного доступа
  const recordingStartTimeRef = useRef<number | null>(null); // Время начала записи
  const previousAmplitudeRef = useRef<number>(0); // Предыдущая амплитуда для детекции пиков
  const isMeasuringRef = useRef<boolean>(false); // Ref для синхронной проверки isMeasuring
  const soundTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Таймаут ожидания второго звука
  
  // State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [soundEvents, setSoundEvents] = useState<SoundEvent[]>([]);
  const [speedResults, setSpeedResults] = useState<SpeedResult[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>(initialStatus);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentAmplitude, setCurrentAmplitude] = useState(0);
  const [distanceCm, setDistanceCm] = useState<string>('500'); // Расстояние в см (по умолчанию 5м = 500см)
  const [showInstructions, setShowInstructions] = useState(false); // Показывать ли инструкцию
  const [sensitivity, setSensitivity] = useState(30); // Чувствительность (0-100, по умолчанию 30)
  const prevSpeedResultsLengthRef = useRef(0); // Для отслеживания появления новых результатов
  const blinkAnim = useRef(new Animated.Value(1)).current; // Анимация мигания для радара
  const sliderWidthRef = useRef<number>(300); // Ширина слайдера для вычислений
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
  
  // Параметры
  // Минимальное время между звуками: для расстояния 5м и максимальной скорости 130 км/ч (36.11 м/с)
  // минимальное время = 5м / 36.11 м/с = 0.1386с = 138.6мс
  // Добавляем запас для погрешности измерений: 150мс
  const MIN_TIME_BETWEEN_SOUNDS_MS = 150; // Минимальное время между звуками (150мс) для валидации
  const MAX_SPEED_KMH = 130; // Максимальная скорость 130 км/ч
  // Расстояние конвертируем из см в метры
  const distanceMeters = parseFloat(distanceCm) / 100 || 5; // По умолчанию 5м если не указано
  const DEBOUNCE_MS = 400; // Debounce для предотвращения ложных срабатываний (увеличено до 400мс для предотвращения двойной детекции)
  
  // Ref для отслеживания времени последней детекции звука
  const lastSoundDetectionTimeRef = useRef<number>(0);
  // Ref для отслеживания времени последнего расчета скорости (чтобы не детектировать сразу после расчета)
  const lastSpeedCalculationTimeRef = useRef<number>(0);
  const COOLDOWN_AFTER_SPEED_MS = 1000; // Период покоя после расчета скорости (1000мс = 1сек) - увеличен для предотвращения ложных срабатываний
  
  // Вычисляем пороги на основе чувствительности (0 = менее чувствительный, 100 = более чувствительный)
  // VOLUME_THRESHOLD: от 180 (нечувствительный) до 120 (очень чувствительный) - снижены для увеличения чувствительности
  // Чем больше чувствительность, тем меньше порог громкости
  const VOLUME_THRESHOLD = React.useMemo(() => {
    return 180 - (sensitivity * 0.6); // 180 до 120 - снижены для увеличения чувствительности
  }, [sensitivity]);
  
  // PEAK_DETECTION_THRESHOLD: от 100 (нечувствительный) до 50 (очень чувствительный) - снижены для увеличения чувствительности
  const PEAK_DETECTION_THRESHOLD = React.useMemo(() => {
    return 100 - (sensitivity * 0.5); // 100 до 50 - снижены для увеличения чувствительности
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
        Alert.alert('Ошибка', 'Не удалось инициализировать микрофон. Проверьте разрешения.');
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
    if (!isIOS || !hasPermission) return;

    const initializeIOSAudio = async () => {
      try {
        const logMsg = '🔧 [iOS] Инициализируем AudioRecorderPlayer...';
        console.log(logMsg);
        
        // Проверяем, как экспортируется модуль в production
        const AudioRecorderPlayer = AudioRecorderPlayerModule;
        console.log('📦 [iOS] Тип AudioRecorderPlayerModule:', typeof AudioRecorderPlayerModule);
        console.log('📦 [iOS] AudioRecorderPlayerModule:', AudioRecorderPlayerModule);
        const moduleAny = AudioRecorderPlayerModule as any;
        console.log('📦 [iOS] AudioRecorderPlayerModule.default:', moduleAny.default);
        console.log('📦 [iOS] Ключи AudioRecorderPlayerModule:', Object.keys(AudioRecorderPlayerModule || {}));
        
        let audioRecorderPlayer: any = null;
        
        // Пробуем разные способы создания экземпляра
        if (typeof AudioRecorderPlayerModule === 'function') {
          // Если это функция/класс, создаем через new
          console.log('✅ [iOS] AudioRecorderPlayerModule - это функция, создаем через new');
          audioRecorderPlayer = new AudioRecorderPlayerModule();
        } else if (AudioRecorderPlayerModule && typeof AudioRecorderPlayerModule === 'object') {
          // Если это объект, проверяем default
          const moduleAny = AudioRecorderPlayerModule as any;
          if (moduleAny.default && typeof moduleAny.default === 'function') {
            console.log('✅ [iOS] Используем AudioRecorderPlayerModule.default как функцию');
            audioRecorderPlayer = new moduleAny.default();
          } else if (moduleAny.default && typeof moduleAny.default === 'object') {
            // Возможно, default уже является экземпляром
            console.log('✅ [iOS] AudioRecorderPlayerModule.default - это объект, используем напрямую');
            audioRecorderPlayer = moduleAny.default;
          } else {
            // Возможно, сам модуль уже является экземпляром
            console.log('✅ [iOS] AudioRecorderPlayerModule - это объект, используем напрямую');
            audioRecorderPlayer = AudioRecorderPlayerModule;
          }
        } else {
          throw new Error(`Неожиданный тип AudioRecorderPlayerModule: ${typeof AudioRecorderPlayerModule}`);
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
        audioRecorderPlayerRef.current.removeRecordBackListener();
        recordBackListenerRef.current = null;
      }
      if (audioRecorderPlayerRef.current) {
        audioRecorderPlayerRef.current.stopRecorder().catch(() => {});
        audioRecorderPlayerRef.current = null;
      }
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
        soundTimeoutRef.current = null;
      }
    };
  }, [isIOS, hasPermission]);

  // Обновляем ref при изменении soundEvents
  useEffect(() => {
    soundEventsRef.current = soundEvents;
  }, [soundEvents]);

  // Обновляем ref при изменении isMeasuring
  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
  }, [isMeasuring]);

  // Обработка обнаруженного звука (автоматически для веб, вручную для мобильного)
  const handleSoundDetected = useCallback((timestamp: number, amplitude: number) => {
    // Используем ref для синхронного доступа к текущим событиям
    const currentEvents = soundEventsRef.current;
    
    setSoundEvents(prev => {
      // Используем ref если состояние еще не обновилось (для быстрых последовательных звуков)
      const baseEvents = prev.length > 0 ? prev : currentEvents;
      
      const newEvent: SoundEvent = {
        timestamp: timestamp,
        amplitude: amplitude,
      };

      const updatedEvents = [...baseEvents, newEvent];
      
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
            setCurrentStatus((isWeb || isIOS) ? (t('puckSpeed.analyzing') || '🎤 Анализирую звук...') : (t('puckSpeed.readyForSound') || 'Готов к первому звуку...'));
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

        // ВАЖНО: Проверяем минимальное время для фильтрации двойной детекции
        // Интервалы < 120мс обычно означают, что один звук детектируется дважды
        // Реальные удары обычно имеют интервал > 120мс (для расстояния 5м и скорости до 130 км/ч)
        const MIN_TIME_TO_FILTER_DOUBLE_DETECTION = 120; // Минимальный интервал для валидного измерения (120мс)
        
        // Дополнительная проверка: если интервал очень короткий (< 150мс) И амплитуды очень похожи - это двойная детекция
        const firstSoundAmplitude = updatedEvents[0].amplitude * 255;
        const secondSoundAmplitude = newEvent.amplitude * 255;
        const amplitudeDifference = Math.abs(firstSoundAmplitude - secondSoundAmplitude);
        const isSimilarAmplitude = amplitudeDifference < 30; // Разница менее 30 - очень похожие амплитуды
        
        if (timeDiffMs < MIN_TIME_TO_FILTER_DOUBLE_DETECTION || (timeDiffMs < 150 && isSimilarAmplitude)) {
          console.log(`⚠️ Время между звуками слишком короткое (${timeDiffMs.toFixed(0)}мс < ${MIN_TIME_TO_FILTER_DOUBLE_DETECTION}мс) или похожие амплитуды (разница: ${amplitudeDifference.toFixed(1)}), вероятно один звук детектирован дважды - игнорируем`);
          setCurrentStatus(t('puckSpeed.invalidMeasurement') || '⚠️ Слишком быстро, попробуйте еще раз');
          
          // Очищаем таймаут
          if (soundTimeoutRef.current) {
            clearTimeout(soundTimeoutRef.current);
            soundTimeoutRef.current = null;
          }
          
          // Сбрасываем события для следующего измерения
          soundEventsRef.current = [];
          previousAmplitudeRef.current = 0;
          lastSoundDetectionTimeRef.current = 0;
          return [];
        }
        
        // Проверяем качество звуков для дополнительной фильтрации фоновых звуков
        const MIN_AMPLITUDE_FOR_VALID_SOUND = 140; // Минимальная амплитуда для валидного звука (из 255) - снижена для увеличения чувствительности
        // Амплитуды уже вычислены выше
        
        // Проверяем, что оба звука имеют достаточную амплитуду (признак реального удара)
        const bothSoundsValid = firstSoundAmplitude >= MIN_AMPLITUDE_FOR_VALID_SOUND && 
                                secondSoundAmplitude >= MIN_AMPLITUDE_FOR_VALID_SOUND;
        
        // Если звуки слишком тихие, это вероятно фоновый шум
        if (!bothSoundsValid) {
          console.log(`⚠️ Один или оба звука слишком тихие (${firstSoundAmplitude.toFixed(1)}, ${secondSoundAmplitude.toFixed(1)} < ${MIN_AMPLITUDE_FOR_VALID_SOUND}), игнорируем как фоновый шум`);
          setCurrentStatus(t('puckSpeed.invalidMeasurement') || '⚠️ Слишком тихо, попробуйте еще раз');
          
          // Очищаем таймаут
          if (soundTimeoutRef.current) {
            clearTimeout(soundTimeoutRef.current);
            soundTimeoutRef.current = null;
          }
          
          // Сбрасываем события для следующего измерения
          soundEventsRef.current = [];
          previousAmplitudeRef.current = 0;
          lastSoundDetectionTimeRef.current = 0;
          return [];
        }

        if (timeDiffSeconds > 0) {
          const speedMs = distanceMeters / timeDiffSeconds;
          const speedKmh = speedMs * 3.6;
          
          // Проверка: если скорость больше 130 км/ч, не сохраняем результат
          if (speedKmh > MAX_SPEED_KMH) {
            console.log(`⚠️ Скорость ${speedKmh.toFixed(2)} км/ч превышает лимит ${MAX_SPEED_KMH} км/ч, результат не сохранен`);
            setCurrentStatus(t('puckSpeed.speedExceedsLimit') || `⚠️ Скорость превышает ${MAX_SPEED_KMH} км/ч, измерение не засчитано`);
            
            // Очищаем таймаут
            if (soundTimeoutRef.current) {
              clearTimeout(soundTimeoutRef.current);
              soundTimeoutRef.current = null;
            }
            
            // Сбрасываем события для следующего измерения
            soundEventsRef.current = [];
            previousAmplitudeRef.current = 0;
            lastSoundDetectionTimeRef.current = 0;
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
  }, [distanceMeters, MIN_TIME_BETWEEN_SOUNDS_MS, MAX_SPEED_KMH, t, isWeb, isIOS]);

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
        console.log(`📊 Амплитуда: ${averageAmplitude.toFixed(1)}/${VOLUME_THRESHOLD.toFixed(1)}, событий: ${currentEvents.length}/2, громкость: ${(averageAmplitude / 255 * 100).toFixed(1)}%`);
      }

      // Детекция пика: резкий скачок амплитуды (более точная детекция)
      const amplitudeJump = averageAmplitude - previousAmplitudeRef.current;
      
      // Для первого звука нужен резкий скачок, для второго - более мягкое условие
      const isFirstSound = currentEvents.length === 0;
      const isSecondSound = currentEvents.length === 1;
      
      // Для первого звука: требуем ОБЯЗАТЕЛЬНО резкий скачок И высокую амплитуду
      // Это фильтрует фоновую музыку и обычные звуки (которые обычно более плавные)
      const MIN_AMPLITUDE_JUMP_WEB = 50; // Минимальный скачок для первого звука - снижен с 60 для увеличения чувствительности
      const MIN_AMPLITUDE_JUMP_SECOND_WEB = 30; // Сниженный порог для второго звука - снижен с 35
      const MIN_AMPLITUDE_FOR_DETECTION_WEB = 140; // Минимальная амплитуда для детекции - снижена с 150
      
      const firstSoundDetected = isFirstSound && (
        averageAmplitude >= MIN_AMPLITUDE_FOR_DETECTION_WEB && // Высокая амплитуда
        amplitudeJump > PEAK_DETECTION_THRESHOLD && // ОБЯЗАТЕЛЬНО резкий скачок
        averageAmplitude > VOLUME_THRESHOLD && // И высокая амплитуда
        amplitudeJump > MIN_AMPLITUDE_JUMP_WEB
      );
      
      // Для второго звука (гол): используем более мягкие условия для детекции быстрых звуков
      // Если амплитуда высокая, то даже небольшой скачок может быть реальным ударом
      const secondSoundDetected = isSecondSound && 
        averageAmplitude >= MIN_AMPLITUDE_FOR_DETECTION_WEB && // Высокая амплитуда
        averageAmplitude > VOLUME_THRESHOLD && 
        (amplitudeJump > PEAK_DETECTION_THRESHOLD || amplitudeJump > MIN_AMPLITUDE_JUMP_SECOND_WEB); // ИЛИ для более чувствительной детекции
      
      const isPeak = firstSoundDetected || secondSoundDetected;
      
      // Обновляем предыдущую амплитуду плавно (с затуханием), чтобы не пропустить второй звук
      // Если звук обнаружен, не обновляем сразу - это поможет зафиксировать второй звук
      if (!isPeak) {
        // Плавное обновление с затуханием (если амплитуда падает, обновляем быстрее)
        if (averageAmplitude < previousAmplitudeRef.current) {
          previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmplitudeRef.current * 0.3; // Быстрое затухание
        } else {
          previousAmplitudeRef.current = averageAmplitude; // Обычное обновление
        }
      } else {
        // Если звук обнаружен, обновляем предыдущую амплитуду
        // Для первого звука сбрасываем еще сильнее (до 30%), чтобы второй звук легче детектировался даже если он быстрый
        // Для второго звука сбрасываем почти полностью для следующего измерения
        if (isFirstSound) {
          previousAmplitudeRef.current = averageAmplitude * 0.3; // Снижено для лучшей детекции быстрого второго звука
        } else {
          previousAmplitudeRef.current = averageAmplitude * 0.3; // Почти сбрасываем после второго звука
        }
      }

      // Если обнаружен пик, и ещё нет 2 пиков
      if (isPeak && currentEvents.length < 2) {
        // Используем Date.now() относительно времени начала записи для точности
        const nowMs = Date.now();

        // Debounce: проверяем время последней детекции для предотвращения двойной детекции
        const timeSinceLastDetection = nowMs - lastSoundDetectionTimeRef.current;
        const isFirstSound = currentEvents.length === 0;
        const isSecondSound = currentEvents.length === 1;
        
        // Применяем debounce для обоих звуков
        let shouldIgnore = false;
        if (isFirstSound) {
          if (timeSinceLastDetection < DEBOUNCE_MS) {
            shouldIgnore = true;
            console.log(`⏸️ [Web] Первый звук игнорирован (слишком близко к предыдущему: ${timeSinceLastDetection.toFixed(0)}мс)`);
          }
        } else if (isSecondSound) {
          // Для второго звука используем более длинный debounce (120мс)
          const SECOND_SOUND_DEBOUNCE_MS = 120;
          if (timeSinceLastDetection < SECOND_SOUND_DEBOUNCE_MS) {
            shouldIgnore = true;
            console.log(`⏸️ [Web] Второй звук игнорирован (слишком близко к предыдущему: ${timeSinceLastDetection.toFixed(0)}мс)`);
          }
        }
        
        if (!shouldIgnore) {
          // Обновляем время последней детекции
          lastSoundDetectionTimeRef.current = nowMs;
          
          // Синхронно обновляем ref перед вызовом handleSoundDetected для второго звука
          if (isSecondSound) {
            soundEventsRef.current = [...currentEvents];
          }
          
          const soundMsg = `🔊 [Web] Звук ${currentEvents.length + 1}: ампл=${averageAmplitude.toFixed(1)}, скачок=${amplitudeJump.toFixed(1)}`;
          console.log(`🔊 Обнаружен звук ${currentEvents.length + 1}: амплитуда=${averageAmplitude.toFixed(1)}, скачок=${amplitudeJump.toFixed(1)}, время=${nowMs}`);
          handleSoundDetected(nowMs, averageAmplitude / 255);
        }
      }

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
  }, [isWeb, isMeasuring, handleSoundDetected, VOLUME_THRESHOLD, PEAK_DETECTION_THRESHOLD]);

  // Цикл анализа для iOS (AudioRecorderPlayer)
  useEffect(() => {
    if (!isIOS || !hasPermission) return;
    
    if (!audioRecorderPlayerRef.current) {
      return; // AudioRecorderPlayer еще не готов
    }
    
    if (!isMeasuring) {
      // Если измерение остановлено, останавливаем анализ
      isAnalyzingRef.current = false;
      if (recordBackListenerRef.current && audioRecorderPlayerRef.current) {
        try {
          (audioRecorderPlayerRef.current as any).removeRecordBackListener(recordBackListenerRef.current);
        } catch (e) {
          // Игнорируем ошибки при удалении слушателя
        }
        recordBackListenerRef.current = null;
      }
      if (audioRecorderPlayerRef.current) {
        audioRecorderPlayerRef.current.stopRecorder().catch(() => {});
      }
      return;
    }

    console.log(`🎤 Запускаем анализ звука (iOS AudioRecorderPlayer), чувствительность: ${sensitivity}%, порог громкости: ${VOLUME_THRESHOLD.toFixed(1)}, порог скачка: ${PEAK_DETECTION_THRESHOLD.toFixed(1)}`);
      isAnalyzingRef.current = true;
      recordingStartTimeRef.current = Date.now();
      previousAmplitudeRef.current = 0; // ВАЖНО: сбрасываем предыдущую амплитуду при старте

    const startIOSRecording = async () => {
      try {
        console.log('📹 [iOS] Используем expo-av для записи с метерингом...');
        
        // Настраиваем аудиосессию для записи
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
          });
          console.log('✅ [iOS] Аудиосессия настроена');
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (audioModeError) {
          console.warn(`⚠️ [iOS] Ошибка настройки аудиосессии: ${audioModeError instanceof Error ? audioModeError.message : String(audioModeError)}`);
        }
        
        // Используем expo-av для записи с метерингом
        try {
          const { status } = await Audio.requestPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('Разрешение на запись не предоставлено');
          }
          
          // Создаем новый Recording
          const recording = new Audio.Recording();
          expoRecordingRef.current = recording;
          
          // Настраиваем и запускаем запись с метерингом
          await recording.prepareToRecordAsync({
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true, // ВАЖНО: включаем метеринг
          });
          await recording.startAsync();
          
          console.log('✅ [iOS] Запись начата через expo-av с метерингом');
          
          // Запускаем цикл опроса метеринга
          let meteringCallCount = 0;
          expoMeteringIntervalRef.current = setInterval(async () => {
            try {
              if (!expoRecordingRef.current || !isAnalyzingRef.current || !isMeasuringRef.current) {
                return;
              }
              
              const status = await expoRecordingRef.current.getStatusAsync();
              meteringCallCount++;
              
              // Логируем первые 20 вызовов
              if (meteringCallCount <= 20) {
                console.log(`📊 [iOS] Expo AV метринг #${meteringCallCount}:`, JSON.stringify({
                  isRecording: status.isRecording,
                  durationMillis: status.durationMillis,
                  metering: status.metering,
                  canRecord: status.canRecord,
                }));
              } else if (meteringCallCount % 50 === 0) {
                console.log(`📊 [iOS] Expo AV метринг работает (#${meteringCallCount}), metering=${status.metering ?? 'N/A'}`);
              }
              
              if (!status.isRecording) {
                return;
              }
              
              // Получаем метринг из статуса
              let averageAmplitude = 0;
              
              if (status.metering !== undefined && status.metering !== null && status.metering > -160) {
                // Expo AV возвращает метринг в децибелах (-160 до 0)
                // -120 и ниже обычно означает тишину, но мы все равно обрабатываем
                const db = status.metering;
                // Нормализуем от -120 (тишина) до 0 (максимум)
                const normalizedDb = Math.max(-120, Math.min(0, db));
                // Конвертируем в амплитуду 0-255, где -120 = 0, 0 = 255
                averageAmplitude = Math.max(0, Math.min(255, ((normalizedDb + 120) / 120) * 255));
              } else if (status.metering === null || status.metering === undefined) {
                // Если метринг недоступен, возможно запись остановилась
                if (meteringCallCount <= 10 || meteringCallCount % 50 === 0) {
                  console.warn(`⚠️ [iOS] Метеринг недоступен (${status.metering}), isRecording: ${status.isRecording}`);
                }
                // Не возвращаемся, продолжаем обновлять UI с 0
                averageAmplitude = 0;
              } else {
                // Метеринг <= -160, это очень тихо
                averageAmplitude = 0;
              }
              
              // Обновляем UI с текущей амплитудой (нормализуем к 0-1 для отображения)
              // Обновляем всегда, даже если амплитуда 0, чтобы индикатор работал
              setCurrentAmplitude(averageAmplitude / 255);
              
              // Получаем предыдущую амплитуду ДО вычисления скачка
              const previousAmp = previousAmplitudeRef.current;
              
              // Детекция звука
              const volumeThreshold = volumeThresholdRef.current;
              const peakDetectionThreshold = peakDetectionThresholdRef.current;
              const amplitudeJump = averageAmplitude - previousAmp;
              
              // Debounce: проверяем время последней детекции
              const currentTime = Date.now();
              const timeSinceLastDetection = currentTime - lastSoundDetectionTimeRef.current;
              const timeSinceLastSpeedCalc = currentTime - lastSpeedCalculationTimeRef.current;
              
              // Получаем текущие события для определения, какой это звук
              const currentEvents = soundEventsRef.current;
              const isFirstSound = currentEvents.length === 0;
              const isSecondSound = currentEvents.length === 1;
              
              // Проверяем период покоя после расчета скорости для обоих звуков
              if (timeSinceLastSpeedCalc < COOLDOWN_AFTER_SPEED_MS) {
                if (averageAmplitude < previousAmp) {
                  previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmp * 0.3;
                } else {
                  previousAmplitudeRef.current = averageAmplitude;
                }
                return;
              }
              
              // Применяем debounce для обоих звуков, чтобы предотвратить двойную детекцию одного звука
              // Для первого звука - стандартный debounce
              // Для второго звука - более короткий debounce, но все равно нужен для предотвращения двойной детекции
              if (isFirstSound) {
                if (timeSinceLastDetection < DEBOUNCE_MS) {
                  if (averageAmplitude < previousAmp) {
                    previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmp * 0.3;
                  } else {
                    previousAmplitudeRef.current = averageAmplitude;
                  }
                  return;
                }
              } else if (isSecondSound) {
                // Для второго звука используем более длинный debounce (120мс)
                // Это предотвращает двойную детекцию одного звука
                // Реальные вторые звуки обычно происходят через > 120мс после первого
                const SECOND_SOUND_DEBOUNCE_MS = 120; // Debounce для второго звука
                if (timeSinceLastDetection < SECOND_SOUND_DEBOUNCE_MS) {
                  if (averageAmplitude < previousAmp) {
                    previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmp * 0.3;
                  } else {
                    previousAmplitudeRef.current = averageAmplitude;
                  }
                  return;
                }
              }
              
              // Используем ОБА условия (И, а не ИЛИ) для более строгой детекции
              // Требуем и высокую амплитуду, И резкий скачок
              const isAboveVolumeThreshold = averageAmplitude > volumeThreshold;
              const isPeakDetection = amplitudeJump > peakDetectionThreshold;
              
              // Минимальный скачок для детекции - снижены для увеличения чувствительности
              const MIN_AMPLITUDE_JUMP = 50; // Минимальный скачок для первого звука (бросок) - снижен с 60
              // Для второго звука используем более низкий порог, так как предыдущая амплитуда может быть высокой
              // и скачок может быть меньше из-за того, что первый звук еще "звучит"
              const MIN_AMPLITUDE_JUMP_SECOND = 30; // Сниженный порог для второго звука (гол) - снижен с 35
              
              // Минимальная амплитуда для валидного звука (для фильтрации фоновых звуков) - снижена для увеличения чувствительности
              const MIN_AMPLITUDE_FOR_DETECTION = 140; // Минимальная амплитуда из 255 для детекции - снижена с 150
              
              // Для первого звука: требуем высокую амплитуду И резкий скачок И минимальный скачок
              // Это гарантирует, что детектируются только реальные удары, а не фоновые звуки
              const firstSoundDetected = isFirstSound && 
                averageAmplitude >= MIN_AMPLITUDE_FOR_DETECTION && // Высокая амплитуда
                isAboveVolumeThreshold && 
                isPeakDetection && 
                amplitudeJump > MIN_AMPLITUDE_JUMP;
              
              // Для второго звука: используем более мягкие условия для детекции быстрых звуков
              // Если амплитуда высокая, то даже небольшой скачок может быть реальным ударом
              // (так как предыдущая амплитуда может быть высокой после первого звука)
              const secondSoundDetected = isSecondSound && 
                averageAmplitude >= MIN_AMPLITUDE_FOR_DETECTION && // Высокая амплитуда
                isAboveVolumeThreshold && 
                (isPeakDetection || amplitudeJump > MIN_AMPLITUDE_JUMP_SECOND); // ИЛИ для более чувствительной детекции
              
              if (firstSoundDetected || secondSoundDetected) {
                const recordingStartTime = recordingStartTimeRef.current || currentTime;
                const relativeTime = currentTime - recordingStartTime;
                
                // Обновляем время последней детекции
                lastSoundDetectionTimeRef.current = currentTime;
                
                console.log(`🔊 [iOS] Звук обнаружен! Время: ${relativeTime}мс, Амплитуда: ${averageAmplitude.toFixed(1)}, Скачок: ${amplitudeJump.toFixed(1)}`);
                
                // Синхронно обновляем ref перед вызовом handleSoundDetected для второго звука
                if (isSecondSound) {
                  soundEventsRef.current = [...currentEvents];
                }
                
                handleSoundDetected(relativeTime, averageAmplitude);
                
                // Обновляем предыдущую амплитуду после детекции
                // Для первого звука сбрасываем еще сильнее (до 30%), чтобы второй звук легче детектировался даже если он быстрый
                // Для второго звука сбрасываем почти полностью для следующего измерения
                if (isFirstSound) {
                  previousAmplitudeRef.current = averageAmplitude * 0.3; // Снижено с 0.4 для лучшей детекции быстрого второго звука
                } else {
                  previousAmplitudeRef.current = averageAmplitude * 0.3; // Почти сбрасываем после второго звука
                }
              } else {
                // Обновляем предыдущую амплитуду плавно, если звук не обнаружен
                // Если ждем второй звук и амплитуда падает - сбрасываем быстрее для детекции второго звука
                if (isSecondSound && averageAmplitude < previousAmp) {
                  // Быстрое затухание для второго звука, чтобы он мог детектироваться даже если происходит быстро
                  previousAmplitudeRef.current = averageAmplitude * 0.5 + previousAmp * 0.5;
                } else if (averageAmplitude < previousAmp) {
                  previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmp * 0.3;
                } else {
                  previousAmplitudeRef.current = averageAmplitude;
                }
              }
            } catch (meteringError) {
              if (meteringCallCount <= 10) {
                console.warn(`⚠️ [iOS] Ошибка получения метеринга: ${meteringError instanceof Error ? meteringError.message : String(meteringError)}`);
              }
            }
          }, 100); // Опрашиваем каждые 100ms
          
          console.log('✅ [iOS] Цикл опроса метеринга запущен');
        } catch (expoError) {
          console.error(`❌ [iOS] Ошибка expo-av записи: ${expoError instanceof Error ? expoError.message : String(expoError)}`);
          throw expoError;
        }
      } catch (error) {
        const errorMsg = `❌ Ошибка записи: ${error instanceof Error ? error.message : String(error)}`;
        console.error('❌ Ошибка запуска записи на iOS:', error);
        if (error instanceof Error && error.stack) {
          const stackTrace = error.stack.substring(0, 150);
          console.error('Stack:', stackTrace);
        }
        Alert.alert(
          'Ошибка записи',
          `Не удалось запустить запись звука: ${error instanceof Error ? error.message : String(error)}. Проверьте разрешения на микрофон в настройках.`
        );
        isAnalyzingRef.current = false;
      }
    };

    startIOSRecording();

    return () => {
      isAnalyzingRef.current = false;
      
      // Останавливаем expo-av запись
      if (expoMeteringIntervalRef.current) {
        clearInterval(expoMeteringIntervalRef.current);
        expoMeteringIntervalRef.current = null;
      }
      if (expoRecordingRef.current) {
        expoRecordingRef.current.stopAndUnloadAsync().catch(() => {});
        expoRecordingRef.current = null;
      }
      
      // Останавливаем AudioRecorderPlayer (fallback)
      if (recordBackListenerRef.current && audioRecorderPlayerRef.current) {
        try {
          (audioRecorderPlayerRef.current as any).removeRecordBackListener(recordBackListenerRef.current);
        } catch (e) {
          // Игнорируем ошибки при удалении слушателя
        }
        recordBackListenerRef.current = null;
      }
      if (audioRecorderPlayerRef.current) {
        audioRecorderPlayerRef.current.stopRecorder().catch(() => {});
        audioRecorderPlayerRef.current = null;
      }
    };
  }, [isIOS, isMeasuring, handleSoundDetected, hasPermission]); // Убрали VOLUME_THRESHOLD и PEAK_DETECTION_THRESHOLD из зависимостей, используем ref

  // Обработчик AppState для перезапуска записи при возврате из фона
  useEffect(() => {
    if (!isIOS || !hasPermission) return;

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && isMeasuring) {
        // Приложение вернулось в активное состояние и измерение активно
        console.log('🔄 [AppState] Приложение вернулось из фона, проверяем запись...');
        
        // Небольшая задержка для стабилизации
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ВСЕГДА перезапускаем запись и интервал при возврате из фона
        // Это гарантирует работу даже после долгого неактивного состояния
        console.log('🔄 [AppState] Перезапускаем запись и интервал...');
        
        // Останавливаем старый интервал если есть
        if (expoMeteringIntervalRef.current) {
          clearInterval(expoMeteringIntervalRef.current);
          expoMeteringIntervalRef.current = null;
        }
        
        // Останавливаем старую запись если есть
        if (expoRecordingRef.current) {
          try {
            await expoRecordingRef.current.stopAndUnloadAsync();
          } catch (e) {
            // Игнорируем ошибки
          }
          expoRecordingRef.current = null;
        }
        
        // Перезапускаем запись
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
          });
          
          const recording = new Audio.Recording();
          expoRecordingRef.current = recording;
          
          await recording.prepareToRecordAsync({
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true,
          });
          await recording.startAsync();
          
          console.log('✅ [AppState] Запись перезапущена после возврата из фона');
          
          // Перезапускаем цикл опроса метеринга
          isAnalyzingRef.current = true;
          recordingStartTimeRef.current = Date.now();
          previousAmplitudeRef.current = 0;
          
          // Запускаем цикл опроса метеринга вручную
          let meteringCallCount = 0;
          expoMeteringIntervalRef.current = setInterval(async () => {
                  try {
                    if (!expoRecordingRef.current || !isAnalyzingRef.current || !isMeasuringRef.current) {
                      return;
                    }
                    
                    const status = await expoRecordingRef.current.getStatusAsync();
                    meteringCallCount++;
                    
                    if (!status.isRecording) {
                      return;
                    }
                    
                    // Получаем метринг из статуса
                    let averageAmplitude = 0;
                    
                    if (status.metering !== undefined && status.metering !== null && status.metering > -160) {
                      const db = status.metering;
                      const normalizedDb = Math.max(-120, Math.min(0, db));
                      averageAmplitude = Math.max(0, Math.min(255, ((normalizedDb + 120) / 120) * 255));
                    } else if (status.metering === null || status.metering === undefined) {
                      averageAmplitude = 0;
                    } else {
                      averageAmplitude = 0;
                    }
                    
                    setCurrentAmplitude(averageAmplitude / 255);
                    
                    const previousAmp = previousAmplitudeRef.current;
                    const volumeThreshold = volumeThresholdRef.current;
                    const peakDetectionThreshold = peakDetectionThresholdRef.current;
                    const amplitudeJump = averageAmplitude - previousAmp;
                    
                    const currentTime = Date.now();
                    const timeSinceLastDetection = currentTime - lastSoundDetectionTimeRef.current;
                    const timeSinceLastSpeedCalc = currentTime - lastSpeedCalculationTimeRef.current;
                    
                    const currentEvents = soundEventsRef.current;
                    const isFirstSound = currentEvents.length === 0;
                    const isSecondSound = currentEvents.length === 1;
                    
                    // Проверяем период покоя после расчета скорости для обоих звуков
                    if (timeSinceLastSpeedCalc < COOLDOWN_AFTER_SPEED_MS) {
                      if (averageAmplitude < previousAmp) {
                        previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmp * 0.3;
                      } else {
                        previousAmplitudeRef.current = averageAmplitude;
                      }
                      return;
                    }
                    
                    // Применяем debounce для обоих звуков
                    if (isFirstSound) {
                      if (timeSinceLastDetection < DEBOUNCE_MS) {
                        if (averageAmplitude < previousAmp) {
                          previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmp * 0.3;
                        } else {
                          previousAmplitudeRef.current = averageAmplitude;
                        }
                        return;
                      }
                    } else if (isSecondSound) {
                      // Для второго звука используем более длинный debounce (120мс)
                      const SECOND_SOUND_DEBOUNCE_MS = 120;
                      if (timeSinceLastDetection < SECOND_SOUND_DEBOUNCE_MS) {
                        if (averageAmplitude < previousAmp) {
                          previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmp * 0.3;
                        } else {
                          previousAmplitudeRef.current = averageAmplitude;
                        }
                        return;
                      }
                    }
                    
                    const isAboveVolumeThreshold = averageAmplitude > volumeThreshold;
                    const isPeakDetection = amplitudeJump > peakDetectionThreshold;
                    
                    const MIN_AMPLITUDE_JUMP = 50; // Для первого звука - снижен с 60 для увеличения чувствительности
                    const MIN_AMPLITUDE_JUMP_SECOND = 30; // Сниженный порог для второго звука - снижен с 35
                    const MIN_AMPLITUDE_FOR_DETECTION = 140; // Минимальная амплитуда для детекции - снижена с 150
                    
                    const firstSoundDetected = isFirstSound && 
                      averageAmplitude >= MIN_AMPLITUDE_FOR_DETECTION &&
                      isAboveVolumeThreshold && 
                      isPeakDetection && 
                      amplitudeJump > MIN_AMPLITUDE_JUMP;
                    
                    // Для второго звука используем более мягкие условия
                    const secondSoundDetected = isSecondSound && 
                      averageAmplitude >= MIN_AMPLITUDE_FOR_DETECTION &&
                      isAboveVolumeThreshold && 
                      (isPeakDetection || amplitudeJump > MIN_AMPLITUDE_JUMP_SECOND); // ИЛИ для более чувствительной детекции
                    
                    if (firstSoundDetected || secondSoundDetected) {
                      const recordingStartTime = recordingStartTimeRef.current || currentTime;
                      const relativeTime = currentTime - recordingStartTime;
                      
                      lastSoundDetectionTimeRef.current = currentTime;
                      
                      console.log(`🔊 [iOS] Звук обнаружен! Время: ${relativeTime}мс, Амплитуда: ${averageAmplitude.toFixed(1)}, Скачок: ${amplitudeJump.toFixed(1)}`);
                      
                      // Синхронно обновляем ref перед вызовом handleSoundDetected для второго звука
                      if (isSecondSound) {
                        soundEventsRef.current = [...currentEvents];
                      }
                      
                      handleSoundDetected(relativeTime, averageAmplitude);
                      
                      // Обновляем предыдущую амплитуду после детекции
                      if (isFirstSound) {
                        previousAmplitudeRef.current = averageAmplitude * 0.3; // Снижено для лучшей детекции быстрого второго звука
                      } else {
                        previousAmplitudeRef.current = averageAmplitude * 0.3; // Почти сбрасываем после второго звука
                      }
                    } else {
                      // Если ждем второй звук и амплитуда падает - сбрасываем быстрее
                      if (isSecondSound && averageAmplitude < previousAmp) {
                        previousAmplitudeRef.current = averageAmplitude * 0.5 + previousAmp * 0.5;
                      } else if (averageAmplitude < previousAmp) {
                        previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmp * 0.3;
                      } else {
                        previousAmplitudeRef.current = averageAmplitude;
                      }
                    }
                  } catch (meteringError) {
                    if (meteringCallCount <= 10) {
                      console.warn(`⚠️ [iOS] Ошибка получения метеринга: ${meteringError instanceof Error ? meteringError.message : String(meteringError)}`);
                    }
                  }
                }, 100);
                
                console.log('✅ [AppState] Цикл опроса метеринга перезапущен');
          } catch (restartError) {
            console.error('❌ [AppState] Ошибка перезапуска записи:', restartError);
          }
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [isIOS, hasPermission, isMeasuring]);

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
        
        // Для веб-версии: останавливаем анализ
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // Для веб-версии: закрываем аудио контекст
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        
        // Для iOS: останавливаем запись и удаляем слушатель
        if (isIOS && audioRecorderPlayerRef.current) {
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
        
        // Сбрасываем состояние
        setCurrentAmplitude(0);
        setSoundEvents([]);
        soundEventsRef.current = [];
        previousAmplitudeRef.current = 0;
        lastSoundDetectionTimeRef.current = 0;
        lastSpeedCalculationTimeRef.current = 0;
      };
    }, [isIOS])
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
      
      // Для веб-версии: закрываем аудио контекст
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      
      // Для iOS: останавливаем запись и удаляем слушатель
      if (isIOS && audioRecorderPlayerRef.current) {
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
      Alert.alert(t('puckSpeed.errorSaveFailed') || 'Ошибка', t('puckSpeed.needMicrophone') || 'Необходим доступ к микрофону');
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
                // Если идет измерение, останавливаем его и возвращаемся на начальную страницу
                if (isMeasuring) {
                  stopMeasuring();
                } else {
                  // Если не измеряем, просто возвращаемся назад
                  router.back();
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
          {isMeasuring && (isWeb || isIOS) && hasPermission !== null && (
            <View style={styles.amplitudeBarContainer}>
              <View style={styles.amplitudeBar}>
                <View 
                  style={[
                    styles.amplitudeBarFill, 
                    { width: `${Math.max(currentAmplitude * 100, 0)}%` }
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
                <Text style={styles.sensitivityLabelCompact}>{t('puckSpeed.sensitivity') || 'Чувствительность:'}{' '}{isNaN(sensitivity) ? 30 : Math.max(0, Math.min(100, sensitivity))}%</Text>
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
                        { width: `${Math.max(0, Math.min(100, sensitivity ?? 30))}%` }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.sliderThumbCompact,
                        { left: `${Math.max(0, Math.min(100, sensitivity ?? 30))}%` }
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
                              Alert.alert(t('puckSpeed.errorSaveFailed') || 'Ошибка', t('puckSpeed.errorNoProfile') || 'Необходимо войти в профиль для сохранения результата');
                              return;
                            }
                            
                            try {
                              const previousMaxSpeed = currentUser.puckSpeed || 0;
                              const success = await savePuckSpeedResult(currentUser.id, maxSpeedKmh);
                              if (success) {
                                await refreshUser(true);
                                const isNewMaxSpeed = maxSpeedKmh > previousMaxSpeed;
                                if (isNewMaxSpeed) {
                                  Alert.alert(t('puckSpeed.successAdded') || 'Успешно!', `${t('puckSpeed.successNewMax') || 'Новая максимальная скорость:'} ${maxSpeedKmh} ${t('puckSpeed.kmh') || 'км/ч'}\n\n${t('puckSpeed.successAddedToProfile') || 'Скорость добавлена в профиль'}`);
                                } else {
                                  Alert.alert(t('puckSpeed.successAdded') || 'Успешно', `${maxSpeedKmh} ${t('puckSpeed.kmh') || 'км/ч'} ${t('puckSpeed.successAddedToProfile') || 'Скорость добавлена в профиль'}`);
                                }
                              } else {
                                Alert.alert(t('puckSpeed.errorSaveFailed') || 'Ошибка', t('puckSpeed.errorSaveFailed') || 'Не удалось сохранить результат');
                              }
                            } catch (error) {
                              console.error('Ошибка сохранения:', error);
                              Alert.alert('Ошибка', 'Не удалось сохранить результат');
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
                                Alert.alert(t('puckSpeed.errorSaveFailed') || 'Ошибка', t('puckSpeed.errorNoProfile') || 'Необходимо войти в профиль для сохранения результата');
                                return;
                              }
                              
                              try {
                                const previousMaxSpeed = currentUser.puckSpeed || 0;
                                const success = await savePuckSpeedResult(currentUser.id, speedKmh);
                                if (success) {
                                  await refreshUser(true);
                                  const isNewMaxSpeed = speedKmh > previousMaxSpeed;
                                  if (isNewMaxSpeed) {
                                    Alert.alert(t('puckSpeed.successAdded') || 'Успешно!', `${t('puckSpeed.successNewMax') || 'Новая максимальная скорость:'} ${speedKmh} ${t('puckSpeed.kmh') || 'км/ч'}\n\n${t('puckSpeed.successAddedToProfile') || 'Скорость добавлена в профиль'}`);
                                  } else {
                                    Alert.alert(t('puckSpeed.successAdded') || 'Успешно', `${speedKmh} ${t('puckSpeed.kmh') || 'км/ч'} ${t('puckSpeed.successAddedToProfile') || 'Скорость добавлена в профиль'}`);
                                  }
                                } else {
                                  Alert.alert(t('puckSpeed.errorSaveFailed') || 'Ошибка', t('puckSpeed.errorSaveFailed') || 'Не удалось сохранить результат');
                                }
                              } catch (error) {
                                console.error('Ошибка сохранения:', error);
                                Alert.alert(t('puckSpeed.errorSaveFailed') || 'Ошибка', t('puckSpeed.errorSaveFailed') || 'Не удалось сохранить результат');
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
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.buttonContainer}>
                  <View style={styles.distanceBlockContainer}>
                    <View 
                      ref={distanceInputContainerRef}
                      style={styles.distanceInputContainer}
                    >
                      <View style={styles.distanceInputWrapper}>
                        <TextInput
                          ref={distanceInputRef}
                          style={styles.distanceInput}
                          value={distanceCm}
                          onChangeText={(text) => {
                            // Разрешаем только числа
                            const numericValue = text.replace(/[^0-9]/g, '');
                            setDistanceCm(numericValue);
                          }}
                          keyboardType="numeric"
                          placeholder={t('puckSpeed.distancePlaceholder') || '500'}
                          placeholderTextColor="#888"
                          editable={!isMeasuring}
                          onBlur={Keyboard.dismiss}
                          onFocus={() => {
                            // Ref уже установлен через ref={distanceInputRef}
                            // Глобальный слушатель клавиатуры автоматически прокрутит к полю
                          }}
                        />
                        <Text style={styles.distanceInputSuffix}>{t('puckSpeed.cm') || 'см'}</Text>
                      </View>
                      <Text style={styles.distanceLabel}>{t('puckSpeed.distanceLabel') || 'Расстояние от шайбы до сетки'}</Text>
                    </View>
                  </View>
                  <View style={styles.buttonShadow}>
                  <TouchableOpacity style={styles.startButton} onPress={startMeasuring} activeOpacity={0.8}>
                    <View style={styles.buttonHighlight} />
                    <View style={styles.iconContainer}>
                      <Ionicons name="play" size={168} color="#fff" />
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
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction1') || 'Измерьте расстояние от шайбы до сетки ворот и впишите в поле сверху'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>2</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction2') || 'Поставьте телефон возле ворот, или используйте 2 петлички. Одну петличку разместите ближе к удару, вторую ближе к воротам.'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>3</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction3') || 'Нажмите "Старт" и начинайте бросать.'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>4</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction4') || 'Отрегулируйте чувствительность, если скорость рассчитана неверно.'}</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>5</Text>
                </View>
                <Text style={styles.instructionItemText}>{t('puckSpeed.instruction5') || 'Выберите корректную и лучшую скорость для внесения в профиль'}</Text>
              </View>
            </View>
          )}
        </View>
      </CachedBackground>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    fontSize: 24,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    fontSize: 230,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    color: '#000',
    fontSize: 31,
    fontFamily: 'Gilroy-Regular',
    marginRight: 10,
  },
  distanceLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    marginTop: 10,
    marginBottom: 10,
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
    width: 250,
    height: 250,
    borderRadius: 125,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 15,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa2f40',
    borderWidth: 4,
    borderColor: '#000',
    width: 250,
    height: 250,
    borderRadius: 125,
    overflow: 'hidden',
  },
  buttonHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopLeftRadius: 125,
    borderTopRightRadius: 125,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 168,
    height: 168,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  sliderContainer: {
    position: 'relative',
    height: 40,
    justifyContent: 'center',
    marginBottom: 5,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    position: 'relative',
    width: '100%',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#fa2f40',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fa2f40',
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    top: -7,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
