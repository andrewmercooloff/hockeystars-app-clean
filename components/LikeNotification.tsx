import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';
import { feedStrings } from '../utils/feedI18n';
import { displayName } from '../utils/displayName';
import type { FeedLiker } from '../utils/groupNotifications';

interface LikeNotificationProps {
  likedByName: string;
  likedByAvatar?: string;
  likedById: string;
  contentType: 'video' | 'photo';
  timestamp: number | string;
  count?: number;
  likers?: FeedLiker[];
  onPress?: () => void;
}

const AVATAR = 40;
const STACK_SHIFT = 22;

const LikeNotification = React.memo(function LikeNotification({
  likedByName,
  likedByAvatar,
  likedById,
  contentType,
  timestamp,
  count = 1,
  likers,
}: LikeNotificationProps) {
  const { t, language } = useLanguage();
  const s = feedStrings(language);

  const formatTime = (ts: number | string): string => {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return t('justNow');
    const diffInMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return t('justNow');
    if (diffInMinutes < 60) return t('minutesAgo', { minutes: diffInMinutes });
    if (diffInMinutes < 1440) return t('hoursAgo', { hours: Math.floor(diffInMinutes / 60) });
    return t('daysAgo', { days: Math.floor(diffInMinutes / 1440) });
  };

  const people: FeedLiker[] =
    likers && likers.length > 0
      ? likers
      : [{ id: likedById, name: likedByName, avatar: likedByAvatar }];
  const uniquePeople = people.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
  const shown = uniquePeople.slice(0, 3);
  const isMany = uniquePeople.length > 1;

  // «Ivan, Petr и ещё 3 оценили ваше фото»
  const names = shown.slice(0, 2).map(p => displayName(p.name) || '…');
  const rest = uniquePeople.length - names.length;
  let who = names.join(', ');
  if (rest > 0) who += ` ${s.likes.andMore(rest)}`;
  const verb = isMany
    ? contentType === 'video' ? s.likes.likedVideoMany : s.likes.likedPhotoMany
    : contentType === 'video' ? s.likes.likedVideo : s.likes.likedPhoto;
  const suffix = !isMany && count > 1 ? ` ×${count}` : '';

  const stackWidth = AVATAR + (shown.length - 1) * STACK_SHIFT;

  return (
    <View style={styles.row}>
      <View style={[styles.stack, { width: stackWidth }]}>
        {shown.map((p, i) => (
          <View key={`${p.id}-${i}`} style={[styles.stackItem, { left: i * STACK_SHIFT, zIndex: 10 - i }]}>
            {p.id ? (
              <CachedAvatar playerId={p.id} fallbackAvatarUrl={p.avatar} size={AVATAR - 4} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="heart" size={16} color="#fff" />
              </View>
            )}
          </View>
        ))}
        <View style={styles.heartBadge}>
          <Ionicons name="heart" size={10} color="#fff" />
        </View>
      </View>

      <Text style={styles.text} numberOfLines={2}>
        <Text style={styles.bold}>{who}</Text>
        <Text> {verb}{suffix}</Text>
        <Text style={styles.time}>  ·  {formatTime(timestamp)}</Text>
      </Text>
    </View>
  );
});

export default LikeNotification;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  stack: {
    height: AVATAR,
    marginRight: 12,
    position: 'relative',
  },
  stackItem: {
    position: 'absolute',
    top: 0,
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    borderColor: '#101013',
    backgroundColor: '#1c1c21',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR - 4,
    height: AVATAR - 4,
    borderRadius: (AVATAR - 4) / 2,
  },
  avatarPlaceholder: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heartBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fa2f40',
    borderWidth: 2,
    borderColor: '#101013',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  text: {
    flex: 1,
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Gilroy-Regular',
  },
  bold: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
  },
  time: {
    color: '#a1a1aa',
    fontSize: 12,
  },
});
