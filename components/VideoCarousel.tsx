import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer from './VideoPlayer';
import { useLanguage } from '../contexts/LanguageContext';
import LikeButton from './LikeButton';
import { generateVideoContentId } from '../utils/likesService';

// Кеш для успешных форматов превью (чтобы не перебирать форматы каждый раз)
const thumbnailFormatCache = new Map<string, number>();

// Компонент для изображения с fallback (оптимизированный)
const VideoThumbnail = React.memo(function VideoThumbnail({ videoUrl }: { videoUrl: string }) {
  const [vkThumbnailUrl, setVkThumbnailUrl] = React.useState<string | null>(null);
  const [vkThumbnailError, setVkThumbnailError] = React.useState(false);
  const [vkThumbnailIndex, setVkThumbnailIndex] = React.useState(0);
  
  // Утилита: декодируем HTML сущности и чистим возможные переносы/пробелы в URL
  const decodeAndCleanUrl = (url: string): string => {
    if (!url) return url;
    let cleaned = url.replace(/&amp;/g, '&').replace(/\s+/g, '');
    return cleaned;
  };
  
  // ОПТИМИЗАЦИЯ: Используем кеш для начального индекса формата
  const getCachedInitialIndex = (videoId: string) => {
    return thumbnailFormatCache.get(videoId) || 0;
  };
  
  // Функция для проверки YouTube ссылки
  const isYouTubeUrl = (url: string): boolean => {
    const cleanUrl = url.trim().toLowerCase();
    return cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');
  };

  // Функция для проверки VK ссылки
  const isVkUrl = (url: string): boolean => {
    const cleanUrl = url.trim().toLowerCase();
    return cleanUrl.includes('vk.com/video') || cleanUrl.includes('vk.com/clip') || cleanUrl.includes('vkvideo.ru/video');
  };

  // Функция для извлечения ID VK видео
  const getVKVideoId = (url: string): string | null => {
    const cleanUrl = url.trim();
    const patterns = [
      /vk\.com\/(?:video|clip)(-?\d+_\d+)/i,
      /m\.vk\.com\/(?:video|clip)(-?\d+_\d+)/i,
      /vkvideo\.ru\/video(-?\d+_\d+)/i
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
      /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i
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
  
  // ОПТИМИЗАЦИЯ: Начинаем с hqdefault (более надежный формат), сохраняем в кеш успешный формат
  const [currentImageIndex, setCurrentImageIndex] = useState(() => {
    if (youtubeVideoId) {
      return getCachedInitialIndex(youtubeVideoId);
    }
    return 1; // Начинаем с hqdefault (индекс 1) - он быстрее загружается
  });

  const vkVideoId = isVkUrl(videoUrl) ? getVKVideoId(videoUrl) : null;

  // Загружаем превью VK через og:image со страницы (без использования API)
  useEffect(() => {
    if (vkVideoId && !vkThumbnailUrl && !vkThumbnailError) {
      const loadVkThumbnail = async () => {
        try {
          console.log('🔍 Загрузка превью VK:', { vkVideoId, videoUrl });

          // Нормализуем URL
          let normalizedUrl = videoUrl.trim();
          normalizedUrl = normalizedUrl.split('?')[0]; // Убираем параметры

          if (normalizedUrl.includes('vkvideo.ru')) {
            normalizedUrl = normalizedUrl.replace(/vkvideo\.ru/i, 'vk.com');
          }
          if (!normalizedUrl.startsWith('http')) {
            normalizedUrl = `https://${normalizedUrl}`;
          }

          // Используем мобильную версию VK (m.vk.com) - она работает лучше
          const mobileUrl = normalizedUrl.replace('vk.com', 'm.vk.com');

          try {
            console.log('🔎 Получаю превью со страницы:', mobileUrl);
            const htmlResp = await fetch(mobileUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
              },
            });

            const html = await htmlResp.text();

            // Ищем og:image в HTML
            const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

            const foundImage = (ogMatch && ogMatch[1]) || (twMatch && twMatch[1]) || null;

            if (foundImage) {
              const cleaned = decodeAndCleanUrl(foundImage);
              console.log('✅ Найдено превью VK:', cleaned);
              setVkThumbnailUrl(cleaned);
              return;
            }
          } catch (fetchError) {
            console.log('⚠️ Ошибка при получении превью:', fetchError);
          }

          // Если не получилось, показываем placeholder
          console.log('ℹ️ Не удалось получить превью VK, показываем placeholder');
          setVkThumbnailError(true);
        } catch (error) {
          console.log('❌ Ошибка загрузки превью VK:', error);
          setVkThumbnailError(true);
        }
      };

      loadVkThumbnail();
    }
  }, [vkVideoId, videoUrl, vkThumbnailUrl, vkThumbnailError]);

  // Для YouTube видео
  if (isYouTubeUrl(videoUrl) && youtubeVideoId) {
    // ОПТИМИЗАЦИЯ: Изменен порядок - сначала hqdefault (более надежный и быстрый)
    const thumbnailFormats = [
      `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${youtubeVideoId}/sddefault.jpg`,
      `https://img.youtube.com/vi/${youtubeVideoId}/default.jpg`
    ];
    
    const currentThumbnail = thumbnailFormats[currentImageIndex];
    
    const handleError = () => {
      if (currentImageIndex < thumbnailFormats.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
      }
    };
    
    const handleLoad = () => {
      // ОПТИМИЗАЦИЯ: Кешируем успешный формат для этого видео
      if (youtubeVideoId) {
        thumbnailFormatCache.set(youtubeVideoId, currentImageIndex);
      }
    };
    
    return (
      <Image
        source={{ uri: currentThumbnail }}
        style={styles.thumbnail}
        resizeMode="cover"
        onError={handleError}
        onLoad={handleLoad}
      />
    );
  }

  if (isVkUrl(videoUrl) && vkVideoId) {
    // Если есть превью из oEmbed, показываем его
    if (vkThumbnailUrl && !vkThumbnailError) {
      return (
        <View style={styles.vkThumbnail}>
          <Image
            source={{ uri: vkThumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={() => {
              console.log('⚠️ Превью из oEmbed не загрузилось');
              setVkThumbnailError(true);
            }}
            onLoad={() => {
              console.log('✅ VK превью успешно загружено:', vkThumbnailUrl);
            }}
          />
          <View style={styles.vkPlayOverlay}>
            <Ionicons name="play-circle" size={48} color="#fff" />
          </View>
        </View>
      );
    }
    
    // Если еще загружается, показываем placeholder
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
    
    // Placeholder для VK видео (когда превью недоступно)
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
  
  // Fallback для не-YouTube и не-VK ссылок
  return (
    <View style={styles.errorThumbnail}>
      <Ionicons name="alert-circle" size={48} color="#FF4444" />
      <Text style={styles.errorThumbnailText}>Только YouTube и VK</Text>
    </View>
  );
});

interface VideoCarouselProps {
  videos: Array<{ url: string; timeCode?: string }>;
  onVideoPress?: (video: { url: string; timeCode?: string }) => void;
  playerId?: string; // ID игрока, владельца видео
  externalRefreshTrigger?: number; // Внешний trigger для синхронизации лайков
}

const { width: screenWidth } = Dimensions.get('window');

type VideoCarouselCardProps = {
  video: { url: string; timeCode?: string };
  index: number;
  playerId?: string;
  effectiveRefreshTrigger: number;
  onPress: (video: { url: string; timeCode?: string }) => void;
};

const VideoCarouselCard = React.memo(function VideoCarouselCard({
  video,
  index,
  playerId,
  effectiveRefreshTrigger,
  onPress,
}: VideoCarouselCardProps) {
  const contentId = generateVideoContentId(video.url, video.timeCode);
  return (
    <TouchableOpacity style={styles.videoCard} onPress={() => onPress(video)} activeOpacity={0.85}>
      <VideoThumbnail videoUrl={video.url} />
      <View style={styles.playButton}>
        <Ionicons name="play-circle" size={40} color="#FF4444" />
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
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{index + 1}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function VideoCarousel({ videos, onVideoPress, playerId, externalRefreshTrigger = 0 }: VideoCarouselProps) {
  const { t } = useLanguage();
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; timeCode?: string } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likeRefreshTrigger, setLikeRefreshTrigger] = useState(0);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Реагируем на движение вниз (swipe down)
        return Math.abs(gestureState.dy) > 10 && gestureState.dy > 0;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Если свайп вниз достаточно большой (больше 50 пикселей), закрываем модальное окно
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
    setLikeRefreshTrigger(prev => prev + 1);
  }, []);

  const effectiveRefreshTrigger = useMemo(
    () => Math.max(likeRefreshTrigger, externalRefreshTrigger),
    [likeRefreshTrigger, externalRefreshTrigger]
  );

  if (!videos || videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-outline" size={48} color="#FF4444" />
        <Text style={styles.emptyText}>{t('noVideosAdded')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        onScroll={(event) => {
          const contentOffset = event.nativeEvent.contentOffset.x;
          const cardWidth = screenWidth * 0.65 + 16; // ширина карточки + отступы
          const newIndex = Math.round(contentOffset / cardWidth);
          setCurrentIndex(newIndex);
        }}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        decelerationRate="fast"
      >
        {videos.map((video, index) => (
          <VideoCarouselCard
            key={`${video.url}${video.timeCode ?? ''}`}
            video={video}
            index={index}
            playerId={playerId}
            effectiveRefreshTrigger={effectiveRefreshTrigger}
            onPress={handleVideoPress}
          />
        ))}
      </ScrollView>

      {/* Точки-индикаторы */}
      {videos.length > 1 && (
        <View style={styles.dotsContainer}>
          {videos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot
              ]}
            />
          ))}
        </View>
      )}

      {/* Модальное окно для просмотра видео */}
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
                <View pointerEvents="box-only">
              <VideoPlayer
                    key={`${selectedVideo.url}-${selectedVideo.timeCode || ''}`}
                url={selectedVideo.url}
                timeCode={selectedVideo.timeCode}
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
    width: screenWidth * 0.65,
    height: 180,
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
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
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderRadius: 20,
  },
  timeCodeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
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
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    padding: 10,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
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
    backgroundColor: 'rgba(1, 0, 0, 0.9)',
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
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
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
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FF4444',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  errorThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  errorThumbnailText: {
    color: '#FF4444',
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
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