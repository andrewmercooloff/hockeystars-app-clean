import SafeIcon from './SafeIcon';
import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PhotoViewer from './PhotoViewer';

const { width: screenWidth } = Dimensions.get('window');

interface PhotosSectionProps {
  photos?: string[];
}

const PhotosSection = React.memo(function PhotosSection({ photos = [] }: PhotosSectionProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoViewerVisible(true);
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Хоккейные фото</Text>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photosScroll}
      >
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={index}
            style={styles.photoContainer}
            onPress={() => openPhotoViewer(index)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: photo }}
              style={styles.photo}
              resizeMode="contain"
            />
            <View style={styles.photoOverlay}>
              <Ionicons name="expand-outline" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <PhotoViewer
        photos={photos}
        visible={photoViewerVisible}
        onClose={() => setPhotoViewerVisible(false)}
        initialIndex={selectedPhotoIndex}
      />
    </View>
  );
});

export default PhotosSection;

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginBottom: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    marginTop: 10,
  },
  photosScroll: {
    paddingHorizontal: 5,
  },
  photoContainer: {
    width: screenWidth * 0.25,
    height: screenWidth * 0.25,
    marginHorizontal: 5,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
}); 