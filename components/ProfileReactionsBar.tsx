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

  const canReact = !disabled && !!viewerId;

  return (
    <>
      <View style={styles.bar}>
        {PROFILE_REACTIONS.map(({ type }) => {
          const active = summary.mine.has(type);
          const count = summary.counts[type];
          return (
            <Pressable
              key={type}
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              onPress={() => onPress(type)}
              onLongPress={() => onLongPress(type)}
              delayLongPress={320}
              disabled={!canReact}
              hitSlop={6}
            >
              <ReactionIcon type={type} size={15} active={active} />
              {count > 0 ? (
                <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
              ) : null}
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
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 2,
    gap: 5,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  },
  countActive: {
    color: '#fa2f40',
  },
});
