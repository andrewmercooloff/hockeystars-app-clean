import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  FEED_REACTIONS,
  type FeedReactionType,
  emptyFeedReactionSummary,
  optimisticSetFeedReaction,
} from '../utils/reactions';
import { loadFeedReactions, setFeedReaction } from '../services/reactionService';
import ReactionIcon from './ReactionIcon';
import FeedReactionPickerSheet from './FeedReactionPickerSheet';
import {
  NOTIFICATION_REACTIONS_INSET,
  NOTIFICATION_REACTIONS_INSET_PADDED,
} from '../utils/notificationCard';

type CompactReactionBarProps = {
  notificationId: string;
  notificationType: string;
  recipientId: string;
  viewerId?: string | null;
  footerTime?: string;
  embedded?: boolean;
  /** Cards with outer padding (stats, physical data) — skip extra horizontal inset. */
  paddedCard?: boolean;
};

export default function CompactReactionBar({
  notificationId,
  notificationType,
  recipientId,
  viewerId,
  footerTime,
  embedded = true,
  paddedCard = false,
}: CompactReactionBarProps) {
  const [summary, setSummary] = useState(emptyFeedReactionSummary());
  const [pickerOpen, setPickerOpen] = useState(false);
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const canReact = !!viewerId && viewerId !== recipientId;

  const refresh = useCallback(async () => {
    const next = await loadFeedReactions(notificationId, viewerId);
    setSummary(next);
  }, [notificationId, viewerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onPress = (type: FeedReactionType) => {
    if (!canReact) return;

    const prev = summaryRef.current;
    const optimistic = optimisticSetFeedReaction(prev, type);
    setSummary(optimistic);

    void setFeedReaction(
      notificationId,
      viewerId!,
      type,
      recipientId,
      notificationType
    ).then((ok) => {
      if (!ok) setSummary(prev);
    });
  };

  const visibleReactions = FEED_REACTIONS.filter(({ type }) => summary.counts[type] > 0);

  return (
    <>
      <View
        style={[
          styles.footerRow,
          embedded && (paddedCard ? NOTIFICATION_REACTIONS_INSET_PADDED : NOTIFICATION_REACTIONS_INSET),
        ]}
      >
        {footerTime ? (
          <Text style={styles.footerTime} numberOfLines={1}>
            {footerTime}
          </Text>
        ) : (
          <View />
        )}

        <View style={styles.footerRight}>
          {visibleReactions.map(({ type }) => {
            const active = summary.mine === type;
            const count = summary.counts[type];
            return (
              <Pressable
                key={type}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onPress(type)}
                disabled={!canReact}
                hitSlop={4}
              >
                <ReactionIcon type={type} size={15} active={active} />
                <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
              </Pressable>
            );
          })}

          {canReact ? (
            <Pressable
              style={styles.addButton}
              onPress={() => setPickerOpen(true)}
              hitSlop={6}
              accessibilityLabel="Add reaction"
            >
              <Ionicons name="add" size={16} color="rgba(255,255,255,0.75)" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FeedReactionPickerSheet
        visible={pickerOpen}
        summary={summary}
        disabled={!canReact}
        onClose={() => setPickerOpen(false)}
        onSelect={onPress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 28,
  },
  footerTime: {
    color: '#71717a',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    flexShrink: 0,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'visible',
  },
  chipActive: {
    borderColor: 'rgba(250, 47, 64, 0.55)',
  },
  count: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    minWidth: 10,
  },
  countActive: {
    color: '#fa2f40',
  },
  addButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
