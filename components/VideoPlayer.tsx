import React from 'react';
import YouTubeVideo from './YouTubeVideo';
import VKVideo from './VKVideo';

interface VideoPlayerProps {
  url: string;
  title?: string;
  onClose?: () => void;
  timeCode?: string; // Формат: "1:25" или "01:25"
}

// Функция для определения типа видео
const getVideoType = (url: string): 'youtube' | 'vk' | 'unknown' => {
  const cleanUrl = url.trim().toLowerCase();
  
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    return 'youtube';
  }
  
  if (cleanUrl.includes('vk.com/video') || cleanUrl.includes('vk.com/clip') || cleanUrl.includes('vkvideo.ru/video')) {
    return 'vk';
  }
  
  return 'unknown';
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title, onClose, timeCode }) => {
  const videoType = getVideoType(url);
  
  if (videoType === 'youtube') {
    return <YouTubeVideo url={url} title={title} onClose={onClose} timeCode={timeCode} />;
  }
  
  if (videoType === 'vk') {
    return <VKVideo url={url} title={title} onClose={onClose} timeCode={timeCode} />;
  }
  
  // Fallback для неизвестных типов
  return (
    <YouTubeVideo url={url} title={title} onClose={onClose} timeCode={timeCode} />
  );
};

export default VideoPlayer;

