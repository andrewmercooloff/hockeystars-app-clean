import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FEED_REACTIONS,
  PROFILE_REACTIONS,
  type FeedReactionType,
  type ProfileReactionType,
} from '../utils/reactions';

export type ReactionIconType = ProfileReactionType | FeedReactionType;

type ReactionIconProps = {
  type: ReactionIconType;
  size?: number;
  active?: boolean;
};

function emojiForType(type: ReactionIconType): string {
  const profile = PROFILE_REACTIONS.find((r) => r.type === type);
  if (profile) return profile.emoji;
  const feed = FEED_REACTIONS.find((r) => r.type === type);
  return feed?.emoji ?? '👍🏻';
}

export default function ReactionIcon({ type, size = 18, active = false }: ReactionIconProps) {
  const glyph = emojiForType(type);
  const compact = glyph.length > 2;

  return (
    <Text
      style={[
        styles.glyph,
        { fontSize: compact ? size - 2 : size, lineHeight: size + 4 },
        active && styles.glyphActive,
      ]}
      allowFontScaling={false}
    >
      {glyph}
    </Text>
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
  glyph: {
    textAlign: 'center',
    opacity: 0.92,
  },
  glyphActive: {
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
