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
import { NOTIFICATION_REACTIONS_INSET } from '../utils/notificationCard';

type CompactReactionBarProps = {
  notificationId: string;
  notificationType: string;
  recipientId: string;
  viewerId?: string | null;
  embedded?: boolean;
};

export default function CompactReactionBar({
  notificationId,
  notificationType,
  recipientId,
  viewerId,
  embedded = true,
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
    <View style={[styles.bar, embedded && NOTIFICATION_REACTIONS_INSET]}>
      {FEED_REACTIONS.map(({ type }) => {
        const active = summary.mine === type;
        const count = summary.counts[type];
        return (
          <Pressable
            key={type}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onPress(type)}
            disabled={!viewerId || viewerId === recipientId}
            hitSlop={6}
          >
            <ReactionIcon type={type} size={17} active={active} />
            {count > 0 ? <Text style={[styles.count, active && styles.countActive]}>{count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'stretch',
    width: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minHeight: 30,
    justifyContent: 'center',
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
