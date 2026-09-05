import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: IconName[] = [
  'hockey-sticks',
  'hockey-puck',
  'skate',
  'whistle',
  'trophy-outline',
  'medal-outline',
  'snowflake',
  'timer-outline',
];

const CELL = 84;
const ICON = 26;

/**
 * Ненавязчивый паттерн из хоккейных иконок (как фоны в Telegram).
 * Статичная сетка, рисуется один раз; opacity низкая, чтобы не мешать контенту.
 */
const HockeyPattern = React.memo(function HockeyPattern({ opacity = 0.055 }: { opacity?: number }) {
  const { width, height } = useWindowDimensions();

  const cells = useMemo(() => {
    const cols = Math.ceil(width / CELL) + 1;
    const rows = Math.ceil(height / CELL) + 1;
    const out: { key: string; x: number; y: number; icon: IconName; rot: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 ? CELL / 2 : 0;
      for (let c = 0; c < cols; c++) {
        const idx = (r * 3 + c * 5) % ICONS.length;
        out.push({
          key: `${r}-${c}`,
          x: c * CELL + offset - CELL / 2,
          y: r * CELL,
          icon: ICONS[idx],
          rot: ((r + c) % 4) * 15 - 22,
        });
      }
    }
    return out;
  }, [width, height]);

  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {cells.map(cell => (
        <MaterialCommunityIcons
          key={cell.key}
          name={cell.icon}
          size={ICON}
          color="#ffffff"
          style={{
            position: 'absolute',
            left: cell.x + (CELL - ICON) / 2,
            top: cell.y + (CELL - ICON) / 2,
            transform: [{ rotate: `${cell.rot}deg` }],
          }}
        />
      ))}
    </View>
  );
});

export default HockeyPattern;
