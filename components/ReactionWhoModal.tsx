import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CachedAvatar from './CachedAvatar';
import ReactionIcon, { type ReactionIconType } from './ReactionIcon';
import { type ReactionSender } from '../utils/reactions';

type ReactionWhoModalProps = {
  visible: boolean;
  reactionType?: ReactionIconType | null;
  senders: ReactionSender[];
  onClose: () => void;
};

export default function ReactionWhoModal({
  visible,
  reactionType,
  senders,
  onClose,
}: ReactionWhoModalProps) {
  const translateY = useRef(new Animated.Value(320)).current;
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
        toValue: 320,
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
          {reactionType ? (
            <View style={styles.iconWrap}>
              <ReactionIcon type={reactionType} size={24} active />
            </View>
          ) : null}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {senders.map((sender) => (
              <View key={sender.id} style={styles.row}>
                <CachedAvatar
                  playerId={sender.id}
                  fallbackAvatarUrl={sender.avatar ?? undefined}
                  size={32}
                />
                <Text style={styles.name} numberOfLines={1}>
                  {sender.name}
                </Text>
              </View>
            ))}
          </ScrollView>
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
    paddingBottom: 16,
    maxHeight: '36%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 10,
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  list: {
    maxHeight: 260,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
});
