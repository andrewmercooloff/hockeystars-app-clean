import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PROFILE_REACTIONS,
  type ProfileReactionSummary,
  type ProfileReactionType,
  emptyProfileReactionSummary,
  optimisticToggleProfileReaction,
} from '../utils/reactions';
import { loadProfileReactions, toggleProfileReaction } from '../services/reactionService';
import ReactionWhoModal from './ReactionWhoModal';
import ProfileReactionsSheet from './ProfileReactionsSheet';
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
  const [sheetOpen, setSheetOpen] = useState(false);
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
    setSheetOpen(false);
    setWhoModalType(type);
  };

  const visibleReactions = PROFILE_REACTIONS.filter(({ type }) => summary.counts[type] > 0);
  const canReact = !disabled && !!viewerId;

  return (
    <>
      <View style={styles.bar}>
        {visibleReactions.map(({ type }) => {
          const active = summary.mine.has(type);
          const count = summary.counts[type];
          return (
            <Pressable
              key={type}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onPress(type)}
              onLongPress={() => onLongPress(type)}
              delayLongPress={320}
              disabled={!canReact}
              hitSlop={6}
            >
              <ReactionIcon type={type} size={16} active={active} />
              <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
            </Pressable>
          );
        })}

        {canReact ? (
          <Pressable
            style={styles.addButton}
            onPress={() => setSheetOpen(true)}
            hitSlop={6}
            accessibilityLabel="Add reaction"
          >
            <Ionicons name="add" size={16} color="rgba(255,255,255,0.75)" />
          </Pressable>
        ) : null}
      </View>

      <ProfileReactionsSheet
        visible={sheetOpen}
        summary={summary}
        disabled={!canReact}
        onClose={() => setSheetOpen(false)}
        onToggle={onPress}
        onLongPress={onLongPress}
      />
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
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'visible',
  },
  chipActive: {
    borderColor: 'rgba(250, 47, 64, 0.55)',
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
  },
  countActive: {
    color: '#fa2f40',
  },
});
