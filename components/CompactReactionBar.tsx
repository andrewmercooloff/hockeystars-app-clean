import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  FEED_REACTIONS,
  type FeedReactionType,
  emptyFeedReactionSummary,
} from '../utils/reactions';
import { loadFeedReactions, setFeedReaction } from '../services/reactionService';
import { useLanguage } from '../contexts/LanguageContext';

type CompactReactionBarProps = {
  notificationId: string;
  notificationType: string;
  recipientId: string;
  viewerId?: string | null;
};

export default function CompactReactionBar({
  notificationId,
  notificationType,
  recipientId,
  viewerId,
}: CompactReactionBarProps) {
  const { t } = useLanguage();
  const [summary, setSummary] = useState(emptyFeedReactionSummary());
  const [loadingType, setLoadingType] = useState<FeedReactionType | null>(null);

  const refresh = useCallback(async () => {
    const next = await loadFeedReactions(notificationId, viewerId);
    setSummary(next);
  }, [notificationId, viewerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onPress = async (type: FeedReactionType) => {
    if (!viewerId || loadingType || viewerId === recipientId) return;
    setLoadingType(type);
    try {
      const next = await setFeedReaction(
        notificationId,
        viewerId,
        type,
        recipientId,
        notificationType
      );
      if (next) setSummary(next);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <View style={styles.bar}>
      {FEED_REACTIONS.map(({ type, emoji }) => {
        const active = summary.mine === type;
        const count = summary.counts[type];
        return (
          <Pressable
            key={type}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => void onPress(type)}
            disabled={!viewerId || viewerId === recipientId}
          >
            {loadingType === type ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.emoji}>{emoji}</Text>
                {count > 0 ? <Text style={styles.count}>{count}</Text> : null}
              </>
            )}
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
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 44,
    minHeight: 34,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(250, 47, 64, 0.15)',
    borderColor: 'rgba(250, 47, 64, 0.4)',
  },
  emoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  count: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
  },
});
