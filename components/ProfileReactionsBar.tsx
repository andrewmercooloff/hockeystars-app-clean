import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PROFILE_REACTIONS,
  type ProfileReactionSummary,
  type ProfileReactionType,
  emptyProfileReactionSummary,
  optimisticToggleProfileReaction,
  totalProfileReactionCount,
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
  /** Compact respect trigger for the message row (1/4 width). */
  compactTrigger?: boolean;
};

export default function ProfileReactionsBar({
  targetPlayerId,
  viewerId,
  viewerName,
  viewerAvatar,
  disabled,
  compactTrigger = false,
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

  const total = totalProfileReactionCount(summary);

  if (compactTrigger) {
    return (
      <>
        <Pressable
          style={[styles.respectButton, disabled && styles.respectButtonDisabled]}
          onPress={() => setSheetOpen(true)}
          disabled={disabled || !viewerId}
        >
          <ReactionIcon type="respect" size={18} active={summary.mine.has('respect')} />
          <Text style={styles.respectCount}>{total}</Text>
        </Pressable>
        <ProfileReactionsSheet
          visible={sheetOpen}
          summary={summary}
          disabled={disabled || !viewerId}
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

  return (
    <>
      <View style={styles.bar}>
        {PROFILE_REACTIONS.map(({ type }) => {
          const active = summary.mine.has(type);
          const count = summary.counts[type];
          return (
            <Pressable
              key={type}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onPress(type)}
              onLongPress={() => onLongPress(type)}
              delayLongPress={320}
              disabled={disabled || !viewerId}
              hitSlop={6}
            >
              <ReactionIcon type={type} size={18} active={active} />
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
  respectButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  respectButtonDisabled: {
    opacity: 0.45,
  },
  respectCount: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    lineHeight: 12,
  },
  bar: {
    flexDirection: 'row',
    marginTop: 2,
    marginBottom: 2,
    gap: 6,
    alignSelf: 'stretch',
    width: '100%',
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minHeight: 26,
  },
  chipActive: {
    backgroundColor: 'rgba(250, 47, 64, 0.14)',
  },
  count: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
  },
  countActive: {
    color: '#fa2f40',
  },
});
