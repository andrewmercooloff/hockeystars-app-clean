import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

interface YouTubeVideoProps {
  url: string;
  title?: string;
  onClose?: () => void;
  timeCode?: string; // Формат: "1:25" или "01:25"
}

const YouTubeVideo: React.FC<YouTubeVideoProps> = ({ url, title, onClose, timeCode }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Начинаем с muted для автозапуска
  const playerRef = useRef<any>(null);

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

  // Функция для конвертации таймкода в секунды (поддерживает форматы ЧЧ:ММ:СС и ММ:СС)
  const timeCodeToSeconds = (timeCode: string): number => {
    const parts = timeCode.split(':');
    if (parts.length === 3) {
      // Формат ЧЧ:ММ:СС
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      // Формат ММ:СС (для обратной совместимости)
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const youtubeVideoId = getYouTubeVideoId(url);
  const startSeconds = timeCode ? timeCodeToSeconds(timeCode) : 0;

  console.log('YouTubeVideo parsed:', { 
    youtubeVideoId, 
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
      {/* Видео плеер */}
      <View style={styles.videoContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4444" />
          </View>
        )}
        <YoutubePlayer
          ref={playerRef}
          height={300}
          videoId={youtubeVideoId}
          play={true}
          mute={isMuted}
          initialPlayerParams={{
            start: startSeconds,
            autoplay: 1,
            mute: 1, // Начинаем с muted для обхода политики автозапуска
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            cc_load_policy: 0,
            fs: 1,
            loop: 0,
          }}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
          onReady={() => {
            console.log('YouTube player ready, attempting auto-play');
            setLoading(false);
            // Несколько попыток запуска
            const attemptPlay = (attempt: number) => {
              if (attempt > 3) {
                // После нескольких попыток включаем звук
                setTimeout(() => {
                  setIsMuted(false);
                  try {
                    if (playerRef.current) {
                      playerRef.current.unMute();
                    }
                  } catch (e) {
                    console.log('Cannot unmute via ref');
                  }
                }, 500);
                return;
              }
              
              setTimeout(() => {
                try {
                  if (playerRef.current) {
                    playerRef.current.playVideo();
                    console.log(`Auto-play attempt ${attempt}`);
                  }
                } catch (error) {
                  console.log(`Ref playVideo attempt ${attempt} failed`);
                }
                if (attempt < 3) {
                  attemptPlay(attempt + 1);
                }
              }, attempt === 1 ? 200 : attempt * 200);
            };
            attemptPlay(1);
          }}
          onError={(error) => {
            console.error('YouTube player error:', error);
            setLoading(false);
          }}
          onChangeState={(state) => {
            console.log('YouTube player state:', state);
            if (state === 'playing') {
              setLoading(false);
              // Включаем звук после начала воспроизведения
              setTimeout(() => {
                setIsMuted(false);
                try {
                  if (playerRef.current) {
                    playerRef.current.unMute();
                  }
                } catch (e) {
                  console.log('Cannot unmute');
                }
              }, 1000);
            }
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
