import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

interface YouTubeVideoProps {
  url: string;
  title?: string;
  onClose?: () => void;
  timeCode?: string; // Формат: "1:25" или "01:25"
}

const { width, height } = Dimensions.get('window');

const YouTubeVideo: React.FC<YouTubeVideoProps> = ({ url, timeCode }) => {
  const [loading, setLoading] = useState(true);

  // Функция для проверки YouTube ссылки
  const isYouTubeUrl = (url: string): boolean => {
    const cleanUrl = url.trim().toLowerCase();
    return cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be');
  };

  // Универсальная функция для извлечения ID видео из YouTube URL
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

  // Функция для конвертации таймкода в секунды
  const timeCodeToSeconds = (timeCode: string): number => {
    const parts = timeCode.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const youtubeVideoId = getYouTubeVideoId(url);
  const startSeconds = timeCode ? timeCodeToSeconds(timeCode) : 0;

  // Проверяем, что это YouTube ссылка
  if (!isYouTubeUrl(url) || !youtubeVideoId) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF4444" />
        <Text style={styles.errorText}>Неверная ссылка на YouTube</Text>
        <Text style={styles.errorSubtext}>Поддерживаются только YouTube ссылки</Text>
      </View>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&start=${startSeconds}&modestbranding=1&rel=0&controls=1&playsinline=1`;
  
  const iframeHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <iframe
          src="${embedUrl}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;
  
  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <WebView
          source={{ html: iframeHtml }}
          style={styles.webView}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onLoad={() => {
            setLoading(false);
          }}
          onError={(error) => {
            console.error('WebView error:', error);
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
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  webView: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
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

