import React from 'react';
import { View, ViewProps } from 'react-native';

type BlurOrSolidProps = ViewProps & {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  children: React.ReactNode;
};

/**
 * Раньше — BlurView. Контентные экраны теперь на глухом графите,
 * блюр над сплошным цветом ничего не даёт и заметно стоит на Android,
 * поэтому это обычный контейнер. Пропсы intensity/tint оставлены для совместимости.
 */
export const BlurOrSolid = React.memo(function BlurOrSolid({
  intensity: _intensity,
  tint: _tint,
  style,
  children,
  ...rest
}: BlurOrSolidProps) {
  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
});
