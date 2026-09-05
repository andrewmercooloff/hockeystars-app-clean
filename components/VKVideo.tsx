import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, View, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { WebView } from 'react-native-webview';

interface VKVideoProps {
  url: string;
  title?: string;
  onClose?: () => void;
  timeCode?: string; // Формат: "1:25" или "01:25"
}

const { width, height } = Dimensions.get('window');
const videoHeight = Math.min(height * 0.6, width * 0.5625); // 16:9 aspect ratio

const VKVideo: React.FC<VKVideoProps> = ({ url, title, onClose, timeCode }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  // Функция для извлечения ID видео VK
  const getVKVideoId = (url: string): string | null => {
    const cleanUrl = url.trim();
    
    // Паттерны для VK видео: vk.com/video-123456_789012, vk.com/video123456_789012, vkvideo.ru/video-123456_789012
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

  const vkVideoId = getVKVideoId(url);
  const startSeconds = timeCode ? timeCodeToSeconds(timeCode) : 0;

  if (!vkVideoId) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#fa2f40" />
        <Text style={styles.errorText}>Неверная ссылка на VK видео</Text>
        <Text style={styles.errorSubtext}>Поддерживаются только ссылки vk.com/video и vk.com/clip</Text>
        <Text style={styles.errorSubtext}>{url}</Text>
      </View>
    );
  }

  // Формируем URL для VK виджета
  // Согласно документации: https://dev.vk.com/ru/widgets/video
  // Формат: https://vk.com/video_ext.php?oid={owner_id}&id={video_id}&hash={hash}&hd=1
  const [ownerId, videoId] = vkVideoId.split('_');
  // Добавляем autoplay=1 для автоматического запуска
  const embedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hash=&hd=1&autoplay=1${startSeconds > 0 ? `&t=${startSeconds}` : ''}`;
  
  // Используем iframe для встраивания VK видео
  const iframeHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
          }
        </style>
      </head>
      <body>
        <iframe
          src="${embedUrl}"
          frameborder="0"
          allow="autoplay; encrypted-media; fullscreen"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fa2f40" />
          </View>
        )}
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
          javaScriptEnabled={true}
          domStorageEnabled={true}
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
    height: videoHeight,
    backgroundColor: '#000',
    position: 'relative',
  },
  webView: {
    width: '100%',
    height: videoHeight,
    backgroundColor: '#000',
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
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(250, 47, 64, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  errorText: {
    color: '#fa2f40',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#fa2f40',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default VKVideo;

