/**
 * РАДАР СКОРОСТИ ШАЙБЫ - КАМЕРА (С VISIONCAMERA)
 * Детекция влета и вылета шайбы из кадра через анализ движения между кадрами в реальном времени
 * Использует VisionCamera с frame processors для точной детекции без задержек
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../contexts/LanguageContext';
import * as ImageManipulator from 'expo-image-manipulator';

// Условный импорт VisionCamera (не работает на веб)
const isWebEnvironment = typeof window !== 'undefined' && typeof document !== 'undefined';

let Camera: any = null;
let useCameraDevice: any = null;
let useFrameProcessor: any = null;
let useCameraPermission: any = null;
let runOnJS: any = null;

// Загружаем VisionCamera только если НЕ веб
if (!isWebEnvironment) {
  try {
    const visionCameraModule = require('react-native-vision-camera');
    Camera = visionCameraModule.Camera;
    useCameraDevice = visionCameraModule.useCameraDevice;
    useFrameProcessor = visionCameraModule.useFrameProcessor;
    useCameraPermission = visionCameraModule.useCameraPermission;
    
    const reanimatedModule = require('react-native-reanimated');
    runOnJS = reanimatedModule.runOnJS;
  } catch (error) {
    console.warn('react-native-vision-camera не доступен:', error);
  }
}

// Fallback на expo-camera если VisionCamera недоступен
let CameraView: any = null;
let useCameraPermissions: any = null;

if (!isWebEnvironment) {
  try {
    const cameraModule = require('expo-camera');
    CameraView = cameraModule.CameraView;
    useCameraPermissions = cameraModule.useCameraPermissions;
  } catch (error) {
    console.warn('expo-camera не доступен:', error);
  }
}

interface DetectionEvent {
  timestamp: number;
  type: 'enter' | 'exit';
}

interface SpeedResult {
  speedMs: number;
  speedKmh: number;
  speedMph: number;
  timeMs: number;
  distance: number;
  timestamp: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PuckSpeedCamera() {
  const router = useRouter();
  const { t } = useLanguage();
  
  // VisionCamera hooks (если доступны)
  const visionCameraPermission = useCameraPermission && useCameraPermission();
  const cameraDevice = useCameraDevice && useCameraDevice('back');
  
  // Fallback на expo-camera
  const [webPermission, setWebPermission] = useState<{ granted: boolean } | null>(
    Platform.OS === 'web' ? { granted: false } : null
  );
  
  let nativePermissions: any = null;
  if (Platform.OS !== 'web' && useCameraPermissions && !useCameraPermission) {
    try {
      nativePermissions = useCameraPermissions();
    } catch (error) {
      console.warn('Ошибка при вызове useCameraPermissions:', error);
    }
  }
  
  // Определяем разрешение: приоритет VisionCamera, затем expo-camera
  const permission = Platform.OS === 'web' 
    ? webPermission 
    : (visionCameraPermission || (nativePermissions?.[0] || null));
  
  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setWebPermission({ granted: true });
        return { granted: true };
      } catch (error) {
        setWebPermission({ granted: false });
        return { granted: false };
      }
    } else {
      // Приоритет VisionCamera
      if (visionCameraPermission && visionCameraPermission.requestPermission) {
        return await visionCameraPermission.requestPermission();
      }
      // Fallback на expo-camera
      if (nativePermissions?.[1]) {
        return await nativePermissions[1]();
      }
      return { granted: false };
    }
  }, [visionCameraPermission, nativePermissions]);
  
  // Проверяем, используем ли VisionCamera
  const useVisionCamera = !isWebEnvironment && Camera && useFrameProcessor && cameraDevice;

  const cameraRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousFrameRef = useRef<ImageData | null>(null);
  const previousFrameNativeRef = useRef<string | null>(null); // Для нативных: base64 предыдущего кадра
  const animationFrameRef = useRef<number | null>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [speedResults, setSpeedResults] = useState<SpeedResult[]>([]);
  const [distanceCm, setDistanceCm] = useState<string>('80'); // 80 см по умолчанию
  const [currentStatus, setCurrentStatus] = useState(t('puckSpeed.ready') || 'Готов');
  const [motionLevel, setMotionLevel] = useState(0); // 0-100
  const [sensitivity, setSensitivity] = useState(30); // Порог чувствительности (понижен по умолчанию для меньшей чувствительности)
  const [isObjectDetected, setIsObjectDetected] = useState(false); // Для визуальной индикации

  const eventsRef = useRef<DetectionEvent[]>([]);
  const isDetectingRef = useRef(false);
  const motionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMotionActiveRef = useRef(false);
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Таймаут для автоматического сброса при слишком долгом нахождении в кадре
  const enterTimeRef = useRef<number | null>(null); // Время входа объекта в кадр
  const motionHistoryRef = useRef<number[]>([]); // История движения для ранней детекции
  const MOTION_HISTORY_SIZE = 3; // Последние 3 кадра для анализа тренда

  const distanceMeters = parseFloat(distanceCm) / 100 || 0.8;

  // Оптимизированный порог для быстрой детекции
  const MOTION_THRESHOLD = React.useMemo(() => {
    // Чем выше чувствительность, тем ниже порог
    // Порог от 3 до 1 (максимально чувствительный для ранней детекции)
    return 3 - (sensitivity * 0.02); // от 3 до 1
  }, [sensitivity]);
  
  // Порог для раннего предупреждения (еще ниже, для детекции начала движения)
  const EARLY_DETECTION_THRESHOLD = React.useMemo(() => {
    return MOTION_THRESHOLD * 0.7; // 70% от основного порога
  }, [MOTION_THRESHOLD]);

  // Максимальное время в кадре для быстрого объекта (1 секунда)
  const FAST_OBJECT_MAX_TIME_MS = 1000;

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    isDetectingRef.current = isDetecting;
  }, [isDetecting]);

  // Запрос разрешений
  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Функция расчета скорости (для VisionCamera frame processor)
  const calculateSpeed = useCallback((timeDiffMs: number, timestamp: number) => {
    if (timeDiffMs >= 5 && timeDiffMs <= FAST_OBJECT_MAX_TIME_MS) {
      const timeDiffSeconds = timeDiffMs / 1000;
      const speedMs = distanceMeters / timeDiffSeconds;
      const speedKmh = speedMs * 3.6;

      if (speedKmh >= 1 && speedKmh <= 300) {
        console.log(`⚡ СКОРОСТЬ: ${speedKmh.toFixed(1)} км/ч (время: ${timeDiffMs.toFixed(1)}мс)`);

        const result: SpeedResult = {
          speedMs,
          speedKmh,
          speedMph: speedKmh / 1.60934,
          timeMs: timeDiffMs,
          distance: distanceMeters,
          timestamp: Date.now(),
        };

        setSpeedResults(prev => [...prev, result]);
        setCurrentStatus(`⚡ ${speedKmh.toFixed(1)} ${t('puckSpeed.kmh') || 'км/ч'}`);
      } else {
        setCurrentStatus(t('puckSpeed.invalidSpeed') || `⚠️ Скорость ${speedKmh.toFixed(1)} км/ч вне диапазона`);
      }
    } else {
      setCurrentStatus(t('puckSpeed.invalidTime') || `⚠️ Объект в кадре слишком долго (${(timeDiffMs/1000).toFixed(1)}с)`);
    }
  }, [distanceMeters, t]);

  // Refs для frame processor (worklet не может использовать refs напрямую)
  const isDetectingWorkletRef = useRef(false);
  const isMotionActiveWorkletRef = useRef(false);
  const enterTimeWorkletRef = useRef<number | null>(null);
  const motionHistoryWorkletRef = useRef<number[]>([]);
  const motionThresholdWorkletRef = useRef(3);
  
  // Синхронизируем refs
  useEffect(() => {
    isDetectingWorkletRef.current = isDetecting;
  }, [isDetecting]);
  
  useEffect(() => {
    motionThresholdWorkletRef.current = MOTION_THRESHOLD;
  }, [MOTION_THRESHOLD]);

  // VisionCamera Frame Processor (для реального времени без задержек)
  const frameProcessor = useFrameProcessor && useFrameProcessor((frame: any) => {
    'worklet';
    
    if (!isDetectingWorkletRef.current) return;
    
    const time = typeof performance !== 'undefined' && typeof performance.now === 'function' 
      ? performance.now() 
      : Date.now();
    
    // Анализируем центр кадра (ROI - область интереса)
    const centerY = Math.floor(frame.height / 2);
    const roiWidth = Math.floor(frame.width * 0.8); // 80% ширины
    const roiStartX = Math.floor((frame.width - roiWidth) / 2);
    
    let motion = 0;
    let totalBrightness = 0;
    let pixelCount = 0;
    
    // Анализируем каждый 4-й пиксель в ROI для скорости
    for (let x = roiStartX; x < roiStartX + roiWidth; x += 4) {
      try {
        const pixel = frame.getPixel(x, centerY);
        const brightness = (pixel.red + pixel.green + pixel.blue) / 3;
        totalBrightness += brightness;
        pixelCount++;
        
        // Детекция движения: яркие/темные объекты (шайба обычно контрастная)
        if (brightness < 50 || brightness > 200) {
          motion++;
        }
      } catch (e) {
        // Игнорируем ошибки доступа к пикселям
      }
    }
    
    const motionPercent = pixelCount > 0 ? (motion / pixelCount) * 100 : 0;
    const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
    
    // Комбинированная метрика движения
    const combinedMotion = motionPercent + (Math.abs(avgBrightness - 128) / 128) * 20;
    
    // Hysteresis для стабильности
    const HAS_HYSTERESIS = 5;
    const lastMotion = motionHistoryWorkletRef.current[motionHistoryWorkletRef.current.length - 1] || 0;
    const threshold = motionThresholdWorkletRef.current;
    const isHigh = combinedMotion > (threshold + (lastMotion > threshold ? 0 : HAS_HYSTERESIS));
    const isLow = combinedMotion < (threshold - HAS_HYSTERESIS);
    
    // Обновляем историю
    motionHistoryWorkletRef.current.push(combinedMotion);
    if (motionHistoryWorkletRef.current.length > MOTION_HISTORY_SIZE) {
      motionHistoryWorkletRef.current.shift();
    }
    
    if (runOnJS) {
      runOnJS(setMotionLevel)(combinedMotion);
    }
    
    // Детекция: ВХОД при скачке
    if (isHigh && !isMotionActiveWorkletRef.current) {
      isMotionActiveWorkletRef.current = true;
      enterTimeWorkletRef.current = time;
      
      if (runOnJS) {
        runOnJS(setIsObjectDetected)(true);
        runOnJS(setCurrentStatus)(t('puckSpeed.puckInFrame') || '🎯 Объект в кадре!');
        runOnJS(setEvents)([{ timestamp: time, type: 'enter' }]);
      }
      
      // Синхронизируем с основными refs
      isMotionActiveRef.current = true;
      enterTimeRef.current = time;
    }
    // Детекция: ВЫХОД при падении
    else if (isLow && isMotionActiveWorkletRef.current) {
      const exitTime = time;
      const enterTime = enterTimeWorkletRef.current || exitTime;
      const timeDiffMs = exitTime - enterTime;
      
      isMotionActiveWorkletRef.current = false;
      enterTimeWorkletRef.current = null;
      
      // Синхронизируем с основными refs
      isMotionActiveRef.current = false;
      enterTimeRef.current = null;
      
      if (runOnJS && calculateSpeed) {
        runOnJS(setIsObjectDetected)(false);
        runOnJS(calculateSpeed)(timeDiffMs, time);
        runOnJS(setEvents)([]);
      }
    }
  }, [t, calculateSpeed]);

  // 🎯 Основная функция детекции движения
  const detectMotion = async () => {
    if (!cameraRef.current || !isDetectingRef.current) return;

    try {
      // Получаем кадр с камеры - используем минимальные настройки для скорости
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.01, // Минимальное качество для максимальной скорости
        base64: false,
        skipProcessing: true,
        exif: false, // Отключаем EXIF для скорости
      });

      // Анализируем кадр
      analyzeFrame(photo.uri);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('Image could not be captured')) {
        console.error('Ошибка захвата:', error);
      }
    }

    // КРИТИЧНО: Максимальная частота для детекции БЫСТРЫХ объектов
    // Используем requestAnimationFrame для минимальной задержки
    if (isDetectingRef.current) {
      // Используем requestAnimationFrame для минимальной задержки (до 120 FPS)
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          if (isDetectingRef.current) {
            detectMotion();
          }
        });
      } else {
        setTimeout(detectMotion, 8);
      }
    }
  };

  const analyzeFrame = async (imageUri: string) => {
    // Для веб - используем Canvas
    if (Platform.OS === 'web') {
      analyzeFrameWeb(imageUri);
    }
    // Для нативного - упрощенная детекция
    else {
      analyzeFrameNative(imageUri);
    }

    // Кадры обрабатываются в detectMotion (60 FPS)
  };

  // Анализ для веб (Canvas API)
  const analyzeFrameWeb = (imageUri: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 120; // Оптимальное разрешение для скорости и точности
        canvas.height = 90;
        canvasRef.current = canvas;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Рисуем текущий кадр
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Сравниваем с предыдущим
      if (previousFrameRef.current) {
        const diff = calculateFrameDifference(previousFrameRef.current, currentFrame);

        // Добавляем в историю для анализа тренда
        motionHistoryRef.current.push(diff);
        if (motionHistoryRef.current.length > MOTION_HISTORY_SIZE) {
          motionHistoryRef.current.shift();
        }
        
        // Обновляем уровень движения
        setMotionLevel(diff);

        // Ранняя детекция: анализируем тренд движения
        const avgMotion = motionHistoryRef.current.length > 0 
          ? motionHistoryRef.current.reduce((a, b) => a + b, 0) / motionHistoryRef.current.length 
          : diff;
        const isRisingTrend = motionHistoryRef.current.length >= 2 && 
                             motionHistoryRef.current[motionHistoryRef.current.length - 1] > 
                             motionHistoryRef.current[motionHistoryRef.current.length - 2];
        
        // Если тренд роста И среднее движение выше раннего порога - детектируем раньше
        if (!isMotionActiveRef.current && isRisingTrend && avgMotion > EARLY_DETECTION_THRESHOLD) {
          // Ранняя детекция - объект только начинает появляться
          processMotion(avgMotion);
        } else {
          // Обычная детекция
          processMotion(diff);
        }
      }

      previousFrameRef.current = currentFrame;
    };

    img.onerror = () => {
      // Продолжаем даже при ошибке загрузки
      if (isDetectingRef.current) {
        setTimeout(detectMotion, 100);
      }
    };

    img.src = imageUri;
  };

  // Оптимизированная нативная детекция (для iOS/Android)
  const analyzeFrameNative = async (imageUri: string) => {
    try {
      // Оптимальное разрешение для скорости и точности (120x90 - баланс)
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 120, height: 90 } }], // Уменьшено для скорости, но достаточно для детекции
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) {
        return;
      }

      if (previousFrameNativeRef.current) {
        // Комбинированный подход: яркость + base64 diff для точности
        const currentBrightness = calculateBrightnessFromBase64(manipulated.base64);
        const previousBrightness = calculateBrightnessFromBase64(previousFrameNativeRef.current);
        
        // Вычисляем разницу в яркости (0-100)
        const brightnessDiff = Math.abs(currentBrightness - previousBrightness);
        
        // Дополнительно анализируем изменения в base64 строке
        const base64Diff = calculateBase64Difference(previousFrameNativeRef.current, manipulated.base64);
        
        // Комбинируем метрики: яркость + изменения в данных
        // Оптимизировано для быстрой реакции на движение
        const diff = Math.min(100, (brightnessDiff * 1.5) + (base64Diff * 0.8));
        
        // Добавляем в историю для анализа тренда
        motionHistoryRef.current.push(diff);
        if (motionHistoryRef.current.length > MOTION_HISTORY_SIZE) {
          motionHistoryRef.current.shift();
        }
        
        setMotionLevel(diff);

        // Ранняя детекция: анализируем тренд движения
        const avgMotion = motionHistoryRef.current.reduce((a, b) => a + b, 0) / motionHistoryRef.current.length;
        const isRisingTrend = motionHistoryRef.current.length >= 2 && 
                             motionHistoryRef.current[motionHistoryRef.current.length - 1] > 
                             motionHistoryRef.current[motionHistoryRef.current.length - 2];
        
        // Если тренд роста И среднее движение выше раннего порога - детектируем раньше
        if (!isMotionActiveRef.current && isRisingTrend && avgMotion > EARLY_DETECTION_THRESHOLD) {
          // Ранняя детекция - объект только начинает появляться
          processMotion(avgMotion);
        } else {
          // Обычная детекция
          processMotion(diff);
        }
      } else {
        // Первый кадр - нет движения
        setMotionLevel(0);
        motionHistoryRef.current = [];
      }

      previousFrameNativeRef.current = manipulated.base64;
    } catch (error) {
      console.error('Ошибка анализа:', error);
    }
  };

  // Вычисление "яркости" из base64 изображения (улучшенный подход)
  // Анализируем распределение символов в base64 строке как индикатор изменений
  const calculateBrightnessFromBase64 = (base64: string): number => {
    try {
      // Удаляем префикс data:image если есть
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      
      if (!base64Data || base64Data.length === 0) {
        return 0;
      }
      
      // Анализируем распределение символов в base64
      // Более светлые изображения имеют другое распределение символов
      let charSum = 0;
      const sampleSize = Math.min(base64Data.length, 800); // Оптимальный баланс скорости/точности
      
      for (let i = 0; i < sampleSize; i++) {
        // Используем код символа как индикатор
        charSum += base64Data.charCodeAt(i);
      }

      // Нормализуем к 0-100 (примерный диапазон для base64 символов: 43-122)
      // Base64 символы: A-Z (65-90), a-z (97-122), 0-9 (48-57), + (43), / (47)
      const avgCharCode = charSum / sampleSize;
      // Нормализуем средний код символа к 0-100
      // Диапазон base64: примерно 43-122, нормализуем к 0-100
      const normalized = ((avgCharCode - 43) / (122 - 43)) * 100;
      
      // Ограничиваем значения
      return Math.max(0, Math.min(100, normalized));
    } catch (error) {
      console.error('Ошибка вычисления яркости:', error);
      return 0; // Возвращаем 0 вместо 50 для более точной детекции
    }
  };

  // Вычисление разницы между двумя base64 строками
  const calculateBase64Difference = (base641: string, base642: string): number => {
    try {
      const data1 = base641.includes(',') ? base641.split(',')[1] : base641;
      const data2 = base642.includes(',') ? base642.split(',')[1] : base642;
      
      if (data1.length !== data2.length) {
        // Разная длина может быть из-за сжатия, но это не всегда движение
        // Сравниваем по минимальной длине
        const minLength = Math.min(data1.length, data2.length);
        if (minLength === 0) return 0;
        
        let diffCount = 0;
        const sampleSize = Math.min(minLength, 1000);
        
        for (let i = 0; i < sampleSize; i++) {
          if (data1[i] !== data2[i]) {
            diffCount++;
          }
        }
        
        return (diffCount / sampleSize) * 100;
      }

      let diffCount = 0;
      const sampleSize = Math.min(data1.length, 1500); // Оптимальный баланс скорости/точности
      
      // Анализируем каждый символ для точности, но ограничиваем размер выборки
      for (let i = 0; i < sampleSize; i += 1) {
        if (data1[i] !== data2[i]) {
          diffCount++;
        }
      }

      // Нормализуем к 0-100
      const diffPercent = (diffCount / sampleSize) * 100;
      
      // Ограничиваем максимальное значение для стабильности
      return Math.min(100, diffPercent);
    } catch (error) {
      console.error('Ошибка вычисления разницы base64:', error);
      return 0;
    }
  };

  // Расчет разницы между кадрами
  const calculateFrameDifference = (frame1: ImageData, frame2: ImageData): number => {
    let totalDiff = 0;
    const pixels = frame1.data.length / 4; // RGBA

    // Оптимизация: анализируем каждый 2-й пиксель для скорости (было 4-й)
    for (let i = 0; i < frame1.data.length; i += 8) { // Каждый 2-й пиксель (RGBA = 4 байта)
      const r1 = frame1.data[i];
      const g1 = frame1.data[i + 1];
      const b1 = frame1.data[i + 2];
      const r2 = frame2.data[i];
      const g2 = frame2.data[i + 1];
      const b2 = frame2.data[i + 2];

      // Разница по всем каналам
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      totalDiff += diff;
    }

    // Нормализуем к 0-100 (учитываем что анализируем каждый 2-й пиксель)
    const analyzedPixels = pixels / 2;
    return (totalDiff / analyzedPixels / 765) * 100; // 765 = 255*3
  };

  // Упрощенная обработка движения (мгновенная детекция)
  const processMotion = (currentDiff: number) => {
    const isHigh = currentDiff > MOTION_THRESHOLD;
    
    // ВХОД: Резкий скачок движения
    if (isHigh && !isMotionActiveRef.current) {
      isMotionActiveRef.current = true;
      // Используем performance.now() для более точного времени (если доступно)
      enterTimeRef.current = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now() 
        : Date.now();
      
      setIsObjectDetected(true);
      setCurrentStatus(t('puckSpeed.puckInFrame') || '🎯 Объект в кадре - жду вылета...');
      
      const newEvent: DetectionEvent = {
        timestamp: enterTimeRef.current,
        type: 'enter',
      };
      
      setEvents([newEvent]);
      eventsRef.current = [newEvent];
      
      console.log('✅ Объект ВОШЕЛ в кадр');
    }
    
    // ВЫХОД: Движение прекратилось
    if (!isHigh && isMotionActiveRef.current) {
      // Используем performance.now() для более точного времени
      const exitTime = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now() 
        : Date.now();
      const enterTime = enterTimeRef.current || exitTime;
      // Если использовали performance.now(), конвертируем в миллисекунды
      const timeDiffMs = exitTime - enterTime;
      
      isMotionActiveRef.current = false;
      setIsObjectDetected(false);
      
      // Валидация: от 5ms до 1000ms (для очень быстрых объектов)
      if (timeDiffMs >= 5 && timeDiffMs <= FAST_OBJECT_MAX_TIME_MS) {
        const timeDiffSeconds = timeDiffMs / 1000;
        const speedMs = distanceMeters / timeDiffSeconds;
        const speedKmh = speedMs * 3.6;

        if (speedKmh >= 1 && speedKmh <= 300) { // Увеличен диапазон до 300 км/ч
          console.log(`⚡ СКОРОСТЬ: ${speedKmh.toFixed(1)} км/ч (время: ${timeDiffMs.toFixed(1)}мс)`);

          const result: SpeedResult = {
            speedMs,
            speedKmh,
            speedMph: speedKmh / 1.60934,
            timeMs: timeDiffMs,
            distance: distanceMeters,
            timestamp: Date.now(),
          };

          setSpeedResults(prev => [...prev, result]);
          setCurrentStatus(`⚡ ${speedKmh.toFixed(1)} ${t('puckSpeed.kmh') || 'км/ч'}`);
        } else {
          console.log(`⚠️ Скорость ${speedKmh.toFixed(1)} км/ч вне диапазона (1-200 км/ч)`);
          setCurrentStatus(t('puckSpeed.invalidSpeed') || `⚠️ Скорость ${speedKmh.toFixed(1)} км/ч вне диапазона`);
        }
      } else {
        console.log(`⚠️ Время ${timeDiffMs}мс некорректно (должно быть 10мс-1сек)`);
        setCurrentStatus(t('puckSpeed.invalidTime') || `⚠️ Объект в кадре слишком долго (${(timeDiffMs/1000).toFixed(1)}с). Бросьте быстрее!`);
      }
      
      // Сброс
      setEvents([]);
      eventsRef.current = [];
      enterTimeRef.current = null;
    }
  };

  // Старая функция (оставлена для совместимости, но не используется)
  const handleMotionDetected = (level: number) => {
    // Если движение только началось
    if (!isMotionActiveRef.current) {
      isMotionActiveRef.current = true;
      setEvents(prev => {
        const newEvent: DetectionEvent = {
          timestamp: Date.now(),
          type: 'enter',
        };
        const updated = [...prev, newEvent];
        eventsRef.current = updated;
        if (updated.length === 1) {
          console.log('✅ Объект ВОШЕЛ в кадр');
          setIsObjectDetected(true);
          setCurrentStatus(t('puckSpeed.puckInFrame') || '🎯 Объект в кадре - жду вылета...');
          
          // Защита: автоматический сброс если объект в кадре больше 5 секунд
          // (это означает что объект остановился или движется слишком медленно)
          if (enterTimeoutRef.current) {
            clearTimeout(enterTimeoutRef.current);
          }
          enterTimeoutRef.current = setTimeout(() => {
            console.log('⚠️ Объект в кадре слишком долго (>5 сек) - сбрасываю');
            isMotionActiveRef.current = false;
            setIsObjectDetected(false);
            setEvents([]);
            eventsRef.current = [];
            setCurrentStatus(t('puckSpeed.waitingForPuck') || '🎯 Жду объект...');
            if (enterTimeoutRef.current) {
              clearTimeout(enterTimeoutRef.current);
              enterTimeoutRef.current = null;
            }
          }, 5000); // 5 секунд максимум
          
        }
        return updated;
      });
    }

    // Сбрасываем таймаут остановки
    if (motionTimeoutRef.current) {
      clearTimeout(motionTimeoutRef.current);
    }
  };

  const handleMotionStopped = () => {
    if (!isMotionActiveRef.current) return;

    // Ждем 300мс перед фиксацией остановки (увеличено для большей стабильности)
    if (motionTimeoutRef.current) {
      clearTimeout(motionTimeoutRef.current);
    }

    motionTimeoutRef.current = setTimeout(() => {
      isMotionActiveRef.current = false;
      setIsObjectDetected(false);
      
      // Очищаем таймаут влета при вылете
      if (enterTimeoutRef.current) {
        clearTimeout(enterTimeoutRef.current);
        enterTimeoutRef.current = null;
      }
      
      setEvents(prev => {
        const currentEvents = eventsRef.current;

        // Только если есть "enter" и еще нет "exit"
        if (currentEvents.length === 1 && currentEvents[0].type === 'enter') {
          const exitEvent: DetectionEvent = {
            timestamp: Date.now(),
            type: 'exit',
          };
          const updated = [...currentEvents, exitEvent];
          eventsRef.current = updated;

          // Рассчитываем скорость
          const enterTime = currentEvents[0].timestamp;
          const exitTime = exitEvent.timestamp;
          const timeDiffMs = exitTime - enterTime;
          const timeDiffSeconds = timeDiffMs / 1000;

          // Проверяем разумные границы времени (от 10мс до 5 секунд для быстрых объектов)
          // Уменьшил с 10 до 5 секунд, так как реальные быстрые объекты проходят кадр за доли секунды
          if (timeDiffMs >= 10 && timeDiffMs < 5000) {
            const speedMs = distanceMeters / timeDiffSeconds;
            const speedKmh = speedMs * 3.6;

            // Проверяем разумные границы скорости (от 1 до 200 км/ч)
            if (speedKmh >= 1 && speedKmh <= 200) {
              console.log(`⚡ СКОРОСТЬ: ${speedKmh.toFixed(1)} км/ч (время: ${timeDiffMs}мс)`);

              const result: SpeedResult = {
                speedMs,
                speedKmh,
                speedMph: speedKmh / 1.60934,
                timeMs: timeDiffMs,
                distance: distanceMeters,
                timestamp: Date.now(),
              };

              setSpeedResults(prevResults => [...prevResults, result]);
              setCurrentStatus(`⚡ ${speedKmh.toFixed(1)} ${t('puckSpeed.kmh') || 'км/ч'}`);

              // Сбрасываем события для следующего измерения
              return [];
            } else {
              console.log(`⚠️ Скорость ${speedKmh.toFixed(1)} км/ч вне диапазона (1-200 км/ч)`);
              setCurrentStatus(t('puckSpeed.invalidSpeed') || `⚠️ Скорость ${speedKmh.toFixed(1)} км/ч вне диапазона`);
              return [];
            }
          } else {
            console.log(`⚠️ Время ${timeDiffMs}мс некорректно (должно быть 10мс-5сек). Объект движется слишком медленно или остановился в кадре.`);
            setCurrentStatus(t('puckSpeed.invalidTime') || `⚠️ Объект в кадре слишком долго (${(timeDiffMs/1000).toFixed(1)}с). Бросьте быстрее!`);
            // Сбрасываем для следующего измерения
            return [];
          }
        }
        return prev;
      });
    }, 300);
  };

  const startDetecting = () => {
    console.log('🎬 Старт детекции');
    setEvents([]);
    eventsRef.current = [];
    setSpeedResults([]);
    setCurrentStatus(t('puckSpeed.waitingForPuck') || '🎯 Жду объект...');
    setIsObjectDetected(false);
    previousFrameRef.current = null;
    previousFrameNativeRef.current = null;
    isMotionActiveRef.current = false;
    enterTimeRef.current = null;
    motionHistoryRef.current = [];
    
    // Синхронизируем worklet refs для VisionCamera
    isDetectingWorkletRef.current = true;
    isMotionActiveWorkletRef.current = false;
    enterTimeWorkletRef.current = null;
    motionHistoryWorkletRef.current = [];
    
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }

    setIsDetecting(true);

    // Запускаем цикл детекции только если НЕ используем VisionCamera
    // VisionCamera использует frame processor и не нужен detectMotion
    if (!useVisionCamera) {
      setTimeout(detectMotion, 100);
    }
  };

  const stopDetecting = () => {
    console.log('⏹️ Стоп');
    setIsDetecting(false);
    
    // Синхронизируем worklet refs для VisionCamera
    isDetectingWorkletRef.current = false;
    isMotionActiveWorkletRef.current = false;
    enterTimeWorkletRef.current = null;
    
    setCurrentStatus(t('puckSpeed.ready') || 'Готов');
    if (motionTimeoutRef.current) {
      clearTimeout(motionTimeoutRef.current);
    }
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
  };

  const resetResults = () => {
    setSpeedResults([]);
    setEvents([]);
    eventsRef.current = [];
    setCurrentStatus(t('puckSpeed.ready') || 'Готов');
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fa2f40" />
        <Text style={styles.text}>{t('puckSpeed.loading') || 'Загрузка...'}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera" size={64} color="#F44336" />
        <Text style={styles.errorText}>
          {t('puckSpeed.cameraPermissionRequired') || 'Нет доступа к камере'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>
            {t('puckSpeed.grantPermission') || 'Разрешить'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {useVisionCamera 
            ? (t('puckSpeed.cameraRadar') || 'Радар Камера') + ' (Vision)'
            : (t('puckSpeed.cameraRadar') || 'Радар Камера')
          }
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Камера */}
      <View style={styles.cameraContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.camera}>
            <View style={styles.webCameraContainer}>
              <Ionicons name="camera-outline" size={64} color="#fa2f40" />
              <Text style={styles.webCameraMessage}>
                {t('puckSpeed.webCameraNotSupported') || 'Камера на веб пока не поддерживается. Используйте мобильное приложение для измерения скорости через камеру.'}
              </Text>
            </View>
          </View>
        ) : useVisionCamera && Camera && cameraDevice ? (
          // VisionCamera с frame processor (реальное время, без задержек)
          <Camera
            style={styles.camera}
            device={cameraDevice}
            isActive={isDetecting}
            frameProcessor={frameProcessor}
            frameProcessorFps={30}
          >
            {/* Зона детекции */}
            <View style={styles.detectionZone}>
              <View style={[
                styles.detectionZoneBorder,
                isObjectDetected && styles.detectionZoneBorderActive
              ]} />
              <Text style={[
                styles.detectionZoneText,
                isObjectDetected && styles.detectionZoneTextActive
              ]}>
                {isObjectDetected 
                  ? (t('puckSpeed.puckInFrame') || '🎯 Объект в кадре!')
                  : (t('puckSpeed.detectionZone') || 'ЗОНА ДЕТЕКЦИИ')
                }
              </Text>
            </View>

            {/* Статус */}
            <View style={styles.statusOverlay}>
              <Text style={styles.statusText}>{currentStatus}</Text>
              <View style={styles.motionBar}>
                <View
                  style={[
                    styles.motionBarFill,
                    {
                      width: `${Math.min(motionLevel, 100)}%`,
                      backgroundColor: motionLevel > MOTION_THRESHOLD ? '#4CAF50' : '#666',
                    }
                  ]}
                />
              </View>
              <Text style={styles.motionText}>
                {t('puckSpeed.motion') || 'Движение'}: {motionLevel.toFixed(0)}% / {t('puckSpeed.threshold') || 'Порог'}: {MOTION_THRESHOLD.toFixed(0)}%
              </Text>
            </View>
          </Camera>
        ) : CameraView ? (
          // Fallback на expo-camera (старый метод)
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            {/* Зона детекции */}
            <View style={styles.detectionZone}>
              <View style={[
                styles.detectionZoneBorder,
                isObjectDetected && styles.detectionZoneBorderActive
              ]} />
              <Text style={[
                styles.detectionZoneText,
                isObjectDetected && styles.detectionZoneTextActive
              ]}>
                {isObjectDetected 
                  ? (t('puckSpeed.puckInFrame') || '🎯 Объект в кадре!')
                  : (t('puckSpeed.detectionZone') || 'ЗОНА ДЕТЕКЦИИ')
                }
              </Text>
            </View>

            {/* Статус */}
            <View style={styles.statusOverlay}>
              <Text style={styles.statusText}>{currentStatus}</Text>
              <View style={styles.motionBar}>
                <View
                  style={[
                    styles.motionBarFill,
                    {
                      width: `${Math.min(motionLevel, 100)}%`,
                      backgroundColor: motionLevel > MOTION_THRESHOLD ? '#4CAF50' : '#666',
                    }
                  ]}
                />
              </View>
              <Text style={styles.motionText}>
                {t('puckSpeed.motion') || 'Движение'}: {motionLevel.toFixed(0)}% / {t('puckSpeed.threshold') || 'Порог'}: {MOTION_THRESHOLD.toFixed(0)}%
              </Text>
            </View>
          </CameraView>
        ) : (
          <View style={styles.camera}>
            <View style={styles.webCameraContainer}>
              <Ionicons name="camera" size={64} color="#fa2f40" />
              <Text style={styles.webCameraMessage}>
                {t('puckSpeed.cameraNotAvailable') || 'Камера недоступна'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Последний результат */}
      {speedResults.length > 0 && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>
            {t('puckSpeed.lastSpeed') || 'Последняя скорость'}:
          </Text>
          <Text style={styles.resultValue}>
            {Math.round(speedResults[speedResults.length - 1].speedKmh)} {t('puckSpeed.kmh') || 'км/ч'}
          </Text>
        </View>
      )}

      {/* Чувствительность */}
      {isDetecting && (
        <View style={styles.sensitivityContainer}>
          <Text style={styles.sensitivityLabel}>
            {t('puckSpeed.sensitivity') || 'Чувствительность'}: {sensitivity}%
          </Text>
          <View style={styles.sensitivityButtons}>
            <TouchableOpacity
              onPress={() => setSensitivity(Math.max(0, sensitivity - 10))}
              style={styles.sensButton}
            >
              <Text style={styles.sensButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSensitivity(Math.min(100, sensitivity + 10))}
              style={styles.sensButton}
            >
              <Text style={styles.sensButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* История */}
      {speedResults.length > 1 && isDetecting && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>
            {t('puckSpeed.history') || 'История'}:
          </Text>
          {speedResults.slice(-3).reverse().map((result, index) => (
            <Text key={index} style={styles.historyItem}>
              {Math.round(result.speedKmh)} {t('puckSpeed.kmh') || 'км/ч'} ({result.timeMs}мс)
            </Text>
          ))}
        </View>
      )}

      {/* Кнопки управления */}
      <View style={styles.controls}>
        {!isDetecting ? (
          <TouchableOpacity style={styles.startButton} onPress={startDetecting}>
            <Ionicons name="play" size={32} color="#fff" />
            <Text style={styles.startButtonText}>
              {t('puckSpeed.start') || 'СТАРТ'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.stopButton} onPress={stopDetecting}>
              <Ionicons name="stop" size={24} color="#fff" />
              <Text style={styles.stopButtonText}>
                {t('puckSpeed.stop') || 'Стоп'}
              </Text>
            </TouchableOpacity>
            {speedResults.length > 0 && (
              <TouchableOpacity style={styles.resetButton} onPress={resetResults}>
                <Ionicons name="refresh" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Инструкция */}
      {!isDetecting && (
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {t('puckSpeed.cameraInstructions') || 
              `КАК ИСПОЛЬЗОВАТЬ:\n\n1. Установите телефон так, чтобы объект (шайба, мячик и т.д.) пролетел через кадр\n2. Измерьте расстояние (ширину зоны детекции): ${distanceCm} см\n3. Нажмите СТАРТ\n4. Быстро бросьте объект через кадр (не останавливайте его в кадре!)\n\n💡 Можно использовать любой предмет: шайбу, мячик, теннисный мяч и т.д.`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  detectionZone: {
    position: 'absolute',
    top: '50%',
    left: '10%',
    right: '10%',
    height: 200,
    marginTop: -100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionZoneBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  detectionZoneBorderActive: {
    borderColor: '#fa2f40',
    borderWidth: 4,
    borderStyle: 'solid',
    backgroundColor: 'rgba(250, 47, 64, 0.1)',
  },
  detectionZoneText: {
    color: '#4CAF50',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  detectionZoneTextActive: {
    color: '#fa2f40',
    fontSize: 18,
    backgroundColor: 'rgba(250, 47, 64, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  statusOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  motionBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  motionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  motionText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: 'rgba(250, 47, 64, 0.9)',
    padding: 20,
    alignItems: 'center',
  },
  resultLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
  },
  resultValue: {
    color: '#fff',
    fontSize: 48,
    fontFamily: 'DigifaceRegular',
    marginTop: 5,
  },
  sensitivityContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sensitivityLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
  },
  sensitivityButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  sensButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fa2f40',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensButtonText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
  },
  historyContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 10,
  },
  historyItem: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    marginBottom: 5,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 15,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  startButton: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
  },
  stopButton: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  resetButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructions: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 22,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#F44336',
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  webCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webCameraMessage: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 24,
  },
});
