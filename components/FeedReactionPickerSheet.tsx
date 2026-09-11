import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  FEED_REACTIONS,
  type FeedReactionSummary,
  type FeedReactionType,
} from '../utils/reactions';
import ReactionIcon from './ReactionIcon';

type FeedReactionPickerSheetProps = {
  visible: boolean;
  summary: FeedReactionSummary;
  disabled?: boolean;
  onClose: () => void;
  onSelect: (type: FeedReactionType) => void;
};

export default function FeedReactionPickerSheet({
  visible,
  summary,
  disabled,
  onClose,
  onSelect,
}: FeedReactionPickerSheetProps) {
  const translateY = useRef(new Animated.Value(220)).current;
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
        toValue: 220,
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
            {FEED_REACTIONS.map(({ type }) => {
              const active = summary.mine === type;
              return (
                <Pressable
                  key={type}
                  style={styles.cell}
                  onPress={() => {
                    onSelect(type);
                    onClose();
                  }}
                  disabled={disabled}
                >
                  <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                    <ReactionIcon type={type} size={22} active={active} />
                  </View>
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
    justifyContent: 'center',
    gap: 16,
  },
  cell: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  iconCircleActive: {
    borderColor: 'rgba(250, 47, 64, 0.55)',
  },
});
