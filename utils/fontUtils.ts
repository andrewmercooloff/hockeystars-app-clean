import { Platform, PixelRatio, Dimensions } from 'react-native';

// Получаем размеры экрана
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Размеры экрана для компактных Android устройств
// Redmi Note 9: 1080x2340 (393x851 в dp)
// Увеличиваем лимит для захвата Redmi Note 9 и подобных устройств
const COMPACT_ANDROID_WIDTH = 410;
const COMPACT_ANDROID_HEIGHT = 900;

// Функция для масштабирования размеров
export function scaleSize(size: number): number {
  // Для Android устройств с компактным экраном (включая Redmi Note 9)
  if (Platform.OS === 'android' && 
      (screenWidth <= COMPACT_ANDROID_WIDTH || screenHeight <= COMPACT_ANDROID_HEIGHT)) {
    return size * 0.9; // Уменьшаем на 10%
  }
  return size;
}

// Функция для глобального масштабирования всего интерфейса
export function getGlobalScale(): number {
  if (Platform.OS === 'android' && 
      (screenWidth <= COMPACT_ANDROID_WIDTH || screenHeight <= COMPACT_ANDROID_HEIGHT)) {
    return 0.9; // 10% уменьшение
  }
  return 1.0;
}

// Проверка, нужно ли масштабирование
export function shouldScale(): boolean {
  return Platform.OS === 'android' && 
         (screenWidth <= COMPACT_ANDROID_WIDTH || screenHeight <= COMPACT_ANDROID_HEIGHT);
}

// Функция для масштабирования шрифтов
export function scaleFont(size: number): number {
  return scaleSize(size);
}

// Функция для масштабирования отступов
export function scalePadding(size: number): number {
  return scaleSize(size);
}

// Функция для масштабирования margin
export function scaleMargin(size: number): number {
  return scaleSize(size);
}

// Глобальные стили с правильным шрифтом и масштабированием
export const globalStyles = {
  text: {
    fontFamily: 'Gilroy-Regular',
    fontSize: scaleFont(16),
    color: '#FFFFFF',
  },
  textBold: {
    fontFamily: 'Gilroy-Bold',
    fontSize: scaleFont(16),
    color: '#FFFFFF',
  },
  title: {
    fontFamily: 'Gilroy-Bold',
    fontSize: scaleFont(20),
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: 'Gilroy-Regular',
    fontSize: scaleFont(14),
    color: '#CCCCCC',
  },
  smallText: {
    fontFamily: 'Gilroy-Regular',
    fontSize: scaleFont(12),
    color: '#AAAAAA',
  },
  button: {
    fontFamily: 'Gilroy-Bold',
    fontSize: scaleFont(16),
    color: '#FFFFFF',
  },
  input: {
    fontFamily: 'Gilroy-Regular',
    fontSize: scaleFont(16),
    color: '#FFFFFF',
  },
};

// Функция для получения стиля текста с правильным шрифтом
export function getTextStyle(baseStyle: any = {}) {
  return {
    ...globalStyles.text,
    ...baseStyle,
    fontFamily: baseStyle.fontFamily || 'Gilroy-Regular',
  };
}

// Функция для получения стиля заголовка
export function getTitleStyle(baseStyle: any = {}) {
  return {
    ...globalStyles.title,
    ...baseStyle,
    fontFamily: baseStyle.fontFamily || 'Gilroy-Bold',
  };
}

// Функция для получения стиля кнопки
export function getButtonStyle(baseStyle: any = {}) {
  return {
    ...globalStyles.button,
    ...baseStyle,
    fontFamily: baseStyle.fontFamily || 'Gilroy-Bold',
  };
}

// Функция для получения стиля ввода
export function getInputStyle(baseStyle: any = {}) {
  return {
    ...globalStyles.input,
    ...baseStyle,
    fontFamily: baseStyle.fontFamily || 'Gilroy-Regular',
  };
}
