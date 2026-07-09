// Цветовая палитра приложения
export const COLORS = {
  // Основные цвета
  ICE_BLUE: '#1a2332',        // Темно-синий, приближенный к льду
  ICE_BLUE_LIGHT: '#2a3441',  // Светлее для контраста
  ICE_BLUE_DARK: '#0f1419',   // Темнее для глубоких теней
  
  // Акцентные цвета
  RED: '#fa2f40',             // Основной красный
  WHITE: '#ffffff',           // Белый
  GRAY: '#333333',            // Серый для элементов
  
  // Фоновые цвета (заменяют черный)
  BACKGROUND: '#050008',
  BACKGROUND_LIGHT: '#9BB3C1', // Светлый фон
  BACKGROUND_DARK: '#6B8A9A',  // Темный фон
  
  // Старые цвета (для совместимости)
  BLACK: '#000000',           // Оставляем для элементов, которые должны быть черными
} as const;

// Функция для получения цвета фона в зависимости от контекста
export const getBackgroundColor = (variant: 'default' | 'light' | 'dark' = 'default'): string => {
  switch (variant) {
    case 'light':
      return COLORS.BACKGROUND_LIGHT;
    case 'dark':
      return COLORS.BACKGROUND_DARK;
    default:
      return COLORS.BACKGROUND;
  }
};
