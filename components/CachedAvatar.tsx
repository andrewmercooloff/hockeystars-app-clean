import React from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvatarCache } from '../utils/AvatarCache';
import { rewriteSupabasePublicUrl } from '../utils/supabase';

interface CachedAvatarProps {
  playerId: string;
  fallbackAvatarUrl?: string;
  size?: number;
  fallbackIcon?: string;
  fallbackSize?: number;
  fallbackColor?: string;
  style?: any;
  onError?: () => void;
  onLoad?: () => void;
  status?: string;
}

/** URL без query — для сравнения «тот же файл или нет». */
function avatarUriBase(url: string | null | undefined): string {
  if (!url) return '';
  return url.split('?')[0];
}

const CachedAvatar: React.FC<CachedAvatarProps> = React.memo(({
  playerId,
  fallbackAvatarUrl,
  size = 50,
  fallbackIcon = 'person',
  fallbackSize = 20,
  fallbackColor = '#fff',
  style,
  onError,
  onLoad,
  status,
}) => {
  const cachedAvatarUrl = useAvatarCache(playerId, rewriteSupabasePublicUrl(fallbackAvatarUrl) || undefined);
  const [imageError, setImageError] = React.useState(false);
  const [urlTimestamp, setUrlTimestamp] = React.useState(0);
  const [preferFallback, setPreferFallback] = React.useState(false);
  const [retryNonce, setRetryNonce] = React.useState(0);
  const retryCountRef = React.useRef(0);
  const prevUrlRef = React.useRef<string | null>(null);
  const lastGoodUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const currentUrl = rewriteSupabasePublicUrl(cachedAvatarUrl || fallbackAvatarUrl);
    const prevBase = avatarUriBase(prevUrlRef.current);
    const nextBase = avatarUriBase(currentUrl);

    if (currentUrl && nextBase !== prevBase) {
      prevUrlRef.current = currentUrl;
      if (
        currentUrl.startsWith('file://') ||
        currentUrl.startsWith('content://') ||
        currentUrl.startsWith('data:')
      ) {
        setUrlTimestamp(Date.now());
      } else {
        setUrlTimestamp(0);
      }
      setImageError(false);
      setPreferFallback(false);
      retryCountRef.current = 0;
    }
  }, [cachedAvatarUrl, fallbackAvatarUrl]);

  const effectiveAvatarUrl = React.useMemo(() => {
    const rewrittenFallback = rewriteSupabasePublicUrl(fallbackAvatarUrl);

    if (preferFallback && rewrittenFallback) {
      return rewrittenFallback;
    }

    if (cachedAvatarUrl) {
      if (
        (cachedAvatarUrl.startsWith('file://') ||
          cachedAvatarUrl.startsWith('content://') ||
          cachedAvatarUrl.startsWith('data:')) &&
        urlTimestamp > 0
      ) {
        const separator = cachedAvatarUrl.includes('?') ? '&' : '?';
        return `${cachedAvatarUrl}${separator}t=${urlTimestamp}`;
      }
      return rewriteSupabasePublicUrl(cachedAvatarUrl) || cachedAvatarUrl;
    }

    const url = rewriteSupabasePublicUrl(fallbackAvatarUrl);
    if (!url) return null;

    if (
      (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('data:')) &&
      urlTimestamp > 0
    ) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${urlTimestamp}`;
    }

    return url;
  }, [cachedAvatarUrl, fallbackAvatarUrl, urlTimestamp, preferFallback]);

  if (effectiveAvatarUrl) {
    lastGoodUrlRef.current = effectiveAvatarUrl;
  }

  const displayAvatarUrl = effectiveAvatarUrl || lastGoodUrlRef.current;

  const handleLoad = React.useCallback(() => {
    setImageError(false);
    retryCountRef.current = 0;
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    const url = effectiveAvatarUrl;
    const isRemote = !!url && (url.startsWith('http://') || url.startsWith('https://'));
    if (isRemote && retryCountRef.current < 2) {
      retryCountRef.current += 1;
      const delay = 400 * retryCountRef.current;
      setTimeout(() => setRetryNonce((n) => n + 1), delay);
      return;
    }
    const rewrittenFallback = rewriteSupabasePublicUrl(fallbackAvatarUrl);
    if (
      !preferFallback &&
      rewrittenFallback &&
      avatarUriBase(rewrittenFallback) !== avatarUriBase(cachedAvatarUrl || undefined)
    ) {
      setPreferFallback(true);
      setImageError(false);
      retryCountRef.current = 0;
      setRetryNonce((n) => n + 1);
      return;
    }
    if (!lastGoodUrlRef.current) {
      setImageError(true);
      onError?.();
    }
  }, [effectiveAvatarUrl, fallbackAvatarUrl, cachedAvatarUrl, preferFallback, onError]);

  const imageStyle = React.useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: style?.borderRadius || size / 2,
      ...style,
    }),
    [size, style]
  );

  const sourceUri = React.useMemo(() => {
    if (!displayAvatarUrl) return displayAvatarUrl;
    if (retryNonce === 0) return displayAvatarUrl;
    const separator = displayAvatarUrl.includes('?') ? '&' : '?';
    return `${displayAvatarUrl}${separator}r=${retryNonce}`;
  }, [displayAvatarUrl, retryNonce]);

  if (status === 'scout') {
    return (
      <View style={[imageStyle, { backgroundColor: '#2d1f4e', overflow: 'hidden' }]}>
        <Image
          source={require('../assets/images/scout.png')}
          style={imageStyle}
          contentFit="cover"
          transition={0}
          cachePolicy="memory-disk"
        />
      </View>
    );
  }

  // Пока нет URL вообще — иконка; при ошибке сети оставляем последний удачный кадр (без мигания).
  if (!displayAvatarUrl) {
    return (
      <View
        style={[
          imageStyle,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Ionicons name={fallbackIcon as any} size={fallbackSize} color={fallbackColor} />
      </View>
    );
  }

  return (
    <View style={[imageStyle, { backgroundColor: 'rgba(255, 255, 255, 0.12)', overflow: 'hidden' }]}>
      <Image
        source={{ uri: sourceUri }}
        style={imageStyle}
        contentFit="cover"
        onError={handleError}
        onLoad={handleLoad}
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
        recyclingKey={`${playerId}-${avatarUriBase(displayAvatarUrl)}`}
      />
      {imageError ? (
        <View
          style={[
            imageStyle,
            {
              position: 'absolute',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name={fallbackIcon as any} size={fallbackSize} color={fallbackColor} />
        </View>
      ) : null}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.playerId === nextProps.playerId &&
    avatarUriBase(prevProps.fallbackAvatarUrl) === avatarUriBase(nextProps.fallbackAvatarUrl) &&
    prevProps.size === nextProps.size &&
    prevProps.fallbackIcon === nextProps.fallbackIcon &&
    prevProps.fallbackSize === nextProps.fallbackSize &&
    prevProps.fallbackColor === nextProps.fallbackColor &&
    prevProps.status === nextProps.status
  );
});

export default CachedAvatar;
