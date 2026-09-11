import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { useLanguage } from '../contexts/LanguageContext';
import { rewriteSupabasePublicUrl } from '../utils/supabase';
import { NOTIFICATION_CARD, NOTIFICATION_CARD_BLUR } from '../utils/notificationCard';
import CachedAvatar from './CachedAvatar';

interface Props {
  playerName: string;
  playerId: string;
  playerAvatar?: string;
  coverUrl?: string;
  timestamp: string;
  reactionsFooter?: ReactNode;
}

/** Feed card: "<name> updated the profile cover" with a wide preview of the new cover. */
const CoverChangedNotification = React.memo(function CoverChangedNotification({
  playerName,
  playerId,
  playerAvatar,
  coverUrl,
  timestamp,
  reactionsFooter,
}: Props) {
  const { t } = useLanguage();
  const preview = React.useMemo(() => {
    const base = rewriteSupabasePublicUrl(coverUrl);
    if (!base) return null;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}v=${new Date(timestamp).getTime()}`;
  }, [coverUrl, timestamp]);

  const formatTime = (ts: string): string => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return t('justNow');
    if (diff < 60) return t('minutesAgo', { minutes: diff });
    if (diff < 1440) return t('hoursAgo', { hours: Math.floor(diff / 60) });
    return t('daysAgo', { days: Math.floor(diff / 1440) });
  };

  return (
    <BlurOrSolid intensity={55} tint="dark" style={NOTIFICATION_CARD_BLUR}>
      <View style={NOTIFICATION_CARD}>
        <View style={styles.topRow}>
          <CachedAvatar playerId={playerId} fallbackAvatarUrl={playerAvatar} size={40} />
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.playerName} numberOfLines={1}>
                {playerName}
              </Text>
              {!reactionsFooter ? (
                <Text style={styles.time}>{formatTime(timestamp)}</Text>
              ) : null}
            </View>
            <View style={styles.actionRow}>
              <Text style={styles.actionText}>{t('coverNotification.changed')}</Text>
              <View style={styles.badge}>
                <Ionicons name="image-outline" size={14} color="#fff" />
              </View>
            </View>
          </View>
        </View>

        {preview ? (
          <Image
            source={{ uri: preview }}
            style={styles.preview}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            recyclingKey={`cover-notif-${playerId}-${preview.split('?')[0]}`}
          />
        ) : null}
        {reactionsFooter}
      </View>
    </BlurOrSolid>
  );
});

export default CoverChangedNotification;

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  playerName: { flex: 1, color: '#fff', fontSize: 15, fontFamily: 'Gilroy-Bold', marginRight: 8 },
  time: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'Gilroy-Regular' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Gilroy-Regular' },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(250,47,64,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    marginTop: 12,
    width: '100%',
    aspectRatio: 2.4,
    borderRadius: 12,
    backgroundColor: '#141319',
  },
});
