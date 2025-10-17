import React from 'react';
import { View, ViewStyle } from 'react-native';
import { getGlobalScale, shouldScale } from '../utils/fontUtils';

interface ScaledContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  enableScaling?: boolean;
}

/**
 * Контейнер с автоматическим масштабированием для компактных Android устройств
 * Уменьшает все содержимое на 10% для устройств типа Redmi Note 9
 */
export const ScaledContainer: React.FC<ScaledContainerProps> = ({ 
  children, 
  style, 
  enableScaling = true 
}) => {
  const scale = enableScaling ? getGlobalScale() : 1.0;
  const needsScaling = enableScaling && shouldScale();

  if (!needsScaling) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[style, { transform: [{ scale }] }]}>
      {children}
    </View>
  );
};

export default ScaledContainer;











