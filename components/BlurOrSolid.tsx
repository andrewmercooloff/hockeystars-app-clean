import React from 'react';
import { Platform, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

type BlurOrSolidProps = ViewProps & {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  children: React.ReactNode;
};

/**
 * На Android expo-blur рисуется тёмным полупрозрачным слоем («рамка» по краям карточек).
 * Здесь для Android используем обычный View — фон задаёт внутренний контент (как у чатов/уведомлений).
 */
export const BlurOrSolid = React.memo(function BlurOrSolid({
  intensity = 20,
  tint = 'dark',
  style,
  children,
  ...rest
}: BlurOrSolidProps) {
  if (Platform.OS === 'android') {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
});
