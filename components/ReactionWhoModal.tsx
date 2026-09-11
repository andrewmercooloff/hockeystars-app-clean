import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CachedAvatar from './CachedAvatar';
import { type ReactionSender } from '../utils/reactions';

type ReactionWhoModalProps = {
  visible: boolean;
  title: string;
  senders: ReactionSender[];
  onClose: () => void;
};

export default function ReactionWhoModal({ visible, title, senders, onClose }: ReactionWhoModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {senders.map((sender) => (
              <View key={sender.id} style={styles.row}>
                <CachedAvatar
                  playerId={sender.id}
                  fallbackAvatarUrl={sender.avatar ?? undefined}
                  size={36}
                />
                <Text style={styles.name} numberOfLines={1}>
                  {sender.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#1c1c21',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    maxHeight: '60%',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
});
