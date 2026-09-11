import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PROFILE_REACTIONS,
  type ProfileReactionSummary,
  type ProfileReactionType,
  emptyProfileReactionSummary,
} from '../utils/reactions';
import { loadProfileReactions, toggleProfileReaction } from '../services/reactionService';
import ReactionWhoModal from './ReactionWhoModal';
import { useLanguage } from '../contexts/LanguageContext';

type ProfileReactionsBarProps = {
  targetPlayerId: string;
  viewerId?: string | null;
  disabled?: boolean;
};

export default function ProfileReactionsBar({
  targetPlayerId,
  viewerId,
  disabled,
}: ProfileReactionsBarProps) {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<ProfileReactionSummary>(emptyProfileReactionSummary());
  const [loadingType, setLoadingType] = useState<ProfileReactionType | null>(null);
  const [whoModal, setWhoModal] = useState<{ type: ProfileReactionType; title: string } | null>(
    null
  );

  const refresh = useCallback(async () => {
    const next = await loadProfileReactions(targetPlayerId, viewerId);
    setSummary(next);
  }, [targetPlayerId, viewerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onPress = async (type: ProfileReactionType) => {
    if (disabled || !viewerId || loadingType) return;
    setLoadingType(type);
    try {
      const next = await toggleProfileReaction(targetPlayerId, viewerId, type);
      if (next) setSummary(next);
    } finally {
      setLoadingType(null);
    }
  };

  const onLongPress = (type: ProfileReactionType, label: string) => {
    const senders = summary.sendersByType[type];
    if (!senders.length) return;
    setWhoModal({ type, title: label });
  };

  return (
    <>
      <View style={styles.bar}>
        {PROFILE_REACTIONS.map(({ type, emoji, labelKey }) => {
          const active = summary.mine.has(type);
          const count = summary.counts[type];
          const label = t(labelKey) || type;
          return (
            <View key={type} style={styles.cell}>
              <Pressable
                style={[styles.button, active && styles.buttonActive]}
                onPress={() => void onPress(type)}
                onLongPress={() => onLongPress(type, label)}
                delayLongPress={350}
                disabled={disabled || !viewerId}
              >
                {loadingType === type ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.emoji}>{emoji}</Text>
                )}
              </Pressable>
              <Text style={[styles.count, count > 0 && styles.countVisible]}>{count || ' '}</Text>
            </View>
          );
        })}
      </View>
      <ReactionWhoModal
        visible={!!whoModal}
        title={whoModal?.title ?? ''}
        senders={whoModal ? summary.sendersByType[whoModal.type] : []}
        onClose={() => setWhoModal(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  button: {
    width: 56,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: 'rgba(250, 47, 64, 0.18)',
    borderColor: 'rgba(250, 47, 64, 0.45)',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  count: {
    marginTop: 4,
    minHeight: 16,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  countVisible: {
    color: '#fa2f40',
  },
});
