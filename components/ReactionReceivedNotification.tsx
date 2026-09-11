import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurOrSolid } from './BlurOrSolid';
import { platformCardShadow } from '../utils/androidShadow';
import CachedAvatar from './CachedAvatar';
import { type ProfileReactionType, type FeedReactionType } from '../utils/reactions';
import ReactionIcon, { type ReactionIconType } from './ReactionIcon';
import { useLanguage } from '../contexts/LanguageContext';

type ReactionReceivedNotificationProps = {
  senderName: string;
  senderId?: string;
  senderAvatar?: string;
  message: string;
  timestamp: string;
  reactions?: ProfileReactionType[];
  reactionType?: string;
  onHeaderPress?: () => void;
};

export default function ReactionReceivedNotification({
  senderName,
  senderId,
  senderAvatar,
  message,
  timestamp,
  reactions,
  reactionType,
  onHeaderPress,
}: ReactionReceivedNotificationProps) {
  const { t } = useLanguage();

  const iconTypes: ReactionIconType[] = reactions?.length
    ? reactions
    : reactionType
      ? [reactionType as ReactionIconType]
      : ['respect'];

  const formatTime = (ts: string): string => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return t('justNow');
    if (diff < 60) return t('minutesAgo', { minutes: diff });
    if (diff < 1440) return t('hoursAgo', { hours: Math.floor(diff / 60) });
    return t('daysAgo', { days: Math.floor(diff / 1440) });
  };

  const header = (
    <TouchableOpacity
      activeOpacity={onHeaderPress ? 0.7 : 1}
      onPress={onHeaderPress}
      disabled={!onHeaderPress}
      style={styles.topRow}
    >
      <CachedAvatar
        playerId={senderId}
        fallbackAvatarUrl={senderAvatar}
        size={44}
      />
      <View style={styles.headerText}>
        <Text style={styles.name} numberOfLines={1}>
          {senderName}
        </Text>
        <Text style={styles.time}>{formatTime(timestamp)}</Text>
      </View>
      <View style={styles.emojiBadge}>
        {iconTypes.map((type) => (
          <ReactionIcon key={type} type={type} size={16} active />
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <BlurOrSolid intensity={55} tint="dark" style={styles.containerBlur}>
      <View style={styles.container}>
        {header}
        <Text style={styles.message}>{message}</Text>
      </View>
    </BlurOrSolid>
  );
}

const styles = StyleSheet.create({
  containerBlur: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    ...platformCardShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 5,
      elevation: 2,
    }),
  },
  container: {
    backgroundColor: '#1c1c21',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
  },
  time: {
    color: '#a1a1aa',
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    marginTop: 2,
  },
  emojiBadge: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  message: {
    color: '#d4d4d8',
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
  },
});
