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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AudioRecorderPlayer, { AudioRecorderPlayer as AudioRecorderPlayerType } from 'react-native-audio-recorder-player';
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
  const audioRecorderPlayerRef = useRef<AudioRecorderPlayerType | null>(null);
  const recordBackListenerRef = useRef<any>(null);
  
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
  const [sensitivity, setSensitivity] = useState(50); // Чувствительность (0-100, по умолчанию 50)
  const scaleAnim = useRef(new Animated.Value(1)).current; // Анимация масштаба для радара
  const prevSpeedResultsLengthRef = useRef(0); // Для отслеживания появления новых результатов
  const blinkAnim = useRef(new Animated.Value(1)).current; // Анимация мигания для радара
  const sliderWidthRef = useRef<number>(300); // Ширина слайдера для вычислений
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
  const MIN_TIME_BETWEEN_SOUNDS_MS = 100; // Минимальное время между звуками (100мс)
  // Расстояние конвертируем из см в метры
  const distanceMeters = parseFloat(distanceCm) / 100 || 5; // По умолчанию 5м если не указано
  const DEBOUNCE_MS = 100; // Debounce для предотвращения ложных срабатываний
  
  // Вычисляем пороги на основе чувствительности (0 = менее чувствительный, 100 = более чувствительный)
  // VOLUME_THRESHOLD: от 100 (нечувствительный) до 20 (очень чувствительный)
  // Чем больше чувствительность, тем меньше порог громкости
  const VOLUME_THRESHOLD = React.useMemo(() => {
    return 100 - (sensitivity * 0.8); // 100 до 20
  }, [sensitivity]);
  
  // PEAK_DETECTION_THRESHOLD: от 60 (нечувствительный) до 10 (очень чувствительный)
  const PEAK_DETECTION_THRESHOLD = React.useMemo(() => {
    return 60 - (sensitivity * 0.5); // 60 до 10
  }, [sensitivity]);

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

        // Получаем микрофонный поток
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1, // Моно
            sampleRate: 44100,
            echoCancellation: true,
          },
        });
        streamRef.current = stream;

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

        console.log('✅ Web Audio API инициализирован');
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
        console.log('🔧 [iOS] Инициализируем AudioRecorderPlayer...');
        const audioRecorderPlayer = new (AudioRecorderPlayer as any)();
        audioRecorderPlayerRef.current = audioRecorderPlayer;
        console.log('✅ [iOS] AudioRecorderPlayer инициализирован успешно');
      } catch (error) {
        console.error('❌ [iOS] Ошибка инициализации AudioRecorderPlayer:', error);
        console.error('❌ [iOS] Детали ошибки:', JSON.stringify(error, null, 2));
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
            setCurrentStatus((isWeb || isIOS) ? (t('puckSpeed.analyzing') || '🎤 Анализирую звук...') : (t('puckSpeed.readyForSound') || 'Готов к первому звуку...'));
            previousAmplitudeRef.current = 0;
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

          // Сбрасываем события для следующего измерения
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

    console.log(`🎤 Запускаем анализ звука (Web Audio API), чувствительность: ${sensitivity}%, порог громкости: ${VOLUME_THRESHOLD.toFixed(1)}, порог скачка: ${PEAK_DETECTION_THRESHOLD.toFixed(1)}`);
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
      
      // Для первого звука: нужен резкий скачок И высокая амплитуда
      const firstSoundDetected = isFirstSound && amplitudeJump > PEAK_DETECTION_THRESHOLD && averageAmplitude > VOLUME_THRESHOLD;
      
      // Для второго звука: более мягкие условия
      // Если амплитуда высокая, считаем это вторым звуком даже без большого скачка
      // (так как первый звук уже зафиксирован, и previousAmplitudeRef может быть высоким)
      const secondSoundDetected = isSecondSound && 
        averageAmplitude > VOLUME_THRESHOLD && 
        (amplitudeJump > PEAK_DETECTION_THRESHOLD * 0.3 || // Сниженный порог для второго звука (30% от порога)
         (amplitudeJump > -10 && averageAmplitude > VOLUME_THRESHOLD * 1.2)); // Или просто громкий звук (даже если амплитуда немного упала)
      
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
        // Если звук обнаружен, обновляем только после небольшого затухания
        previousAmplitudeRef.current = averageAmplitude * 0.8; // Сохраняем 80% для детекции второго звука
      }

      // Если обнаружен пик, и ещё нет 2 пиков
      if (isPeak && currentEvents.length < 2) {
        // Используем Date.now() относительно времени начала записи для точности
        const nowMs = Date.now();

        // Debounce: проверяем, не слишком близко ли к предыдущему пику
        const lastEvent = currentEvents[currentEvents.length - 1];
        const timeSinceLastEvent = lastEvent ? nowMs - lastEvent.timestamp : Infinity;
        
        if (currentEvents.length === 0 || timeSinceLastEvent > DEBOUNCE_MS) {
          console.log(`🔊 Обнаружен звук ${currentEvents.length + 1}: амплитуда=${averageAmplitude.toFixed(1)}, скачок=${amplitudeJump.toFixed(1)}, время=${nowMs}`);
          handleSoundDetected(nowMs, averageAmplitude / 255);
        } else {
          console.log(`⏸️ Звук игнорирован (слишком близко к предыдущему: ${timeSinceLastEvent.toFixed(0)}мс)`);
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
    previousAmplitudeRef.current = 0;

    const startIOSRecording = async () => {
      try {
        const audioRecorderPlayer = audioRecorderPlayerRef.current;
        if (!audioRecorderPlayer) {
          console.error('❌ [iOS] AudioRecorderPlayer не инициализирован');
          return;
        }

        console.log('📹 [iOS] Запускаем запись...');
        
        // Запускаем запись
        const path = await audioRecorderPlayer.startRecorder();
        console.log('✅ [iOS] Запись начата, путь:', path);

        // Добавляем слушатель для получения данных об амплитуде
        let callbackCallCount = 0;
        const recordBackListener = audioRecorderPlayer.addRecordBackListener((e: any) => {
          callbackCallCount++;
          // Логируем только первые несколько вызовов для диагностики
          if (callbackCallCount <= 5 || callbackCallCount % 100 === 0) {
            console.log(`🎤 [iOS] Callback #${callbackCallCount}, данные:`, {
              currentMetering: e?.currentMetering,
              currentPosition: e?.currentPosition,
              hasData: !!e,
              keys: e ? Object.keys(e) : []
            });
          }
          
          if (!isAnalyzingRef.current || !isMeasuringRef.current) {
            return;
          }
          
          if (!e) {
            console.warn('⚠️ [iOS] Callback вызван, но данные пустые');
            return;
          }

          // Получаем амплитуду из данных
          // AudioRecorderPlayer возвращает currentMetering в децибелах, конвертируем в амплитуду 0-255
          let averageAmplitude = 0;
          
          if (e.currentMetering !== undefined) {
            // Преобразуем децибелы в амплитуду (примерно: -60dB = 0, 0dB = 255)
            const db = e.currentMetering;
            averageAmplitude = Math.max(0, Math.min(255, ((db + 60) / 60) * 255));
          } else {
            // Fallback: используем базовое значение
            averageAmplitude = 50;
          }

          setCurrentAmplitude(averageAmplitude / 255);

          const currentEvents = soundEventsRef.current;

          // Детекция пика: резкий скачок амплитуды (та же логика, что и на веб)
          const amplitudeJump = averageAmplitude - previousAmplitudeRef.current;
          
          const isFirstSound = currentEvents.length === 0;
          const isSecondSound = currentEvents.length === 1;
          
          const firstSoundDetected = isFirstSound && amplitudeJump > PEAK_DETECTION_THRESHOLD && averageAmplitude > VOLUME_THRESHOLD;
          
          const secondSoundDetected = isSecondSound && 
            averageAmplitude > VOLUME_THRESHOLD && 
            (amplitudeJump > PEAK_DETECTION_THRESHOLD * 0.3 ||
             (amplitudeJump > -10 && averageAmplitude > VOLUME_THRESHOLD * 1.2));
          
          const isPeak = firstSoundDetected || secondSoundDetected;

          if (!isPeak) {
            if (averageAmplitude < previousAmplitudeRef.current) {
              previousAmplitudeRef.current = averageAmplitude * 0.7 + previousAmplitudeRef.current * 0.3;
            } else {
              previousAmplitudeRef.current = averageAmplitude;
            }
          } else {
            previousAmplitudeRef.current = averageAmplitude * 0.8;
          }

          if (isPeak && currentEvents.length < 2) {
            const nowMs = Date.now();
            const lastEvent = currentEvents[currentEvents.length - 1];
            const timeSinceLastEvent = lastEvent ? nowMs - lastEvent.timestamp : Infinity;
            
            if (currentEvents.length === 0 || timeSinceLastEvent > DEBOUNCE_MS) {
              console.log(`🔊 [iOS] Обнаружен звук ${currentEvents.length + 1}: амплитуда=${averageAmplitude.toFixed(1)}, скачок=${amplitudeJump.toFixed(1)}, время=${nowMs}`);
              handleSoundDetected(nowMs, averageAmplitude / 255);
            } else {
              console.log(`⏸️ [iOS] Звук игнорирован (слишком близко к предыдущему: ${timeSinceLastEvent.toFixed(0)}мс)`);
            }
          }
        });

        recordBackListenerRef.current = recordBackListener;
      } catch (error) {
        console.error('❌ Ошибка запуска записи на iOS:', error);
        console.error('❌ Детали ошибки:', JSON.stringify(error, null, 2));
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
    };
  }, [isIOS, isMeasuring, handleSoundDetected, VOLUME_THRESHOLD, PEAK_DETECTION_THRESHOLD, hasPermission, sensitivity]);

  // Анимация появления радара при новом результате
  useEffect(() => {
    // Анимируем только когда появляется новый результат (длина массива увеличилась)
    if (speedResults.length > prevSpeedResultsLengthRef.current && speedResults.length > 0) {
      // Сбрасываем анимацию масштаба
      scaleAnim.setValue(0);
      // Запускаем анимацию увеличения с 0 до 1
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      
      // Запускаем мигание (пару секунд)
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
    }
    // Обновляем предыдущую длину
    prevSpeedResultsLengthRef.current = speedResults.length;
  }, [speedResults.length, scaleAnim, blinkAnim]);

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
    <View style={styles.container}>
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
              <Ionicons name="speedometer" size={36} color="#fff" style={styles.radarTitleIcon} />
              <Text style={styles.radarTitle}>HOCKEYSTARS RADAR</Text>
            </View>
          </View>

          {/* Уровень звука (только для веб-версии при измерении) */}
          {isMeasuring && (isWeb || isIOS) && hasPermission !== null && (
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
              <View style={styles.speedContainer}>
                <Animated.View style={[
                  styles.speedBox, 
                  { 
                    transform: [{ scale: scaleAnim }],
                  }
                ]}>
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
                </Animated.View>
              </View>
              
              {/* Ползунок чувствительности (компактный, под радаром) */}
              <View style={styles.sensitivityContainerCompact}>
                <Text style={styles.sensitivityLabelCompact}>{t('puckSpeed.sensitivity') || 'Чувствительность:'} {isNaN(sensitivity) ? 50 : Math.max(0, Math.min(100, sensitivity))}%</Text>
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
                        { width: `${Math.max(0, Math.min(100, sensitivity || 50))}%` }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.sliderThumbCompact,
                        { left: `${Math.max(0, Math.min(100, sensitivity || 50))}%` }
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
          {isMeasuring && speedResults.length > 1 && (() => {
            // Находим максимальную скорость (рекорд)
            const maxSpeedResult = speedResults.reduce((max, current) => 
              current.speedKmh > max.speedKmh ? current : max
            );
            const maxSpeedKmh = Math.round(maxSpeedResult.speedKmh);
            
            // Остальные результаты в обратном порядке (новые сверху), исключая рекорд
            const allResults = speedResults.slice().reverse();
            const otherResults = allResults.filter(result => result.timestamp !== maxSpeedResult.timestamp);
            
            return (
              <ScrollView 
                style={styles.historyContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Мой рекорд */}
                <Text style={styles.historyTitle}>{t('puckSpeed.myRecord') || 'Мой рекорд:'}</Text>
                <View style={[styles.historyItem, styles.recordHistoryItem]}>
                  <Text style={styles.historySpeed}>
                    {maxSpeedKmh} {t('puckSpeed.kmh') || 'км/ч'}
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
                </View>
                
                {/* Текущие измерения */}
                {otherResults.length > 0 && (
                  <>
                    <Text style={[styles.historyTitle, styles.historyTitleSecondary]}>{t('puckSpeed.history') || 'История измерений:'}</Text>
                    {otherResults.map((result, index) => {
                      const speedKmh = Math.round(result.speedKmh);
                      return (
                        <View key={`other-${index}`} style={styles.historyItem}>
                          <Text style={styles.historySpeed}>
                            {speedKmh} {t('puckSpeed.kmh') || 'км/ч'}
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
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.buttonContainer, speedResults.length > 0 && styles.buttonContainerWithResults]}>
                <View style={styles.buttonShadow}>
                <TouchableOpacity style={styles.startButton} onPress={startMeasuring} activeOpacity={0.8}>
                  <View style={styles.buttonHighlight} />
                  <View style={styles.iconContainer}>
                    <Ionicons name="play" size={168} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
                <View style={styles.distanceBlockContainer}>
                  <View style={styles.distanceInputContainer}>
                    <Text style={styles.distanceLabel}>{t('puckSpeed.distanceLabel') || 'Измерьте и впишите расстояние от места удара по шайбе до сетки ворот'} <Text>{t('puckSpeed.inCentimeters') || 'в сантиметрах'}</Text></Text>
                    <TextInput
                      style={styles.distanceInput}
                      value={distanceCm}
                      onChangeText={setDistanceCm}
                      keyboardType="numeric"
                      placeholder={t('puckSpeed.distancePlaceholder') || '500'}
                      placeholderTextColor="#888"
                      editable={!isMeasuring}
                      onBlur={Keyboard.dismiss}
                    />
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          )}

          {/* Кнопки управления (когда измеряется) */}
          {isMeasuring && (
            <View style={styles.controls}>
              <TouchableOpacity style={styles.stopButton} onPress={stopMeasuring}>
                <Ionicons name="stop" size={24} color="#fff" />
                <Text style={styles.stopButtonText}>{t('puckSpeed.stop') || 'Остановить'}</Text>
              </TouchableOpacity>
              
              {speedResults.length > 0 && (
                <TouchableOpacity style={styles.resetButton} onPress={resetResults}>
                  <Ionicons name="refresh" size={20} color="#fff" />
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
    </View>
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
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  radarTitleBackground: {
    backgroundColor: '#fa2f40',
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
  radarTitleIcon: {
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
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
  amplitudeBarContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 80,
    zIndex: 100,
  },
  amplitudeText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'center',
  },
  amplitudeBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  amplitudeBarFill: {
    height: '100%',
    backgroundColor: '#fa2f40',
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
    marginTop: 150,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 150,
  },
  sensitivityContainerCompact: {
    marginTop: 15,
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 0,
  },
  sensitivityLabelCompact: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  sliderContainerCompact: {
    position: 'relative',
    height: 30,
    justifyContent: 'center',
  },
  sliderTrackCompact: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
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
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fa2f40',
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    top: -6,
    marginLeft: -8,
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
  },
  speedValue: {
    fontSize: 230,
    fontFamily: 'DigifaceRegular',
    color: '#fa2f40',
    marginBottom: 5,
  },
  speedUnit: {
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
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
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 80,
    padding: 20,
    flex: 1,
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
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 10,
    marginTop: 5,
  },
  historyTitleSecondary: {
    marginTop: 15,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  recordHistoryItem: {
    backgroundColor: 'rgba(250, 47, 64, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.5)',
  },
  historySpeed: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  addToProfileButton: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  addToProfileButtonText: {
    color: '#fff',
    fontSize: 12,
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
    paddingTop: 200,
    zIndex: 100,
  },
  buttonContainerWithResults: {
    paddingTop: 500,
  },
  distanceBlockContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    marginTop: 30,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  distanceInputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  distanceLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    marginBottom: 10,
    textAlign: 'center',
  },
  distanceInput: {
    backgroundColor: '#666',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    width: '70%',
    borderWidth: 1,
    borderColor: '#fa2f40',
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
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 15,
    zIndex: 200,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    borderColor: '#fa2f40',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    gap: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
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
