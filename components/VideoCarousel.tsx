import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
    Dimensions,
    Modal,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import VideoPlayer from './VideoPlayer';
import { useLanguage } from '../contexts/LanguageContext';
import LikeButton from './LikeButton';
import HorizontalScrollWithArrows from './HorizontalScrollWithArrows';
import { generateVideoContentId } from '../utils/likesService';
import { getVideoThumbnailUrl } from '../utils/videoUrls';
import { getVideoTileSize } from '../utils/mediaTileSize';
import { useIsDesktopLayout } from '../hooks/useIsDesktopLayout';
import { rewriteSupabasePublicUrl } from '../utils/supabase';

// Кеш для успешных форматов превью (чтобы не перебирать форматы каждый раз)
const thumbnailFormatCache = new Map<string, number>();
const generatedThumbCache = new Map<string, string>();

function captureWebVideoFrame(videoUrl: string): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const video = document.createElement('video');
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        /* ignore */
      }
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 8000);
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = videoUrl;
    video.addEventListener('loadeddata', () => {
      try {
        const t =
          Number.isFinite(video.duration) && video.duration > 0
            ? Math.min(0.8, video.duration * 0.08)
            : 0.1;
        video.currentTime = t;
      } catch {
        window.clearTimeout(timer);
        finish(null);
      }
    });
    video.addEventListener('seeked', () => {
      try {
        const w = video.videoWidth || 320;
        const h = video.videoHeight || 180;
        if (w < 2 || h < 2) {
          window.clearTimeout(timer);
          finish(null);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          window.clearTimeout(timer);
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        window.clearTimeout(timer);
        finish(dataUrl.startsWith('data:image') ? dataUrl : null);
      } catch {
        window.clearTimeout(timer);
        finish(null);
      }
    });
    video.addEventListener('error', () => {
      window.clearTimeout(timer);
      finish(null);
    });
  });
}

/** Thumbnail для прямых mp4 — серверное `_thumb.jpg`, на web fallback кадр из video. */
export const DirectVideoThumbnail = React.memo(function DirectVideoThumbnail({ videoUrl }: { videoUrl: string }) {
  const resolvedUrl = rewriteSupabasePublicUrl(videoUrl) || videoUrl;
  const serverThumb = getVideoThumbnailUrl(resolvedUrl);
  const [serverThumbFailed, setServerThumbFailed] = React.useState(false);
  const [displayUri, setDisplayUri] = React.useState<string | null>(
    () => generatedThumbCache.get(resolvedUrl) ?? serverThumb
  );

  React.useEffect(() => {
    setServerThumbFailed(false);
  }, [resolvedUrl, serverThumb]);

  React.useEffect(() => {
    if (generatedThumbCache.has(resolvedUrl)) {
      setDisplayUri(generatedThumbCache.get(resolvedUrl)!);
      return;
    }
    if (serverThumb && !serverThumbFailed) {
      setDisplayUri(serverThumb);
      return;
    }
    setDisplayUri(null);
  }, [resolvedUrl, serverThumb, serverThumbFailed]);

  React.useEffect(() => {
    if (displayUri || Platform.OS !== 'web') return;
    let cancelled = false;
    void (async () => {
      const frame = await captureWebVideoFrame(resolvedUrl);
      if (cancelled || !frame) return;
      generatedThumbCache.set(resolvedUrl, frame);
      setDisplayUri(frame);
    })();
    return () => {
      cancelled = true;
    };
  }, [displayUri, resolvedUrl]);

  const handleImageError = React.useCallback(() => {
    if (serverThumb && displayUri === serverThumb) {
      setServerThumbFailed(true);
    }
    setDisplayUri(null);
  }, [displayUri, serverThumb]);

  if (displayUri) {
    return (
      <ExpoImage
        source={{ uri: displayUri }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        onError={handleImageError}
      />
    );
  }

  return (
    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name="videocam" size={36} color="#555" />
    </View>
  );
});

export const VideoPreviewThumbnail = React.memo(function VideoPreviewThumbnail({ videoUrl }: { videoUrl: string }) {
  const [vkThumbnailUrl, setVkThumbnailUrl] = React.useState<string | null>(null);
  const [vkThumbnailError, setVkThumbnailError] = React.useState(false);

  const decodeAndCleanUrl = (url: string): string => {
    if (!url) return url;
    return url.replace(/&amp;/g, '&').replace(/\s+/g, '');
  };

  const getCachedInitialIndex = (videoId: string) => {
    return thumbnailFormatCache.get(videoId) || 0;
  };

  const isYouTubeUrl = (url: string): boolean => {
    const cleanUrl = url.trim().toLowerCase();
    return cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');
  };

  const isVkUrl = (url: string): boolean => {
    const cleanUrl = url.trim().toLowerCase();
    return cleanUrl.includes('vk.com/video') || cleanUrl.includes('vk.com/clip') || cleanUrl.includes('vkvideo.ru/video');
  };

  const getVKVideoId = (url: string): string | null => {
    const cleanUrl = url.trim();
    const patterns = [
      /vk\.com\/(?:video|clip)(-?\d+_\d+)/i,
      /m\.vk\.com\/(?:video|clip)(-?\d+_\d+)/i,
      /vkvideo\.ru\/video(-?\d+_\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const getYouTubeVideoId = (url: string): string | null => {
    const cleanUrl = url.trim();
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i,
      /youtu\.be\/([a-zA-Z0-9_-]+)/i,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i,
      /youtube\.com\/live\/([a-zA-Z0-9_-]+)/i,
      /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i,
    ];

    for (const pattern of patterns) {
      const videoIdMatch = cleanUrl.match(pattern);
      if (videoIdMatch && videoIdMatch[1]) {
        return videoIdMatch[1];
      }
    }
    return null;
  };

  const youtubeVideoId = getYouTubeVideoId(videoUrl);

  const [currentImageIndex, setCurrentImageIndex] = useState(() => {
    if (youtubeVideoId) {
      return getCachedInitialIndex(youtubeVideoId);
    }
    return 0;
  });

  const vkVideoId = isVkUrl(videoUrl) ? getVKVideoId(videoUrl) : null;

  useEffect(() => {
    if (vkVideoId && !vkThumbnailUrl && !vkThumbnailError) {
      const loadVkThumbnail = async () => {
        try {
          let normalizedUrl = videoUrl.trim();
          normalizedUrl = normalizedUrl.split('?')[0];

          if (normalizedUrl.includes('vkvideo.ru')) {
            normalizedUrl = normalizedUrl.replace(/vkvideo\.ru/i, 'vk.com');
          }
          if (!normalizedUrl.startsWith('http')) {
            normalizedUrl = `https://${normalizedUrl}`;
          }

          const mobileUrl = normalizedUrl.replace('vk.com', 'm.vk.com');

          try {
            const htmlResp = await fetch(mobileUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
              },
            });

            const html = await htmlResp.text();
            const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
            const foundImage = (ogMatch && ogMatch[1]) || (twMatch && twMatch[1]) || null;

            if (foundImage) {
              setVkThumbnailUrl(decodeAndCleanUrl(foundImage));
              return;
            }
          } catch {
            /* ignore */
          }

          setVkThumbnailError(true);
        } catch {
          setVkThumbnailError(true);
        }
      };

      loadVkThumbnail();
    }
  }, [vkVideoId, videoUrl, vkThumbnailUrl, vkThumbnailError]);

  if (!isYouTubeUrl(videoUrl) && !isVkUrl(videoUrl)) {
    return <DirectVideoThumbnail videoUrl={videoUrl} />;
  }

  if (isYouTubeUrl(videoUrl) && youtubeVideoId) {
    const thumbnailFormats = [
      `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${youtubeVideoId}/sddefault.jpg`,
      `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${youtubeVideoId}/default.jpg`,
    ];

    const currentThumbnail = thumbnailFormats[currentImageIndex] || thumbnailFormats[0];

    const handleError = () => {
      if (currentImageIndex < thumbnailFormats.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
      }
    };

    const handleLoad = () => {
      if (youtubeVideoId) {
        thumbnailFormatCache.set(youtubeVideoId, currentImageIndex);
      }
    };

    return (
      <ExpoImage
        source={{ uri: currentThumbnail }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={100}
        onError={handleError}
        onLoad={handleLoad}
      />
    );
  }

  if (isVkUrl(videoUrl) && vkVideoId) {
    if (vkThumbnailUrl && !vkThumbnailError) {
      return (
        <View style={styles.vkThumbnail}>
          <ExpoImage
            source={{ uri: vkThumbnailUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setVkThumbnailError(true)}
          />
          <View style={styles.vkPlayOverlay}>
            <Ionicons name="play-circle" size={48} color="#fff" />
          </View>
        </View>
      );
    }

    if (!vkThumbnailError) {
      return (
        <View style={styles.vkThumbnail}>
          <View style={styles.vkThumbnailGradient}>
            <Ionicons name="play-circle" size={64} color="#fff" />
            <View style={styles.vkLogoContainer}>
              <Text style={styles.vkThumbnailText}>VK</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.vkThumbnail}>
        <View style={styles.vkThumbnailGradient}>
          <Ionicons name="play-circle" size={64} color="#fff" />
          <View style={styles.vkLogoContainer}>
            <Text style={styles.vkThumbnailText}>VK</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.errorThumbnail}>
      <Ionicons name="alert-circle" size={48} color="#fa2f40" />
      <Text style={styles.errorThumbnailText}>Только YouTube и VK</Text>
    </View>
  );
});

interface VideoCarouselProps {
  videos: Array<{ url: string; timeCode?: string }>;
  onVideoPress?: (video: { url: string; timeCode?: string }) => void;
  playerId?: string;
  externalRefreshTrigger?: number;
}

const { width: screenWidth } = Dimensions.get('window');

type VideoCarouselCardProps = {
  video: { url: string; timeCode?: string };
  playerId?: string;
  effectiveRefreshTrigger: number;
  cardWidth: number;
  cardHeight: number;
  onPress: (video: { url: string; timeCode?: string }) => void;
};

const VideoCarouselCard = React.memo(function VideoCarouselCard({
  video,
  playerId,
  effectiveRefreshTrigger,
  cardWidth,
  cardHeight,
  onPress,
}: VideoCarouselCardProps) {
  const contentId = generateVideoContentId(video.url, video.timeCode);
  return (
    <TouchableOpacity
      style={[styles.videoCard, { width: cardWidth, height: cardHeight }]}
      onPress={() => onPress(video)}
      activeOpacity={0.85}
    >
      <VideoPreviewThumbnail videoUrl={video.url} />
      <View style={styles.playButton}>
        <Ionicons name="play-circle" size={40} color="#fa2f40" />
      </View>
      {video.timeCode && (
        <View style={styles.timeCodeBadge}>
          <Text style={styles.timeCodeText}>{video.timeCode}</Text>
        </View>
      )}
      {playerId ? (
        <View style={styles.likeButtonContainer}>
          <LikeButton
            playerId={playerId}
            contentId={contentId}
            contentType="video"
            size="small"
            refreshTrigger={effectiveRefreshTrigger}
          />
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

export default function VideoCarousel({ videos, onVideoPress, playerId, externalRefreshTrigger = 0 }: VideoCarouselProps) {
  const { t } = useLanguage();
  const isDesktop = useIsDesktopLayout();
  const { width: cardWidth, height: cardHeight } = useMemo(
    () => getVideoTileSize(screenWidth, isDesktop),
    [isDesktop],
  );
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; timeCode?: string } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likeRefreshTrigger, setLikeRefreshTrigger] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10 && gestureState.dy > 0;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          setSelectedVideo(null);
        }
      },
    })
  ).current;

  const handleVideoPress = useCallback(
    (video: { url: string; timeCode?: string }) => {
      if (onVideoPress) {
        onVideoPress(video);
      } else {
        setSelectedVideo(video);
      }
    },
    [onVideoPress]
  );

  const closeModal = useCallback(() => {
    setSelectedVideo(null);
    setLikeRefreshTrigger((prev) => prev + 1);
  }, []);

  const effectiveRefreshTrigger = useMemo(
    () => Math.max(likeRefreshTrigger, externalRefreshTrigger),
    [likeRefreshTrigger, externalRefreshTrigger]
  );

  if (!videos || videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-outline" size={48} color="#fa2f40" />
        <Text style={styles.emptyText}>{t('noVideosAdded')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HorizontalScrollWithArrows
        contentContainerStyle={styles.scrollContainer}
        scrollStep={cardWidth + 16}
        onScroll={(event) => {
          const contentOffset = event.nativeEvent.contentOffset.x;
          const step = cardWidth + 16;
          setCurrentIndex(Math.round(contentOffset / step));
        }}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        decelerationRate="fast"
      >
        {videos.map((video) => (
          <VideoCarouselCard
            key={`${video.url}${video.timeCode ?? ''}`}
            video={video}
            playerId={playerId}
            effectiveRefreshTrigger={effectiveRefreshTrigger}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            onPress={handleVideoPress}
          />
        ))}
      </HorizontalScrollWithArrows>

      {videos.length > 1 && (
        <View style={styles.dotsContainer}>
          {videos.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentIndex && styles.activeDot]}
            />
          ))}
        </View>
      )}

      <Modal
        visible={selectedVideo !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay} {...panResponder.panHandlers}>
            <View style={styles.modalContent} pointerEvents="box-none">
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              {selectedVideo && (
                <View pointerEvents="box-none">
                  <VideoPlayer
                    key={`${selectedVideo.url}-${selectedVideo.timeCode || ''}`}
                    url={selectedVideo.url}
                    timeCode={selectedVideo.timeCode}
                    autoPlay
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 5,
  },
  videoCard: {
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(250, 47, 64, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: 'rgba(22, 22, 26, 0.78)',
    borderRadius: 20,
  },
  timeCodeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(22, 22, 26, 0.86)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeCodeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  likeButtonContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 22, 26, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(22, 22, 26, 0.78)',
    borderRadius: 20,
    padding: 8,
  },
  carouselIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(250, 47, 64, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fa2f40',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  errorThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 47, 64, 0.1)',
  },
  errorThumbnailText: {
    color: '#fa2f40',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    marginTop: 8,
    textAlign: 'center',
  },
  vkThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  vkThumbnailGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0077FF',
    opacity: 0.9,
    position: 'relative',
  },
  vkLogoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    marginTop: 8,
  },
  vkThumbnailText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  vkPlayOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    opacity: 0.9,
  },
});
