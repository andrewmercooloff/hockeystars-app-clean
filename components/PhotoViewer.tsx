import React, { useEffect, useState, useRef } from 'react';
import {
    Dimensions,
    ImageBackground,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import CachedImage from './CachedImage';
import LikeButton from './LikeButton';
import { generatePhotoContentId } from '../utils/likesService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PhotoViewerProps {
  photos: string[];
  visible: boolean;
  onClose: () => void;
  initialIndex?: number;
  playerId?: string; // ID игрока, владельца фото
}

export default function PhotoViewer({ photos, visible, onClose, initialIndex = 0, playerId }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  // Обновляем currentIndex при изменении initialIndex
  useEffect(() => {
    setCurrentIndex(initialIndex);
    // Прокручиваем к нужному фото при открытии
    if (visible && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * screenWidth,
          animated: false,
        });
      }, 100);
    }
  }, [initialIndex, visible]);

  // Обработчик прокрутки для обновления текущего индекса
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / screenWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < photos.length) {
      setCurrentIndex(newIndex);
    }
  };

  const nextPhoto = () => {
    if (photos.length <= 1 || !scrollViewRef.current) return;
    const newIndex = (currentIndex + 1) % photos.length;
    scrollViewRef.current.scrollTo({
      x: newIndex * screenWidth,
      animated: true,
    });
  };

  const prevPhoto = () => {
    if (photos.length <= 1 || !scrollViewRef.current) return;
    const newIndex = (currentIndex - 1 + photos.length) % photos.length;
    scrollViewRef.current.scrollTo({
      x: newIndex * screenWidth,
      animated: true,
    });
  };


  if (photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ImageBackground
          source={require('../assets/images/led.jpg')}
          style={styles.background}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            {/* Заголовок */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.counter}>
                {currentIndex + 1} / {photos.length}
              </Text>
            </View>

            {/* Основное изображение с поддержкой нативного прокручивания */}
            <View style={styles.imageContainer}>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={screenWidth}
                snapToAlignment="center"
                contentContainerStyle={styles.scrollContent}
              >
                {photos.map((photo, index) => (
                  <View key={index} style={styles.imagePage}>
                    <CachedImage
                      imageUrl={photo}
                      style={styles.mainImage}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </ScrollView>
              
              {/* Кнопка лайка для текущего фото */}
              {playerId && photos[currentIndex] && (
                <View style={styles.photoLikeButton}>
                  <LikeButton
                    playerId={playerId}
                    contentId={generatePhotoContentId(photos[currentIndex])}
                    contentType="photo"
                  />
                </View>
              )}
            </View>

            {/* Навигационные кнопки */}
            {photos.length > 1 && (
              <>
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={prevPhoto}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={30} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={nextPhoto}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-forward" size={30} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {/* Миниатюры внизу */}
            {photos.length > 1 && (
              <View style={styles.thumbnailsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailsScroll}
                >
                  {photos.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.thumbnail,
                        index === currentIndex && styles.activeThumbnail,
                      ]}
                      onPress={() => setCurrentIndex(index)}
                    >
                      <CachedImage
                        imageUrl={photo}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.9)',
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(1, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
  },
  imagePage: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mainImage: {
    width: screenWidth,
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(1, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  thumbnailsContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  thumbnailsScroll: {
    paddingHorizontal: 10,
  },
  thumbnail: {
    width: 60,
    aspectRatio: 4/3,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  activeThumbnail: {
    borderColor: '#FF4444',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoLikeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
}); 