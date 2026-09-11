import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  FEED_REACTIONS,
  type FeedReactionSummary,
  type FeedReactionType,
  emptyFeedReactionSummary,
  optimisticSetFeedReaction,
} from '../utils/reactions';
import ReactionIcon from './ReactionIcon';

type MessageReactionsBarProps = {
  summary?: FeedReactionSummary;
  viewerId?: string;
  messageOwnerId: string;
  disabled?: boolean;
  alignRight?: boolean;
  onSummaryChange: (next: FeedReactionSummary) => void;
  onToggle: (type: FeedReactionType) => Promise<boolean>;
};

export default function MessageReactionsBar({
  summary = emptyFeedReactionSummary(),
  viewerId,
  messageOwnerId,
  disabled,
  alignRight,
  onSummaryChange,
  onToggle,
}: MessageReactionsBarProps) {
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const onPress = (type: FeedReactionType) => {
    if (!viewerId || disabled || viewerId === messageOwnerId) return;
    const prev = summaryRef.current;
    const optimistic = optimisticSetFeedReaction(prev, type);
    onSummaryChange(optimistic);
    void onToggle(type).then((ok) => {
      if (!ok) onSummaryChange(prev);
    });
  };

  return (
    <View style={[styles.wrap, alignRight ? styles.wrapRight : styles.wrapLeft]}>
      {FEED_REACTIONS.map(({ type }) => {
        const active = summary.mine === type;
        const count = summary.counts[type];
        return (
          <Pressable
            key={type}
            style={[styles.chip, active && styles.chipActive, count === 0 && !active && styles.chipIdle]}
            onPress={() => onPress(type)}
            disabled={!viewerId || disabled || viewerId === messageOwnerId}
            hitSlop={4}
          >
            <ReactionIcon type={type} size={15} active={active} />
            {count > 0 ? <Text style={[styles.count, active && styles.countActive]}>{count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    maxWidth: '88%',
  },
  wrapRight: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  wrapLeft: {
    alignSelf: 'flex-start',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipIdle: {
    backgroundColor: 'transparent',
    opacity: 0.75,
  },
  chipActive: {
    backgroundColor: 'rgba(250, 47, 64, 0.14)',
    opacity: 1,
  },
  count: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontFamily: 'Gilroy-Bold',
  },
  countActive: {
    color: '#fa2f40',
  },
});
