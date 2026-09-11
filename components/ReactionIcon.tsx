import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FeedReactionType, ProfileReactionType } from '../utils/reactions';

export type ReactionIconType = ProfileReactionType | FeedReactionType;

type ReactionIconProps = {
  type: ReactionIconType;
  size?: number;
  active?: boolean;
};

const VECTOR_ICONS: Record<
  Exclude<ReactionIconType, 'respect'>,
  { family: 'ionicons' | 'mci'; name: string }
> = {
  like: { family: 'ionicons', name: 'thumbs-up' },
  strength: { family: 'mci', name: 'arm-flex' },
  high_five: { family: 'ionicons', name: 'hand-left' },
  fire: { family: 'ionicons', name: 'flame' },
  lightning: { family: 'ionicons', name: 'flash' },
};

function RespectFistsIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <Text
      style={[
        styles.fists,
        { fontSize: Math.round(size * 0.72), lineHeight: size + 2 },
        active && styles.fistsActive,
      ]}
      allowFontScaling={false}
    >
      🤜🤛
    </Text>
  );
}

export default function ReactionIcon({ type, size = 18, active = false }: ReactionIconProps) {
  if (type === 'respect') {
    return <RespectFistsIcon size={size} active={active} />;
  }

  const spec = VECTOR_ICONS[type];
  const tint = active ? '#fa2f40' : 'rgba(255,255,255,0.88)';

  if (spec.family === 'mci') {
    return (
      <MaterialCommunityIcons
        name={spec.name as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size}
        color={tint}
      />
    );
  }

  return (
    <Ionicons
      name={spec.name as keyof typeof Ionicons.glyphMap}
      size={size}
      color={tint}
    />
  );
}

export function ReactionIconBadge({ type, size = 20 }: { type: ReactionIconType; size?: number }) {
  return (
    <View style={styles.badge}>
      <ReactionIcon type={type} size={size} active />
    </View>
  );
}

const styles = StyleSheet.create({
  fists: {
    textAlign: 'center',
    opacity: 0.92,
    letterSpacing: -2,
  },
  fistsActive: {
    opacity: 1,
    transform: [{ scale: 1.06 }],
  },
  badge: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(250, 47, 64, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
