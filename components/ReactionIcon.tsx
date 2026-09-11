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
  const isPair = glyph.length > 2;
  const fontSize = isPair ? Math.round(size * 0.78) : size;
  const boxHeight = size + 6;

  return (
    <View style={[styles.wrap, { height: boxHeight, minWidth: size + 2 }]}>
      <Text
        style={[
          styles.glyph,
          {
            fontSize,
            lineHeight: boxHeight,
          },
          isPair && styles.glyphPair,
          active ? styles.glyphActive : styles.glyphIdle,
        ]}
        allowFontScaling={false}
      >
        {glyph}
      </Text>
    </View>
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
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glyph: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  glyphPair: {
    letterSpacing: -3,
  },
  glyphIdle: {
    opacity: 0.55,
  },
  glyphActive: {
    opacity: 1,
    transform: [{ scale: 1.06 }],
  },
  badge: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.35)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'visible',
  },
});
