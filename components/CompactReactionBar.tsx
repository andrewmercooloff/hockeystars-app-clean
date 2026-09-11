import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  FEED_REACTIONS,
  type FeedReactionType,
  emptyFeedReactionSummary,
  optimisticSetFeedReaction,
} from '../utils/reactions';
import { loadFeedReactions, setFeedReaction } from '../services/reactionService';
import ReactionIcon from './ReactionIcon';

type CompactReactionBarProps = {
  notificationId: string;
  notificationType: string;
  recipientId: string;
  viewerId?: string | null;
  /** Inline circles to the left of the card's trailing badge. */
  inline?: boolean;
};

export default function CompactReactionBar({
  notificationId,
  notificationType,
  recipientId,
  viewerId,
  inline = true,
}: CompactReactionBarProps) {
  const [summary, setSummary] = useState(emptyFeedReactionSummary());
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const refresh = useCallback(async () => {
    const next = await loadFeedReactions(notificationId, viewerId);
    setSummary(next);
  }, [notificationId, viewerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onPress = (type: FeedReactionType) => {
    if (!viewerId || viewerId === recipientId) return;

    const prev = summaryRef.current;
    const optimistic = optimisticSetFeedReaction(prev, type);
    setSummary(optimistic);

    void setFeedReaction(
      notificationId,
      viewerId,
      type,
      recipientId,
      notificationType
    ).then((ok) => {
      if (!ok) setSummary(prev);
    });
  };

  return (
    <View style={inline ? styles.inlineBar : styles.bar}>
      {FEED_REACTIONS.map(({ type }) => {
        const active = summary.mine === type;
        const count = summary.counts[type];
        return (
          <Pressable
            key={type}
            style={[
              inline ? styles.circle : styles.chip,
              active && (inline ? styles.circleActive : styles.chipActive),
            ]}
            onPress={() => onPress(type)}
            disabled={!viewerId || viewerId === recipientId}
            hitSlop={4}
          >
            <ReactionIcon type={type} size={inline ? 13 : 17} active={active} />
            {!inline && count > 0 ? (
              <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  inlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginRight: 4,
    flexShrink: 0,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  circleActive: {
    backgroundColor: 'rgba(250, 47, 64, 0.2)',
  },
  bar: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    alignSelf: 'stretch',
    width: '100%',
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minHeight: 26,
  },
  chipActive: {
    backgroundColor: 'rgba(250, 47, 64, 0.14)',
  },
  count: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
  },
  countActive: {
    color: '#fa2f40',
  },
});
