import React, { useState } from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PhotoViewer from './PhotoViewer';
import CachedImage from './CachedImage';
import HorizontalScrollWithArrows from './HorizontalScrollWithArrows';
import { getPhotoTileSize } from '../utils/mediaTileSize';

const { width: screenWidth } = Dimensions.get('window');
const { width: PHOTO_TILE_WIDTH, height: PHOTO_TILE_HEIGHT } = getPhotoTileSize(screenWidth);

function PhotoTile({
  photo,
  index,
  onPress,
}: {
  photo: string;
  index: number;
  onPress: (index: number) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.photoContainer, { width: PHOTO_TILE_WIDTH, height: PHOTO_TILE_HEIGHT }]}
      onPress={() => onPress(index)}
      activeOpacity={0.8}
    >
      <CachedImage
        imageUrl={photo}
        style={styles.photo}
        resizeMode="cover"
      />
      <View style={styles.photoOverlay}>
        <Ionicons name="expand-outline" size={16} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

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
      
      <HorizontalScrollWithArrows
        contentContainerStyle={styles.photosScroll}
        scrollStep={PHOTO_TILE_WIDTH + 10}
      >
        {photos.map((photo, index) => (
          <PhotoTile key={index} photo={photo} index={index} onPress={openPhotoViewer} />
        ))}
      </HorizontalScrollWithArrows>

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
    backgroundColor: 'rgba(22, 22, 26, 0.86)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#fa2f40',
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
    marginHorizontal: 5,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#fa2f40',
    backgroundColor: 'rgba(22, 22, 26, 0.42)',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(22, 22, 26, 0.42)',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(22, 22, 26, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
});
