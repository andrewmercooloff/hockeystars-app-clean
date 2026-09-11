import React from 'react';
import { StyleSheet, View } from 'react-native';
import CompactReactionBar from './CompactReactionBar';
import { REACTABLE_NOTIFICATION_TYPES } from '../utils/reactions';

type FeedReactionFooterProps = {
  notificationId: string;
  notificationType: string;
  recipientId?: string;
  viewerId?: string | null;
};

export default function FeedReactionFooter({
  notificationId,
  notificationType,
  recipientId,
  viewerId,
}: FeedReactionFooterProps) {
  if (!REACTABLE_NOTIFICATION_TYPES.has(notificationType)) return null;
  if (!recipientId || !viewerId) return null;

  return (
    <View style={styles.wrap}>
      <CompactReactionBar
        notificationId={notificationId}
        notificationType={notificationType}
        recipientId={recipientId}
        viewerId={viewerId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 6,
    backgroundColor: '#1c1c21',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
});
