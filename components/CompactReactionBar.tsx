import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  NOTIFICATION_FEED_REACTIONS,
  type FeedReactionType,
  emptyFeedReactionSummary,
  optimisticSetFeedReaction,
} from '../utils/reactions';
import { loadFeedReactions, setFeedReaction } from '../services/reactionService';
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
        {NOTIFICATION_FEED_REACTIONS.map(({ type, emoji }) => {
          const active = summary.mine === type;
          const count = summary.counts[type];
          const isPair = emoji.length > 2;
          return (
            <Pressable
              key={type}
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              onPress={() => onPress(type)}
              disabled={!canReact}
              hitSlop={4}
            >
              <Text
                style={[styles.emoji, isPair && styles.emojiPair]}
                allowFontScaling={false}
              >
                {emoji}
              </Text>
              {count > 0 ? <Text style={styles.count}>{count}</Text> : null}
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
    gap: 6,
    minHeight: 20,
  },
  footerTime: {
    color: '#71717a',
    fontSize: 10,
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
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    minHeight: 24,
    overflow: 'visible',
  },
  chipIdle: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: '#fa2f40',
  },
  emoji: {
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emojiPair: {
    fontSize: 10,
    letterSpacing: -2,
  },
  count: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
    minWidth: 8,
  },
});
