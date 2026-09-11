import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PROFILE_REACTIONS,
  type ProfileReactionSummary,
  type ProfileReactionType,
} from '../utils/reactions';
import ReactionIcon from './ReactionIcon';

type ProfileReactionsSheetProps = {
  visible: boolean;
  summary: ProfileReactionSummary;
  disabled?: boolean;
  onClose: () => void;
  onToggle: (type: ProfileReactionType) => void;
  onLongPress: (type: ProfileReactionType) => void;
};

export default function ProfileReactionsSheet({
  visible,
  summary,
  disabled,
  onClose,
  onToggle,
  onLongPress,
}: ProfileReactionsSheetProps) {
  const translateY = useRef(new Animated.Value(280)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 260,
          mass: 0.85,
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 280,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateY, backdrop]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.row}>
            {PROFILE_REACTIONS.map(({ type }) => {
              const active = summary.mine.has(type);
              const count = summary.counts[type];
              return (
                <Pressable
                  key={type}
                  style={[styles.cell, active && styles.cellActive]}
                  onPress={() => onToggle(type)}
                  onLongPress={() => onLongPress(type)}
                  delayLongPress={320}
                  disabled={disabled}
                >
                  <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                    <ReactionIcon type={type} size={22} active={active} />
                  </View>
                  <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#1c1c21',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  cellActive: {},
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(250, 47, 64, 0.16)',
  },
  count: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  countActive: {
    color: '#fa2f40',
  },
});
