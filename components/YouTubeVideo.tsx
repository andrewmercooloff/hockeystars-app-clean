import SafeIcon from './SafeIcon';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

interface YouTubeVideoProps {
  url: string;
  title?: string;
  onClose?: () => void;
  timeCode?: string; // Формат: "1:25" или "01:25"
}

const { width, height } = Dimensions.get('window');

const YouTubeVideo: React.FC<YouTubeVideoProps> = ({ url, title, onClose, timeCode }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  console.log('YouTubeVideo component:', { url, title, timeCode });

  // Функция для проверки YouTube ссылки
  const isYouTubeUrl = (url: string): boolean => {
    const cleanUrl = url.trim().toLowerCase();
    return cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');
  };

  // Универсальная функция для извлечения ID видео и параметров из YouTube URL
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
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  // Извлекаем параметр si (session ID) из URL если есть
  const getSessionId = (url: string): string | null => {
    const siMatch = url.match(/[?&]si=([a-zA-Z0-9_-]+)/i);
    return siMatch ? siMatch[1] : null;
  };

  // Функция для конвертации таймкода в секунды
  const timeCodeToSeconds = (timeCode: string): number => {
    const parts = timeCode.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const youtubeVideoId = getYouTubeVideoId(url);
  const sessionId = getSessionId(url);
  const startSeconds = timeCode ? timeCodeToSeconds(timeCode) : 0;

  console.log('YouTubeVideo parsed:', { 
    youtubeVideoId, 
    sessionId,
    startSeconds, 
    isYouTube: isYouTubeUrl(url) 
  });

  // Проверяем, что это YouTube ссылка
  if (!isYouTubeUrl(url) || !youtubeVideoId) {
    console.error('Invalid YouTube URL:', { url, isYouTube: isYouTubeUrl(url), videoId: youtubeVideoId });
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF4444" />
        <Text style={styles.errorText}>Неверная ссылка на YouTube</Text>
        <Text style={styles.errorSubtext}>Поддерживаются только YouTube ссылки</Text>
        <Text style={styles.errorSubtext}>{url}</Text>
      </View>
    );
  }

  console.log('Final video ID:', youtubeVideoId, 'Start at:', startSeconds);

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title || t('myMoment')}
          {timeCode ? ` (${timeCode})` : ''}
        </Text>
      </View>

      {/* Видео плеер */}
      <View style={styles.videoContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4444" />
          </View>
        )}
        <YoutubePlayer
          height={300}
          videoId={youtubeVideoId}
          play={false}
          initialPlayerParams={{
            start: startSeconds,
            modestbranding: true,
            rel: false,
            showClosedCaptions: false,
            preventFullScreen: false,
          }}
          onReady={() => {
            console.log('YouTube player ready');
            setLoading(false);
          }}
          onError={(error) => {
            console.error('YouTube player error:', error);
            setLoading(false);
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 68, 68, 0.3)',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  openText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    marginTop: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#FF4444',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default YouTubeVideo;
