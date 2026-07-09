import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from './BlurOrSolid';
import { platformCardShadow } from '../utils/androidShadow';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';
import LikeButton from './LikeButton';
import { generatePhotoContentId } from '../utils/likesService';
import { colors } from '../theme/colors';
import { rewriteSupabasePublicUrl } from '../utils/supabase';
import { updateAvatarGlobally } from '../utils/AvatarCache';
import { useNotificationCarouselSlotHeight } from '../utils/mediaAspectSize';

interface PhotoAddedNotificationProps {
  playerName: string;
  playerId?: string;
  photosCount: number;
  timestamp: string;
  playerAvatar?: string;
  photoUrls?: string[];
  onHeaderPress?: () => void;
}

const CARD_HORIZONTAL_INSET = 16 * 2 + 14 * 2;
const PHOTO_WIDTH = Dimensions.get('window').width - CARD_HORIZONTAL_INSET;
const MAX_DOT_INDICATORS = 12;

function buildPhotoUrlCandidates(url: string): string[] {
  const trimmed = url?.trim();
  if (!trimmed) return [];
  const rewritten = rewriteSupabasePublicUrl(trimmed) || trimmed;
  const out: string[] = [];
  for (const candidate of [rewritten, trimmed]) {
    if (candidate && !out.includes(candidate)) out.push(candidate);
  }
  return out;
}

function PhotoSlide({
  url,
  playerId,
  slotHeight,
}: {
  url: string;
  playerId: string;
  slotHeight: number;
}) {
  const candidates = useMemo(() => buildPhotoUrlCandidates(url), [url]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageUrl = candidates[candidateIndex] ?? '';

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
    setFailed(false);
  }, [url]);

  useEffect(() => {
    if (imageUrl) {
      void Image.prefetch(imageUrl).catch(() => undefined);
    }
  }, [imageUrl]);

  const handleError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((i) => i + 1);
      setLoaded(false);
      return;
    }
    setFailed(true);
  };

  return (
    <View style={[styles.photoSlide, { width: PHOTO_WIDTH, height: slotHeight }]}>
      {!loaded && !failed && (
        <View style={styles.photoLoading} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      )}
      {failed ? (
        <View style={styles.photoLoading}>
          <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.45)" />
        </View>
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={styles.photoImage}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey={imageUrl}
          transition={0}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}
      <View style={styles.likeOverlay} pointerEvents="box-none">
        <LikeButton
          playerId={playerId}
          contentId={generatePhotoContentId(url)}
          contentType="photo"
          size="small"
        />
      </View>
    </View>
  );
}

const PhotoAddedNotification = React.memo(function PhotoAddedNotification({
  playerName,
  playerId,
  photosCount,
  timestamp,
  playerAvatar,
  photoUrls = [],
  onHeaderPress,
}: PhotoAddedNotificationProps) {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [resolvedPhotoUrls, setResolvedPhotoUrls] = useState<string[]>(() =>
    photoUrls.map((url) => rewriteSupabasePublicUrl(url) || url).filter(Boolean)
  );

  useEffect(() => {
    const normalized = photoUrls.map((url) => rewriteSupabasePublicUrl(url) || url).filter(Boolean);
    setResolvedPhotoUrls(normalized);
    setActiveIndex(0);
  }, [photoUrls]);

  useEffect(() => {
    if (!playerId || !playerAvatar) return;
    void updateAvatarGlobally(playerId, playerAvatar);
  }, [playerId, playerAvatar]);

  useEffect(() => {
    if (!playerId || resolvedPhotoUrls.length > 0) return;
    let cancelled = false;

    void (async () => {
      try {
        const { getPlayerById } = await import('../utils/playerStorage');
        const player = await getPlayerById(playerId, { skipCache: true });
        if (cancelled || !player?.photos?.length) return;
        const take = Math.min(player.photos.length, Math.max(photosCount, 1));
        const urls = player.photos
          .slice(0, take)
          .map((url) => rewriteSupabasePublicUrl(url) || url)
          .filter(Boolean);
        if (!cancelled && urls.length > 0) {
          setResolvedPhotoUrls(urls);
        }
      } catch {
        // ignore — покажем бейдж без карусели
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerId, photosCount, resolvedPhotoUrls.length]);

  const formatTime = (ts: string): string => {
    const now = new Date();
    const time = new Date(ts);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return t('justNow');
    if (diffInMinutes < 60) return t('minutesAgo', { minutes: diffInMinutes });
    if (diffInMinutes < 1440) return t('hoursAgo', { hours: Math.floor(diffInMinutes / 60) });
    return t('daysAgo', { days: Math.floor(diffInMinutes / 1440) });
  };

  const getPhotoText = (count: number): string =>
    count === 1 ? t('photoNotification.onePhoto') : t('photoNotification.multiplePhotos', { count });

  const hasPhotos = resolvedPhotoUrls.length > 0 && !!playerId;
  const slotHeight = useNotificationCarouselSlotHeight(resolvedPhotoUrls, PHOTO_WIDTH, 'image');

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / PHOTO_WIDTH);
    if (idx !== activeIndex && idx >= 0 && idx < resolvedPhotoUrls.length) {
      setActiveIndex(idx);
    }
  };

  const dotIndices = useMemo(() => {
    const total = resolvedPhotoUrls.length;
    if (total <= MAX_DOT_INDICATORS) {
      return Array.from({ length: total }, (_, i) => i);
    }
    const half = Math.floor(MAX_DOT_INDICATORS / 2);
    let start = Math.max(0, activeIndex - half);
    if (start + MAX_DOT_INDICATORS > total) {
      start = total - MAX_DOT_INDICATORS;
    }
    return Array.from({ length: MAX_DOT_INDICATORS }, (_, i) => start + i);
  }, [resolvedPhotoUrls.length, activeIndex]);

  const header = (
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        {playerId ? (
          <CachedAvatar playerId={playerId} fallbackAvatarUrl={playerAvatar} size={44} style={styles.playerAvatar} />
        ) : (
          <Ionicons name="camera-outline" size={22} color="#fff" />
        )}
      </View>
      <View style={styles.headerText}>
        <Text style={styles.playerName} numberOfLines={1}>{playerName}</Text>
        <Text style={styles.actionText}>
          {t('photoNotification.added')} {getPhotoText(photosCount)}
        </Text>
      </View>
      <Text style={styles.timeText}>{formatTime(timestamp)}</Text>
    </View>
  );

  return (
    <BlurOrSolid intensity={20} tint="dark" style={styles.containerBlur}>
      <View style={styles.container}>
        {onHeaderPress ? (
          <TouchableOpacity onPress={onHeaderPress} activeOpacity={0.7}>
            {header}
          </TouchableOpacity>
        ) : (
          header
        )}

        {photosCount > 0 && (
          <View style={styles.galleryWrap}>
            {hasPhotos ? (
              <>
                <FlatList
                  data={resolvedPhotoUrls}
                  keyExtractor={(url, idx) => `${url}-${idx}`}
                  horizontal
                  nestedScrollEnabled
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  decelerationRate="fast"
                  snapToInterval={PHOTO_WIDTH}
                  getItemLayout={(_, index) => ({
                    length: PHOTO_WIDTH,
                    offset: PHOTO_WIDTH * index,
                    index,
                  })}
                  style={{ height: slotHeight }}
                  renderItem={({ item }) => (
                    <PhotoSlide url={item} playerId={playerId!} slotHeight={slotHeight} />
                  )}
                />
                {resolvedPhotoUrls.length > 1 && (
                  <View style={styles.dotsRow}>
                    {resolvedPhotoUrls.length > MAX_DOT_INDICATORS ? (
                      <Text style={styles.counterText}>
                        {activeIndex + 1} / {resolvedPhotoUrls.length}
                      </Text>
                    ) : (
                      dotIndices.map((idx) => (
                        <View
                          key={idx}
                          style={[styles.dot, idx === activeIndex && styles.dotActive]}
                        />
                      ))
                    )}
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.galleryPlaceholder, { height: slotHeight }]}>
                <ActivityIndicator size="small" color={colors.brand} />
              </View>
            )}
          </View>
        )}

        {photosCount === 0 && (
          <View style={styles.badge}>
            <Ionicons name="images-outline" size={13} color="#fff" />
            <Text style={styles.badgeText}>+{photosCount}</Text>
          </View>
        )}
      </View>
    </BlurOrSolid>
  );
});

export default PhotoAddedNotification;

const styles = StyleSheet.create({
  containerBlur: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 5,
      elevation: 8,
    }),
  },
  container: {
    backgroundColor: colors.surfaceOverlay,
    borderRadius: 20,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerText: {
    flex: 1,
  },
  playerName: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    marginTop: 1,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    marginLeft: 6,
  },
  galleryWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  galleryPlaceholder: {
    width: PHOTO_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlide: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    paddingBottom: 2,
  },
  counterText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: colors.brand,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
});
