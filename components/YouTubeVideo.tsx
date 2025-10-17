import SafeIcon from './SafeIcon';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
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

  // Универсальная функция для извлечения ID видео из YouTube URL
  const getYouTubeVideoId = (url: string): string | null => {
    // Простая и надежная функция для извлечения YouTube ID
    // Поддерживает все форматы YouTube ссылок
    
    // Убираем лишние пробелы, но НЕ меняем регистр
    const cleanUrl = url.trim();
    
    // Паттерны для извлечения ID (регистронезависимые)
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
        return match[1]; // Возвращаем ID в оригинальном регистре
      }
    }
    
    return null;
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

  // Функция для форматирования таймкода для YouTube
  const formatTimeCodeForYouTube = (timeCode: string): string => {
    const seconds = timeCodeToSeconds(timeCode);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m${remainingSeconds.toString().padStart(2, '0')}s`;
  };

  const videoId = getYouTubeVideoId(url);
  const startSeconds = timeCode ? timeCodeToSeconds(timeCode) : 0;

  if (!videoId) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#fa2f40" />
        <Text style={styles.errorText}>Неверная ссылка на YouTube</Text>
      </View>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&start=${startSeconds}`;

  // Создаем HTML для встроенного YouTube плеера
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .video-container {
            width: 100%;
            height: 100%;
            position: relative;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
        <script src="https://www.youtube.com/iframe_api"></script>
      </head>
      <body>
        <div class="video-container">
          <div id="player"></div>
        </div>
        <script>
          var player;
          var startTime = ${startSeconds};
          
          function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${videoId}',
              playerVars: {
                'autoplay': 1,
                'rel': 0,
                'modestbranding': 1,
                'start': startTime
              },
              events: {
                'onReady': onPlayerReady
              }
            });
          }
          
          function onPlayerReady(event) {
            if (startTime > 0) {
              setTimeout(function() {
                event.target.seekTo(startTime);
              }, 2000);
            }
          }
        </script>
      </body>
    </html>
  `;

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
        <WebView
          source={{ html: htmlContent }}
          style={styles.webview}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
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
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250, 47, 64, 0.3)',
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
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(250, 47, 64, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
  },
  errorText: {
    color: '#fa2f40',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default YouTubeVideo; 