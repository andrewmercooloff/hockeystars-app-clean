import React from 'react';
import { ImageBackground, ImageBackgroundProps } from 'react-native';
import { imageCache, APP_IMAGES } from '../utils/ImageCache';

interface OptimizedBackgroundProps extends Omit<ImageBackgroundProps, 'source'> {
  source?: any;
  useLedBackground?: boolean;
}

const OptimizedBackground: React.FC<OptimizedBackgroundProps> = ({ 
  source, 
  useLedBackground = false,
  ...props 
}) => {
  // Используем кешированное изображение
  const imageSource = useLedBackground 
    ? imageCache.getImage(APP_IMAGES.LED_BACKGROUND)
    : source ? imageCache.getImage(source) : source;

  return (
    <ImageBackground
      source={imageSource}
      {...props}
    />
  );
};

export default OptimizedBackground;

