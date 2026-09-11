import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  /** inline: compact badge on bubble corner; picker: all reactions for long-press menu */
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
    <View style={isPicker ? styles.pickerWrap : styles.inlineWrap}>
      {visibleReactions.map(({ type }) => {
        const active = summary.mine === type;
        return (
          <Pressable
            key={type}
            style={[
              isPicker ? styles.pickerChip : styles.inlineChip,
              !isPicker && active && styles.inlineChipActive,
            ]}
            onPress={() => onPress(type)}
            disabled={!canReact}
            hitSlop={isPicker ? 6 : 4}
          >
            <ReactionIcon type={type} size={isPicker ? 22 : 13} active={active || isPicker} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  inlineWrap: {
    position: 'absolute',
    right: 4,
    bottom: -7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    zIndex: 2,
  },
  inlineChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  inlineChipActive: {
    backgroundColor: 'rgba(250, 47, 64, 0.35)',
    borderColor: 'rgba(250, 47, 64, 0.45)',
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
