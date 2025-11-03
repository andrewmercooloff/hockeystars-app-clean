import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YouTubeVideo from './YouTubeVideo';
import { useLanguage } from '../contexts/LanguageContext';

// Функция для конвертации таймкода в секунды
const timeCodeToSeconds = (timeCode: string): number => {
  const parts = timeCode.split(':');
  if (parts.length === 3) {
    // Формат ЧЧ:ММ:СС
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // Формат ММ:СС
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  return 0;
};

// Компонент для изображения с fallback
const VideoThumbnail = ({ videoUrl, timeCode }: { videoUrl: string; timeCode?: string }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Функция для проверки YouTube ссылки
  const isYouTubeUrl = (url: string): boolean => {
    const cleanUrl = url.trim().toLowerCase();
    return cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');
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
  
  // Для YouTube видео
  if (isYouTubeUrl(videoUrl) && youtubeVideoId) {
    // Если есть таймкод, пытаемся получить кадр с нужного момента
    // Используем YouTube Data API v3 для получения thumbnail с определенного времени
    // Если timeCode есть, используем специальный формат
    let thumbnailUrl: string;
    
    if (timeCode) {
      const seconds = timeCodeToSeconds(timeCode);
      // YouTube позволяет получить кадр используя параметр t в URL
      // Формат: https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg?t=SECONDS
      // Но более надежно использовать YouTube Data API v3
      // Пока используем стандартный thumbnail, но можно улучшить с API ключом
      thumbnailUrl = `https://i.ytimg.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
    } else {
      // Стандартные форматы превью
      const thumbnailFormats = [
        `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
        `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`,
        `https://img.youtube.com/vi/${youtubeVideoId}/sddefault.jpg`,
        `https://img.youtube.com/vi/${youtubeVideoId}/default.jpg`
      ];
      thumbnailUrl = thumbnailFormats[currentImageIndex] || thumbnailFormats[0];
    }
    
    const handleError = () => {
      if (!timeCode && currentImageIndex < 4) {
        setCurrentImageIndex(currentImageIndex + 1);
      }
    };
    
    return (
      <Image
        source={{ uri: thumbnailUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
        onError={handleError}
      />
    );
  }
  
  // Fallback для не-YouTube ссылок
  return (
    <View style={styles.errorThumbnail}>
      <Ionicons name="alert-circle" size={48} color="#FF4444" />
      <Text style={styles.errorThumbnailText}>Только YouTube</Text>
    </View>
  );
};

interface VideoCarouselProps {
  videos: Array<{ url: string; timeCode?: string }>;
  onVideoPress?: (video: { url: string; timeCode?: string }) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function VideoCarousel({ videos, onVideoPress }: VideoCarouselProps) {
  const { t } = useLanguage();
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; timeCode?: string } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedVideoIndex, setExpandedVideoIndex] = useState<number | null>(null);
  

  const handleVideoPress = (video: { url: string; timeCode?: string }, index: number) => {
    if (onVideoPress) {
      onVideoPress(video);
    } else {
      // Разворачиваем видео прямо в карусели
      setExpandedVideoIndex(expandedVideoIndex === index ? null : index);
    }
  };

  const closeModal = () => {
    setSelectedVideo(null);
  };

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
          <View key={index} style={styles.videoCard}>
            {expandedVideoIndex === index ? (
              <View style={styles.expandedVideoContainer}>
                <TouchableOpacity 
                  style={styles.collapseButton}
                  onPress={() => setExpandedVideoIndex(null)}
                >
                  <Ionicons name="close-circle" size={30} color="#fff" />
                </TouchableOpacity>
                <YouTubeVideo
                  url={video.url}
                  timeCode={video.timeCode}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.thumbnailContainer}
                onPress={() => handleVideoPress(video, index)}
              >
                <VideoThumbnail videoUrl={video.url} timeCode={video.timeCode} />
                <View style={styles.playButton}>
                  <Ionicons name="play-circle" size={40} color="#FF4444" />
                </View>
                {video.timeCode && (
                  <View style={styles.timeCodeBadge}>
                    <Text style={styles.timeCodeText}>{video.timeCode}</Text>
                  </View>
                )}
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{index + 1}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {selectedVideo && (
              <YouTubeVideo
                key={`${selectedVideo.url}-${selectedVideo.timeCode || ''}`}
                url={selectedVideo.url}
                timeCode={selectedVideo.timeCode}
              />
            )}
          </View>
        </View>
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
    minHeight: 180,
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  expandedVideoContainer: {
    width: '100%',
    minHeight: 300,
    position: 'relative',
  },
  collapseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 2,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
  },
  timeCodeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeCodeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
    top: 10,
    right: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
}); 