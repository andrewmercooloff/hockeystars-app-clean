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
import ReactionIcon from './ReactionIcon';

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

  return (
    <>
      <View style={styles.bar}>
        {PROFILE_REACTIONS.map(({ type }) => {
          const active = summary.mine.has(type);
          const count = summary.counts[type];
          return (
            <View key={type} style={styles.cell}>
              <Pressable
                style={[styles.button, active && styles.buttonActive]}
                onPress={() => onPress(type)}
                onLongPress={() => onLongPress(type)}
                delayLongPress={320}
                disabled={disabled || !viewerId}
                hitSlop={8}
              >
                <ReactionIcon type={type} size={15} active={active} />
              </Pressable>
              {count > 0 ? (
                <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
              ) : (
                <Text style={styles.countPlaceholder}> </Text>
              )}
            </View>
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
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  button: {
    width: 34,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    opacity: 1,
  },
  count: {
    marginTop: 2,
    minHeight: 12,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  countActive: {
    color: '#fa2f40',
  },
  countPlaceholder: {
    marginTop: 2,
    minHeight: 12,
    fontSize: 10,
  },
});
