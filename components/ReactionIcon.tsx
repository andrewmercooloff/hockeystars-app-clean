import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FeedReactionType, ProfileReactionType } from '../utils/reactions';

export type ReactionIconType = ProfileReactionType | FeedReactionType;

type ReactionIconProps = {
  type: ReactionIconType;
  size?: number;
  color?: string;
  active?: boolean;
};

const ICONS: Record<
  ReactionIconType,
  { family: 'ionicons' | 'mci'; name: string }
> = {
  respect: { family: 'mci', name: 'handshake-outline' },
  like: { family: 'ionicons', name: 'thumbs-up-outline' },
  strength: { family: 'ionicons', name: 'barbell-outline' },
  high_five: { family: 'ionicons', name: 'hand-right-outline' },
  fire: { family: 'ionicons', name: 'flame-outline' },
  lightning: { family: 'ionicons', name: 'flash-outline' },
};

export default function ReactionIcon({
  type,
  size = 16,
  color = 'rgba(255,255,255,0.72)',
  active = false,
}: ReactionIconProps) {
  const spec = ICONS[type];
  const tint = active ? '#fa2f40' : color;

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

export function ReactionIconBadge({
  type,
  size = 18,
}: {
  type: ReactionIconType;
  size?: number;
}) {
  return (
    <View style={styles.badge}>
      <ReactionIcon type={type} size={size} color="#fff" active />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(250, 47, 64, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
