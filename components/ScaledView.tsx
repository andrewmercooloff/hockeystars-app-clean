import React from 'react';
import { View, ViewProps, Platform, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Размеры экрана Redmi 9 (примерно 393x851)
const REDMI_9_WIDTH = 393;

interface ScaledViewProps extends ViewProps {
  children: React.ReactNode;
}

export const ScaledView: React.FC<ScaledViewProps> = ({ style, children, ...props }) => {
  // Только для Android устройств с разрешением как у Redmi 9 (или меньше)
  const shouldScale = Platform.OS === 'android' && screenWidth <= REDMI_9_WIDTH;
  
  const scaledStyle = shouldScale ? {
    ...style,
    // Масштабируем размеры, отступы и margin
    width: style && typeof style === 'object' && 'width' in style 
      ? (style.width as number) * 0.9 
      : undefined,
    height: style && typeof style === 'object' && 'height' in style 
      ? (style.height as number) * 0.9 
      : undefined,
    padding: style && typeof style === 'object' && 'padding' in style 
      ? (style.padding as number) * 0.9 
      : undefined,
    margin: style && typeof style === 'object' && 'margin' in style 
      ? (style.margin as number) * 0.9 
      : undefined,
    paddingHorizontal: style && typeof style === 'object' && 'paddingHorizontal' in style 
      ? (style.paddingHorizontal as number) * 0.9 
      : undefined,
    paddingVertical: style && typeof style === 'object' && 'paddingVertical' in style 
      ? (style.paddingVertical as number) * 0.9 
      : undefined,
    marginHorizontal: style && typeof style === 'object' && 'marginHorizontal' in style 
      ? (style.marginHorizontal as number) * 0.9 
      : undefined,
    marginVertical: style && typeof style === 'object' && 'marginVertical' in style 
      ? (style.marginVertical as number) * 0.9 
      : undefined,
  } : style;

  return (
    <View style={scaledStyle} {...props}>
      {children}
    </View>
  );
};











