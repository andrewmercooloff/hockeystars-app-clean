import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChangeIndicatorProps {
  change: number;
  size?: 'small' | 'medium' | 'large' | 'normative';
}

const ChangeIndicator: React.FC<ChangeIndicatorProps> = ({ 
  change, 
  size = 'small' 
}) => {
  if (change === 0) return null;

  const isPositive = change > 0;
  const displayText = isPositive ? `+${change}` : change.toString();
  
  const sizeStyles = {
    small: {
      container: styles.smallContainer,
      text: styles.smallText
    },
    medium: {
      container: styles.mediumContainer,
      text: styles.mediumText
    },
    large: {
      container: styles.largeContainer,
      text: styles.largeText
    },
    normative: {
      container: styles.normativeContainer,
      text: styles.normativeText
    }
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={currentSize.container}>
      <Text style={[
        currentSize.text, 
        styles.changeText,
        size === 'normative' 
          ? { color: '#FFFFFF' } // Белый текст для нормативов
          : (isPositive ? styles.positiveText : styles.negativeText)
      ]}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  smallContainer: {
    position: 'absolute',
    top: -47,
    right: -11,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 16,
    minHeight: 16,
  },
  mediumContainer: {
    position: 'absolute',
    top: -51,
    right: -13,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    minHeight: 20,
  },
  largeContainer: {
    position: 'absolute',
    top: -55,
    right: -15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 24,
    minHeight: 24,
  },
  normativeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 16,
    minHeight: 16,
  },
  positiveChange: {
    // Убираем фон
  },
  negativeChange: {
    // Убираем фон
  },
  positiveText: {
    color: '#000000', // Черный цвет для статистики
  },
  negativeText: {
    color: '#000000', // Черный цвет для статистики
  },
  smallText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  mediumText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  largeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  normativeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  changeText: {
    textAlign: 'center',
  },
});

export default ChangeIndicator;
