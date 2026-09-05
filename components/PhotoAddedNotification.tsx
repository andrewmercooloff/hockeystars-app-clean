import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, withDelay, runOnJS } from 'react-native-reanimated';
import { addLike, checkIfLiked } from '../utils/likesService';
import { loadCurrentUser } from '../utils/playerStorage';
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

interface PhotoAddedNotificationProps {
  playerName: string;
  playerId?: string;
  photosCount: number;
  timestamp: string;
  playerAvatar?: string;
  photoUrls?: string[];
  onHeaderPress?: () => void;
}

// Медиа на всю ширину карточки (карточка: marginHorizontal 16)
const MEDIA_INSET = 10;
const PHOTO_WIDTH = Dimensions.get('window').width - 16 * 2 - MEDIA_INSET * 2;
// Единый квадратный кадр — как в Instagram; все карточки одной высоты
const PHOTO_HEIGHT = Math.round(PHOTO_WIDTH);
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

  // Двойной тап = лайк (как в Instagram) с всплывающим сердцем
  const lastTapRef = useRef(0);
  const [likeRefresh, setLikeRefresh] = useState(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const bumpLike = useCallback(() => setLikeRefresh(v => v + 1), []);

  const showHeart = useCallback(() => {
    heartOpacity.value = withSequence(withTiming(1, { duration: 80 }), withDelay(450, withTiming(0, { duration: 220 })));
    heartScale.value = withSequence(
      withTiming(1.15, { duration: 160 }),
      withTiming(0.95, { duration: 120 }),
      withDelay(300, withTiming(0, { duration: 220 }, () => runOnJS(bumpLike)())),
    );
  }, [heartOpacity, heartScale, bumpLike]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      showHeart();
      void (async () => {
        try {
          const user = await loadCurrentUser();
          if (!user) return;
          const contentId = generatePhotoContentId(url);
          const already = await checkIfLiked(contentId, 'photo', user.id);
          if (!already) await addLike(playerId, contentId, 'photo', user.id);
        } catch {
          // ignore
        }
      })();
      return;
    }
    lastTapRef.current = now;
  }, [showHeart, url, playerId]);

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
        <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.photoImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={imageUrl}
            transition={0}
            onLoad={() => setLoaded(true)}
            onError={handleError}
          />
        </Pressable>
      )}
      <Animated.View style={[styles.bigHeart, heartStyle]} pointerEvents="none">
        <Ionicons name="heart" size={96} color="#fff" />
      </Animated.View>
      <View style={styles.likeOverlay} pointerEvents="box-none">
        <LikeButton
          playerId={playerId}
          contentId={generatePhotoContentId(url)}
          contentType="photo"
          size="small"
          refreshTrigger={likeRefresh}
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
  const slotHeight = PHOTO_HEIGHT;

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
          <CachedAvatar playerId={playerId} fallbackAvatarUrl={playerAvatar} size={36} style={styles.playerAvatar} />
        ) : (
          <Ionicons name="camera-outline" size={22} color="#fff" />
        )}
      </View>
      <View style={styles.headerText}>
        <Text style={styles.headerLine} numberOfLines={1}>
          <Text style={styles.playerName}>{playerName}</Text>
          <Text style={styles.actionText}> · {t('photoNotification.added')} {getPhotoText(photosCount)}</Text>
          <Text style={styles.timeText}> · {formatTime(timestamp)}</Text>
        </Text>
      </View>
    </View>
  );

  return (
    <BlurOrSolid intensity={55} tint="dark" style={styles.containerBlur}>
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
                  <>
                    <View style={styles.counterChip} pointerEvents="none">
                      <Text style={styles.counterText}>
                        {activeIndex + 1}/{resolvedPhotoUrls.length}
                      </Text>
                    </View>
                    <View style={styles.dotsRow} pointerEvents="none">
                      {dotIndices.map((idx) => (
                        <View
                          key={idx}
                          style={[styles.dot, idx === activeIndex && styles.dotActive]}
                        />
                      ))}
                    </View>
                  </>
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
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerText: {
    flex: 1,
  },
  headerLine: {
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Gilroy-Regular',
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
  },
  actionText: {
    color: '#d4d4d8',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
  },
  timeText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
  galleryWrap: {
    width: PHOTO_WIDTH,
    marginHorizontal: MEDIA_INSET,
    marginBottom: MEDIA_INSET,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'stretch',
    position: 'relative',
    backgroundColor: '#15151a',
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
    top: 10,
    right: 10,
    zIndex: 10,
  },
  bigHeart: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9,
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    width: PHOTO_WIDTH,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    zIndex: 5,
  },
  counterChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
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
