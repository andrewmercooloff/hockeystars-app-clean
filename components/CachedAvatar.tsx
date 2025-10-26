import React from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvatarCache } from '../utils/AvatarCache';

interface CachedAvatarProps {
  playerId: string;
  size?: number;
  fallbackIcon?: string;
  fallbackSize?: number;
  fallbackColor?: string;
  style?: any;
  onError?: () => void;
  onLoad?: () => void;
}

const CachedAvatar: React.FC<CachedAvatarProps> = ({
  playerId,
  size = 45,
  fallbackIcon = 'person',
  fallbackSize = 25,
  fallbackColor = '#fff',
  style,
  onError,
  onLoad,
}) => {
  const avatarUrl = useAvatarCache(playerId);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const handleLoad = React.useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
    onError?.();
  }, [onError]);

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style
  };

  // Если нет аватара или ошибка загрузки, показываем иконку
  if (!avatarUrl || imageError) {
    return (
      <View style={[imageStyle, { 
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center'
      }]}>
        <Ionicons 
          name={fallbackIcon as any} 
          size={fallbackSize} 
          color={fallbackColor} 
        />
      </View>
    );
  }

  return (
    <View style={imageStyle}>
      {/* Показываем изображение */}
      <Image
        source={{ 
          uri: avatarUrl,
          cache: 'force-cache',
          headers: {
            'Cache-Control': 'max-age=3600'
          }
        }}
        style={[imageStyle, { 
          opacity: imageLoaded ? 1 : 0.8
        }]}
        onError={handleError}
        onLoad={handleLoad}
      />
      
      {/* Показываем индикатор загрузки */}
      {!imageLoaded && !imageError && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: size / 2
        }}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </View>
  );
};

export default CachedAvatar;
