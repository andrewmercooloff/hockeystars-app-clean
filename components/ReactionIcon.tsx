import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FeedReactionType, ProfileReactionType } from '../utils/reactions';

export type ReactionIconType = ProfileReactionType | FeedReactionType;

type ReactionIconProps = {
  type: ReactionIconType;
  size?: number;
  active?: boolean;
};

const ICONS: Record<
  ReactionIconType,
  { family: 'ionicons' | 'mci'; name: string }
> = {
  respect: { family: 'mci', name: 'handshake' },
  like: { family: 'ionicons', name: 'thumbs-up' },
  strength: { family: 'mci', name: 'arm-flex' },
  high_five: { family: 'ionicons', name: 'hand-left' },
  fire: { family: 'ionicons', name: 'flame' },
  lightning: { family: 'ionicons', name: 'flash' },
};

export default function ReactionIcon({ type, size = 18, active = false }: ReactionIconProps) {
  const spec = ICONS[type];
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
