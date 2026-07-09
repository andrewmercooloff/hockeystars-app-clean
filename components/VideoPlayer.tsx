import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import YouTubeVideo from './YouTubeVideo';
import VKVideo from './VKVideo';

interface VideoPlayerProps {
  url: string;
  title?: string;
  onClose?: () => void;
  timeCode?: string;
  /** Встроенный плеер (уведомления) — заполняет контейнер */
  embedded?: boolean;
  /** Сразу начать воспроизведение после загрузки (модалка профиля) */
  autoPlay?: boolean;
  /** Блокировка скролла родителя (FlatList уведомлений) во время перемотки */
  onScrubActiveChange?: (active: boolean) => void;
  /** false — остановить воспроизведение (карусель пролистнули) */
  isActive?: boolean;
  /** Заполнить родительский контейнер (модалка на весь экран) */
  fullscreen?: boolean;
}

const getVideoType = (url: string): 'youtube' | 'vk' | 'direct' => {
  const cleanUrl = url.trim().toLowerCase();
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) return 'youtube';
  if (cleanUrl.includes('vk.com/video') || cleanUrl.includes('vk.com/clip') || cleanUrl.includes('vkvideo.ru/video')) return 'vk';
  return 'direct';
};

const UI_HIDE_MS = 2600;

const formatTime = (ms: number): string => {
  if (!ms || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const THUMB_SIZE = 14;

type TrackMetrics = { pageX: number; width: number };

/** Точная перемотка: absoluteX + measureInWindow, изолированный жест от FlatList */
const VideoSeekBar: React.FC<{
  durationMs: number;
  positionMs: number;
  onScrubStart: () => void;
  onScrubChange: (ms: number) => void;
  onScrubEnd: (ms: number) => void;
}> = ({ durationMs, positionMs, onScrubStart, onScrubChange, onScrubEnd }) => {
  const trackRef = useRef<View>(null);
  const metricsRef = useRef<TrackMetrics>({ pageX: 0, width: 0 });
  const durationMsRef = useRef(durationMs);
  const callbacksRef = useRef({ onScrubStart, onScrubChange, onScrubEnd });
  const scrubbingRef = useRef(false);

  durationMsRef.current = durationMs;
  callbacksRef.current = { onScrubStart, onScrubChange, onScrubEnd };

  const [trackWidth, setTrackWidth] = useState(0);

  const syncMetrics = useCallback(() => {
    trackRef.current?.measureInWindow((pageX, _y, width) => {
      if (width > 0) {
        metricsRef.current = { pageX, width };
        setTrackWidth(width);
      }
    });
  }, []);

  const msFromAbsoluteX = useCallback((absoluteX: number) => {
    const { pageX: trackX, width } = metricsRef.current;
    const dur = durationMsRef.current;
    if (width <= 0 || dur <= 0) return 0;
    const x = Math.max(0, Math.min(width, absoluteX - trackX));
    return Math.round((x / width) * dur);
  }, []);

  const applyTouch = useCallback((absoluteX: number, phase: 'start' | 'move' | 'end') => {
    const ms = msFromAbsoluteX(absoluteX);
    if (phase === 'start') {
      scrubbingRef.current = true;
      callbacksRef.current.onScrubStart();
      callbacksRef.current.onScrubChange(ms);
    } else if (phase === 'move') {
      if (!scrubbingRef.current) return;
      callbacksRef.current.onScrubChange(ms);
    } else {
      scrubbingRef.current = false;
      callbacksRef.current.onScrubEnd(ms);
    }
  }, [msFromAbsoluteX]);

  const progress = durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;
  const thumbLeft = progress * trackWidth;

  const track = (
    <View
      ref={trackRef}
      style={dvStyles.seekTrackWrap}
      onLayout={syncMetrics}
      onTouchStart={(e) => {
        syncMetrics();
        applyTouch(e.nativeEvent.pageX, 'start');
      }}
      onTouchMove={(e) => {
        applyTouch(e.nativeEvent.pageX, 'move');
      }}
      onTouchEnd={(e) => {
        applyTouch(e.nativeEvent.pageX, 'end');
      }}
      onTouchCancel={(e) => {
        applyTouch(e.nativeEvent.pageX, 'end');
      }}
    >
      <View style={dvStyles.seekTrackBg} />
      <View style={[dvStyles.seekTrackFill, { width: `${progress * 100}%` }]} />
      <View
        style={[
          dvStyles.seekThumb,
          { transform: [{ translateX: thumbLeft - THUMB_SIZE / 2 }] },
        ]}
      />
    </View>
  );

  return (
    <View style={dvStyles.seekBarRow}>
      <Text style={dvStyles.timeLabel}>{formatTime(positionMs)}</Text>
      <NativeViewGestureHandler disallowInterruption>
        {track}
      </NativeViewGestureHandler>
      <Text style={dvStyles.timeLabel}>{formatTime(durationMs)}</Text>
    </View>
  );
};

/** Единый mp4-плеер: тап — play/pause, seek вынесен из слоя тапа, loop */
const DirectVideoPlayer: React.FC<{
  url: string;
  onClose?: () => void;
  embedded?: boolean;
  autoPlay?: boolean;
  fullscreen?: boolean;
  onScrubActiveChange?: (active: boolean) => void;
  isActive?: boolean;
}> = ({
  url,
  onClose,
  embedded,
  autoPlay,
  fullscreen,
  onScrubActiveChange,
  isActive = true,
}) => {
  const videoRef = useRef<Video>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayStartedRef = useRef(false);
  const isScreenFocused = useIsFocused();

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUi, setShowUi] = useState(embedded);
  const [error, setError] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubMs, setScrubMs] = useState(0);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHideUi = useCallback(() => {
    if (embedded) return;
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => setShowUi(false), UI_HIDE_MS);
  }, [clearHideTimer, embedded]);

  const revealUi = useCallback(
    (autoHide: boolean) => {
      setShowUi(true);
      if (autoHide && isPlaying) scheduleHideUi();
      else clearHideTimer();
    },
    [clearHideTimer, isPlaying, scheduleHideUi],
  );

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const stopPlayback = useCallback(async () => {
    try {
      await videoRef.current?.pauseAsync();
      await videoRef.current?.stopAsync();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => () => { stopPlayback(); }, [stopPlayback]);

  useEffect(() => {
    if (!isScreenFocused) stopPlayback();
  }, [isScreenFocused, stopPlayback]);

  useEffect(() => {
    if (!isActive) stopPlayback();
  }, [isActive, stopPlayback]);

  useEffect(() => {
    autoPlayStartedRef.current = false;
    setIsScrubbing(false);
    setScrubMs(0);
    setPositionMs(0);
    setDurationMs(0);
  }, [url]);

  const play = useCallback(async () => {
    if (!videoRef.current || error) return;
    await videoRef.current.playAsync();
    setShowUi(true);
    scheduleHideUi();
  }, [error, scheduleHideUi]);

  const pause = useCallback(async () => {
    if (!videoRef.current) return;
    await videoRef.current.pauseAsync();
    clearHideTimer();
    setShowUi(true);
  }, [clearHideTimer]);

  useEffect(() => {
    if (autoPlay && !isLoading && !error && !autoPlayStartedRef.current) {
      autoPlayStartedRef.current = true;
      play();
    }
  }, [autoPlay, isLoading, error, play]);

  const onVideoTap = useCallback(async () => {
    if (error || isScrubbing) return;
    if (isPlaying) await pause();
    else await play();
  }, [error, isPlaying, isScrubbing, pause, play]);

  const onStatus = (s: AVPlaybackStatus) => {
    if (!s.isLoaded) return;
    setIsPlaying(s.isPlaying);
    if (!isScrubbing) {
      setPositionMs(s.positionMillis);
    }
    if (s.durationMillis != null && s.durationMillis > 0) {
      setDurationMs(s.durationMillis);
    }
  };

  const seekTo = async (ms: number) => {
    if (!videoRef.current || durationMs <= 0) return;
    const next = Math.max(0, Math.min(durationMs, Math.round(ms)));
    setPositionMs(next);
    setScrubMs(next);
    try {
      await videoRef.current.setStatusAsync({
        positionMillis: next,
        shouldPlay: isPlaying,
      });
    } catch {
      /* ignore */
    }
  };

  const beginScrub = useCallback(() => {
    setIsScrubbing(true);
    setScrubMs(positionMs);
    onScrubActiveChange?.(true);
    clearHideTimer();
    setShowUi(true);
  }, [clearHideTimer, onScrubActiveChange, positionMs]);

  const changeScrub = useCallback((ms: number) => {
    setScrubMs(ms);
  }, []);

  const endScrub = useCallback(
    async (ms: number) => {
      setIsScrubbing(false);
      onScrubActiveChange?.(false);
      await seekTo(ms);
      if (isPlaying && !embedded) scheduleHideUi();
    },
    [embedded, isPlaying, onScrubActiveChange, scheduleHideUi],
  );

  const showSeekBar = embedded ? durationMs > 0 && !error : (showUi || !isPlaying) && durationMs > 0 && !error;
  const showCenterPlay = !isPlaying && !isLoading && !error && !isScrubbing;
  const sliderValue = isScrubbing ? scrubMs : positionMs;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View
      style={[
        dvStyles.container,
        embedded && dvStyles.containerEmbedded,
        fullscreen && dvStyles.containerFullscreen,
      ]}
    >
      <View style={[dvStyles.videoArea, embedded && dvStyles.videoAreaEmbedded]}>
        <Video
          ref={videoRef}
          source={{ uri: url }}
          style={[dvStyles.video, embedded && dvStyles.videoEmbedded]}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          isLooping
          shouldPlay={false}
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError(true);
          }}
          progressUpdateIntervalMillis={100}
          onPlaybackStatusUpdate={onStatus}
        />

        {!isScrubbing && (
          <Pressable style={dvStyles.touchOverlay} onPress={onVideoTap} />
        )}

        {onClose && !embedded && (
          <TouchableOpacity style={dvStyles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {isLoading && !error && (
          <View style={dvStyles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#fa2f40" />
          </View>
        )}

        {error && (
          <View style={dvStyles.loadingOverlay}>
            <Ionicons name="alert-circle-outline" size={40} color="#fa2f40" />
            <Text style={dvStyles.errorText}>Не удалось загрузить видео</Text>
          </View>
        )}

        {showCenterPlay && (
          <Pressable style={dvStyles.centerPlayWrap} onPress={onVideoTap}>
            <Ionicons name="play-circle" size={embedded ? 52 : 64} color="rgba(255,255,255,0.92)" />
          </Pressable>
        )}

        {durationMs > 0 && !error && isPlaying && !showSeekBar && !embedded && (
          <View style={dvStyles.miniProgressTrack} pointerEvents="none">
            <View style={[dvStyles.miniProgressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>

      {showSeekBar && (
        <VideoSeekBar
          durationMs={durationMs}
          positionMs={sliderValue}
          onScrubStart={beginScrub}
          onScrubChange={changeScrub}
          onScrubEnd={(ms) => { void endScrub(ms); }}
        />
      )}
    </View>
  );
};

const dvStyles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  containerEmbedded: {
    flex: 1,
    aspectRatio: undefined,
    height: '100%',
    backgroundColor: 'transparent',
  },
  containerFullscreen: {
    flex: 1,
    width: '100%',
    height: '100%',
    aspectRatio: undefined,
  },
  videoArea: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
    overflow: 'hidden',
  },
  videoAreaEmbedded: {
    backgroundColor: 'transparent',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoEmbedded: {
    backgroundColor: 'transparent',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 5,
  },
  centerPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  miniProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    zIndex: 12,
  },
  miniProgressFill: {
    height: 3,
    backgroundColor: '#fa2f40',
  },
  seekBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 20,
  },
  seekTrackWrap: {
    flex: 1,
    height: 36,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  seekTrackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  seekTrackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fa2f40',
  },
  seekThumb: {
    position: 'absolute',
    left: 0,
    top: (36 - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fa2f40',
    borderWidth: 2,
    borderColor: '#fff',
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    minWidth: 34,
    textAlign: 'center',
  },
  errorText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 13,
  },
});

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title,
  onClose,
  timeCode,
  embedded,
  autoPlay,
  onScrubActiveChange,
  fullscreen,
  isActive,
}) => {
  const videoType = getVideoType(url);
  if (videoType === 'youtube') return <YouTubeVideo url={url} title={title} onClose={onClose} timeCode={timeCode} />;
  if (videoType === 'vk') return <VKVideo url={url} title={title} onClose={onClose} timeCode={timeCode} />;
  return (
    <DirectVideoPlayer
      url={url}
      onClose={onClose}
      embedded={embedded}
      autoPlay={autoPlay}
      fullscreen={fullscreen}
      onScrubActiveChange={onScrubActiveChange}
      isActive={isActive}
    />
  );
};

export default VideoPlayer;
