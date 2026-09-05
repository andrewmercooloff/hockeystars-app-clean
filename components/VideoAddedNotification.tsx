import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurOrSolid } from './BlurOrSolid';
import { platformCardShadow } from '../utils/androidShadow';
import { useLanguage } from '../contexts/LanguageContext';
import CachedAvatar from './CachedAvatar';
import LikeButton from './LikeButton';
import { generateVideoContentId } from '../utils/likesService';
import VideoPlayer from './VideoPlayer';
import { VideoPreviewThumbnail } from './VideoCarousel';

interface VideoAddedNotificationProps {
  playerName: string;
  playerId?: string;
  videosCount: number;
  timestamp: string;
  playerAvatar?: string;
  videoUrls?: string[];
  onHeaderPress?: () => void;
  onScrubActiveChange?: (active: boolean) => void;
}

// Медиа на всю ширину карточки (карточка: marginHorizontal 16)
const MEDIA_INSET = 10;
const VIDEO_WIDTH = Dimensions.get('window').width - 16 * 2 - MEDIA_INSET * 2;
// Единый кадр 16:9 для всех видео
const VIDEO_HEIGHT = Math.round((VIDEO_WIDTH * 9) / 16);

function NotificationVideoBlock({
  url,
  playerId,
  slotHeight,
  isActive,
  onScrubActiveChange,
  onOpenFullscreen,
  fullscreenLabel,
}: {
  url: string;
  playerId: string;
  slotHeight: number;
  isActive: boolean;
  onScrubActiveChange?: (active: boolean) => void;
  onOpenFullscreen: () => void;
  fullscreenLabel: string;
}) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!isActive) setPlaying(false);
  }, [isActive]);

  const openFullscreen = () => {
    setPlaying(false);
    onOpenFullscreen();
  };

  const fullscreenBtn = (
    <TouchableOpacity
      style={styles.fullscreenBtn}
      onPress={openFullscreen}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={fullscreenLabel}
    >
      <Ionicons name="expand" size={20} color="#fff" />
    </TouchableOpacity>
  );

  if (playing && isActive) {
    return (
      <View style={[styles.videoBlock, { width: VIDEO_WIDTH, height: slotHeight }]}>
        <VideoPlayer
          url={url}
          embedded
          autoPlay
          isActive={isActive}
          onScrubActiveChange={onScrubActiveChange}
        />
        {fullscreenBtn}
        <View style={styles.likeOverlay} pointerEvents="box-none">
          <LikeButton
            playerId={playerId}
            contentId={generateVideoContentId(url)}
            contentType="video"
            size="small"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.videoBlock, { width: VIDEO_WIDTH, height: slotHeight }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={0.92}
        onPress={() => isActive && setPlaying(true)}
        disabled={!isActive}
      >
        <VideoPreviewThumbnail videoUrl={url} />
        <View style={styles.playOverlay} pointerEvents="none">
          <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.92)" />
        </View>
      </TouchableOpacity>
      {fullscreenBtn}
      <View style={styles.likeOverlay} pointerEvents="box-none">
        <LikeButton
          playerId={playerId}
          contentId={generateVideoContentId(url)}
          contentType="video"
          size="small"
        />
      </View>
    </View>
  );
}

const VideoAddedNotification = React.memo(function VideoAddedNotification({
  playerName,
  playerId,
  videosCount,
  timestamp,
  playerAvatar,
  videoUrls = [],
  onHeaderPress,
  onScrubActiveChange,
}: VideoAddedNotificationProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselScrollEnabled, setCarouselScrollEnabled] = useState(true);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  const fullscreenLabel =
    t('videoNotification.fullScreen') !== 'videoNotification.fullScreen'
      ? t('videoNotification.fullScreen')
      : t('profile.fullScreen') !== 'profile.fullScreen'
        ? t('profile.fullScreen')
        : 'Full screen';

  const handleScrubActiveChange = (active: boolean) => {
    setCarouselScrollEnabled(!active);
    onScrubActiveChange?.(active);
  };

  const formatTime = (ts: string): string => {
    const now = new Date();
    const time = new Date(ts);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return t('justNow');
    if (diffInMinutes < 60) return t('minutesAgo', { minutes: diffInMinutes });
    if (diffInMinutes < 1440) return t('hoursAgo', { hours: Math.floor(diffInMinutes / 60) });
    return t('daysAgo', { days: Math.floor(diffInMinutes / 1440) });
  };

  const displayCount = Math.max(videosCount, videoUrls.length, 1);
  const getVideoText = (count: number): string =>
    count === 1 ? t('videoNotification.oneVideo') : t('videoNotification.multipleVideos', { count });

  const hasVideos = videoUrls.length > 0 && !!playerId;
  const showVideoArea = displayCount > 0;
  const useCarousel = videoUrls.length > 1;
  const slotHeight = VIDEO_HEIGHT;

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / VIDEO_WIDTH);
    if (idx !== activeIndex && idx >= 0 && idx < videoUrls.length) {
      setActiveIndex(idx);
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        {playerId ? (
          <CachedAvatar playerId={playerId} fallbackAvatarUrl={playerAvatar} size={36} style={styles.playerAvatar} />
        ) : (
          <Ionicons name="videocam-outline" size={22} color="#fff" />
        )}
      </View>
      <View style={styles.headerText}>
        <Text style={styles.headerLine} numberOfLines={1}>
          <Text style={styles.playerName}>{playerName}</Text>
          <Text style={styles.actionText}> · {t('videoNotification.added')} {getVideoText(displayCount)}</Text>
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

        {showVideoArea && (
          <View style={styles.videosArea}>
            {hasVideos ? (
              useCarousel ? (
                <>
                  <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    nestedScrollEnabled
                    scrollEnabled={carouselScrollEnabled}
                    showsHorizontalScrollIndicator={false}
                    onScroll={onCarouselScroll}
                    scrollEventThrottle={16}
                    style={[styles.carousel, { height: slotHeight }]}
                  >
                    {videoUrls.map((url, idx) => (
                      <View key={`${url}-${idx}`} style={[styles.carouselPage, { height: slotHeight }]}>
                        <NotificationVideoBlock
                          url={url}
                          playerId={playerId!}
                          slotHeight={slotHeight}
                          isActive={idx === activeIndex}
                          onScrubActiveChange={handleScrubActiveChange}
                          onOpenFullscreen={() => setFullscreenUrl(url)}
                          fullscreenLabel={fullscreenLabel}
                        />
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.counterChip} pointerEvents="none">
                    <Text style={styles.carouselCounter}>
                      {activeIndex + 1}/{videoUrls.length}
                    </Text>
                  </View>
                  <View style={styles.carouselDots} pointerEvents="none">
                    {videoUrls.map((url, idx) => (
                      <View
                        key={`dot-${url}-${idx}`}
                        style={[styles.dot, idx === activeIndex && styles.dotActive]}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <NotificationVideoBlock
                  url={videoUrls[0]}
                  playerId={playerId!}
                  slotHeight={slotHeight}
                  isActive
                  onScrubActiveChange={handleScrubActiveChange}
                  onOpenFullscreen={() => setFullscreenUrl(videoUrls[0])}
                  fullscreenLabel={fullscreenLabel}
                />
              )
            ) : (
              <View style={[styles.videoPoster, { height: slotHeight }]}>
                <Ionicons name="play-circle-outline" size={40} color="rgba(255,255,255,0.5)" />
              </View>
            )}
          </View>
        )}

        {!showVideoArea && (
          <View style={styles.badge}>
            <Ionicons name="play-outline" size={13} color="#fff" />
            <Text style={styles.badgeText}>+{displayCount}</Text>
          </View>
        )}
      </View>

      <Modal
        visible={fullscreenUrl != null}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setFullscreenUrl(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={[styles.modalCloseBtn, { top: insets.top + 10 }]}
            onPress={() => setFullscreenUrl(null)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('common.close') !== 'common.close' ? t('common.close') : 'Close'}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {fullscreenUrl ? (
            <View style={styles.modalPlayer}>
              <VideoPlayer
                key={fullscreenUrl}
                url={fullscreenUrl}
                autoPlay
                fullscreen
                onClose={() => setFullscreenUrl(null)}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </BlurOrSolid>
  );
});

export default VideoAddedNotification;

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
  videosArea: {
    width: VIDEO_WIDTH,
    marginHorizontal: MEDIA_INSET,
    marginBottom: MEDIA_INSET,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'stretch',
    position: 'relative',
    backgroundColor: '#15151a',
  },
  carousel: {
    width: VIDEO_WIDTH,
  },
  carouselPage: {
    width: VIDEO_WIDTH,
  },
  carouselDots: {
    position: 'absolute',
    left: 0,
    width: VIDEO_WIDTH,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  carouselCounter: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  videoBlock: {
    overflow: 'hidden',
    position: 'relative',
  },
  videoPoster: {
    width: VIDEO_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 30,
  },
  fullscreenBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 14,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    padding: 8,
  },
  modalPlayer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
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
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
});
