import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHAKE_HINT_SHOWN_KEY = 'shake_hint_shown_v1';

interface ShakeHintProps {
  delay?: number; // Задержка перед показом (мс)
}

const ShakeHint: React.FC<ShakeHintProps> = memo(({ delay = 2000 }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.8);

  // Проверяем, показывали ли уже подсказку
  useEffect(() => {
    const checkIfShown = async () => {
      try {
        const wasShown = await AsyncStorage.getItem(SHAKE_HINT_SHOWN_KEY);
        if (!wasShown) {
          setShouldShow(true);
        }
      } catch (error) {
        console.log('Error checking shake hint status:', error);
      }
    };
    
    if (Platform.OS !== 'web') {
      checkIfShown();
    }
  }, []);

  // Показываем и прячем подсказку
  useEffect(() => {
    if (!shouldShow) return;

    const showHint = async () => {
      setIsVisible(true);
      
      // Анимация появления
      opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
      scale.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) }));
      
      // Анимация покачивания (имитация shake)
      translateX.value = withDelay(delay + 400, 
        withRepeat(
          withSequence(
            withTiming(-8, { duration: 80 }),
            withTiming(8, { duration: 80 }),
            withTiming(-6, { duration: 80 }),
            withTiming(6, { duration: 80 }),
            withTiming(0, { duration: 80 })
          ),
          2, // Повторить 2 раза
          false
        )
      );
      
      // Исчезновение через 3 секунды
      opacity.value = withDelay(delay + 3000, withTiming(0, { duration: 500 }, () => {
        runOnJS(setIsVisible)(false);
      }));
      scale.value = withDelay(delay + 3000, withTiming(0.8, { duration: 500 }));
      
      // Сохраняем, что показали
      try {
        await AsyncStorage.setItem(SHAKE_HINT_SHOWN_KEY, 'true');
      } catch (error) {
        console.log('Error saving shake hint status:', error);
      }
    };

    showHint();
  }, [shouldShow, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { scale: scale.value }
    ],
  }));

  if (!isVisible && !shouldShow) return null;
  if (Platform.OS === 'web') return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <View style={styles.content}>
        <Ionicons name="phone-portrait-outline" size={24} color="#fff" style={styles.icon} />
        <Text style={styles.text}>SHAKE!</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default ShakeHint;
