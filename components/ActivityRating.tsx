import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStarBadgeText, shouldShowStarBadge, type StarBadgePlayer } from '../utils/starBadge';

interface PlayerStarBadgeProps {
  player: StarBadgePlayer;
  style?: object;
  /** In lists, hide skaters with 0 career points. Profile shows 0. */
  hideZero?: boolean;
  compact?: boolean;
  /** Scout/search row — no absolute positioning. */
  inline?: boolean;
}

/** Star badge: career points (field) or SV% (goalie). */
export default function PlayerStarBadge({
  player,
  style,
  hideZero = false,
  compact = false,
  inline = false,
}: PlayerStarBadgeProps) {
  if (!shouldShowStarBadge(player, { hideZero })) {
    return null;
  }

  const text = getStarBadgeText(player);
  const isGoalieStat = text.includes('.');

  return (
    <View style={[inline ? styles.inlineContainer : styles.container, style]}>
      <View
        style={[
          inline ? styles.inlineRatingContainer : styles.ratingContainer,
          compact && !inline && styles.ratingContainerCompact,
        ]}
      >
        <Ionicons
          name="star"
          size={inline ? 11 : compact ? 11 : 8}
          color={inline ? '#a1a1aa' : '#FFFFFF'}
        />
        <Text
          style={[
            inline ? styles.inlinePointsText : styles.pointsText,
            compact && !inline && styles.pointsTextCompact,
            isGoalieStat && (inline ? styles.inlineGoalieText : styles.goalieText),
          ]}
          numberOfLines={1}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  inlineContainer: {
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fa2f40',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingContainerCompact: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inlineRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pointsText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 1,
  },
  pointsTextCompact: {
    fontSize: 10,
    marginLeft: 2,
  },
  goalieText: {
    fontSize: 9,
    letterSpacing: -0.3,
  },
  inlinePointsText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#a1a1aa',
  },
  inlineGoalieText: {
    fontSize: 11,
    letterSpacing: -0.3,
  },
});
