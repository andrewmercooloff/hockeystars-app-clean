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

  return (
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
        {FEED_REACTIONS.map(({ type }) => {
          const active = summary.mine === type;
          const count = summary.counts[type];
          return (
            <Pressable
              key={type}
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              onPress={() => onPress(type)}
              disabled={!canReact}
              hitSlop={4}
            >
              <ReactionIcon type={type} size={14} active={active} />
              {count > 0 ? (
                <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 26,
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
    gap: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'visible',
  },
  chipIdle: {
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    opacity: 0.55,
  },
  chipActive: {
    borderColor: 'rgba(250, 47, 64, 0.55)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    opacity: 1,
  },
  count: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
    minWidth: 8,
  },
  countActive: {
    color: '#fa2f40',
  },
});
