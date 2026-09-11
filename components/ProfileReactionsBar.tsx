import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PROFILE_REACTIONS,
  type ProfileReactionSummary,
  type ProfileReactionType,
  emptyProfileReactionSummary,
  optimisticToggleProfileReaction,
} from '../utils/reactions';
import { loadProfileReactions, toggleProfileReaction } from '../services/reactionService';
import ReactionWhoModal from './ReactionWhoModal';

type ProfileReactionsBarProps = {
  targetPlayerId: string;
  viewerId?: string | null;
  viewerName?: string;
  viewerAvatar?: string | null;
  disabled?: boolean;
};

export default function ProfileReactionsBar({
  targetPlayerId,
  viewerId,
  viewerName,
  viewerAvatar,
  disabled,
}: ProfileReactionsBarProps) {
  const [summary, setSummary] = useState<ProfileReactionSummary>(emptyProfileReactionSummary());
  const [whoModalType, setWhoModalType] = useState<ProfileReactionType | null>(null);
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const refresh = useCallback(async () => {
    const next = await loadProfileReactions(targetPlayerId, viewerId);
    setSummary(next);
  }, [targetPlayerId, viewerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onPress = (type: ProfileReactionType) => {
    if (disabled || !viewerId) return;

    const prev = summaryRef.current;
    const optimistic = optimisticToggleProfileReaction(prev, type, viewerId, {
      id: viewerId,
      name: viewerName || 'You',
      avatar: viewerAvatar,
    });
    setSummary(optimistic);

    void toggleProfileReaction(targetPlayerId, viewerId, type).then((ok) => {
      if (!ok) setSummary(prev);
    });
  };

  const onLongPress = (type: ProfileReactionType) => {
    if (!summary.sendersByType[type].length) return;
    setWhoModalType(type);
  };

  const canReact = !disabled && !!viewerId;

  return (
    <>
      <View style={styles.bar}>
        {PROFILE_REACTIONS.map(({ type, emoji }) => {
          const active = summary.mine.has(type);
          const count = summary.counts[type];
          const isPair = emoji.length > 2;
          return (
            <Pressable
              key={type}
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              onPress={() => onPress(type)}
              onLongPress={() => onLongPress(type)}
              delayLongPress={320}
              disabled={!canReact}
              hitSlop={4}
            >
              <Text
                style={[styles.emoji, isPair && styles.emojiPair]}
                allowFontScaling={false}
              >
                {emoji}
              </Text>
              <Text style={styles.count}>{count}</Text>
            </Pressable>
          );
        })}
      </View>
      <ReactionWhoModal
        visible={!!whoModalType}
        reactionType={whoModalType}
        senders={whoModalType ? summary.sendersByType[whoModalType] : []}
        onClose={() => setWhoModalType(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    width: '100%',
    gap: 6,
    marginTop: 8,
    marginBottom: 2,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 7,
    borderRadius: 14,
    minHeight: 34,
    overflow: 'visible',
  },
  chipIdle: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: '#fa2f40',
  },
  emoji: {
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emojiPair: {
    fontSize: 13,
    letterSpacing: -2,
  },
  count: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    minWidth: 8,
  },
});
