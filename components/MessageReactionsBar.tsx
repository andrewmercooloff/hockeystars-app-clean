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
  /** inline: only applied reactions; picker: all reactions for long-press menu */
  variant?: 'inline' | 'picker';
  onSummaryChange: (next: FeedReactionSummary) => void;
  onToggle: (type: FeedReactionType) => Promise<boolean>;
  onPicked?: () => void;
};

function hasVisibleReactions(summary: FeedReactionSummary): boolean {
  return FEED_REACTIONS.some(({ type }) => summary.counts[type] > 0);
}

export default function MessageReactionsBar({
  summary = emptyFeedReactionSummary(),
  viewerId,
  messageOwnerId,
  disabled,
  alignRight,
  variant = 'inline',
  onSummaryChange,
  onToggle,
  onPicked,
}: MessageReactionsBarProps) {
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const canReact = !!viewerId && !disabled && viewerId !== messageOwnerId;
  const isPicker = variant === 'picker';

  const onPress = (type: FeedReactionType) => {
    if (!canReact) return;
    const prev = summaryRef.current;
    const optimistic = optimisticSetFeedReaction(prev, type);
    onSummaryChange(optimistic);
    void onToggle(type).then((ok) => {
      if (!ok) onSummaryChange(prev);
    });
    onPicked?.();
  };

  const visibleReactions = isPicker
    ? FEED_REACTIONS
    : FEED_REACTIONS.filter(({ type }) => summary.counts[type] > 0);

  if (!isPicker && !hasVisibleReactions(summary)) {
    return null;
  }

  return (
    <View
      style={[
        isPicker ? styles.pickerWrap : styles.wrap,
        !isPicker && (alignRight ? styles.wrapRight : styles.wrapLeft),
      ]}
    >
      {visibleReactions.map(({ type }) => {
        const active = summary.mine === type;
        const count = summary.counts[type];
        return (
          <Pressable
            key={type}
            style={[
              isPicker ? styles.pickerChip : styles.chip,
              !isPicker && active && styles.chipActive,
            ]}
            onPress={() => onPress(type)}
            disabled={!canReact}
            hitSlop={isPicker ? 6 : 4}
          >
            <ReactionIcon type={type} size={isPicker ? 22 : 15} active={active || isPicker} />
            {!isPicker && count > 0 ? (
              <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
            ) : null}
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
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(250, 47, 64, 0.18)',
  },
  count: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontFamily: 'Gilroy-Bold',
  },
  countActive: {
    color: '#fa2f40',
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(28, 28, 33, 0.98)',
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  pickerChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
