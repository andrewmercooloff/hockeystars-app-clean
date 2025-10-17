import React from 'react';
import { Text, TextProps, Platform, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Размеры экрана Redmi 9 (примерно 393x851)
const REDMI_9_WIDTH = 393;

interface ScaledTextProps extends TextProps {
  children: React.ReactNode;
}

export const ScaledText: React.FC<ScaledTextProps> = ({ style, children, ...props }) => {
  // Только для Android устройств с разрешением как у Redmi 9 (или меньше)
  const shouldScale = Platform.OS === 'android' && screenWidth <= REDMI_9_WIDTH;
  
  const scaledStyle = shouldScale ? {
    ...style,
    fontSize: style && typeof style === 'object' && 'fontSize' in style 
      ? (style.fontSize as number) * 0.9 
      : 16 * 0.9, // Уменьшаем на 10%
  } : style;

  return (
    <Text style={scaledStyle} {...props}>
      {children}
    </Text>
  );
};











