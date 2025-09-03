import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { uploadGalleryPhoto } from '../utils/uploadImage';
import PhotoViewer from './PhotoViewer';

const { width: screenWidth } = Dimensions.get('window');

interface EditablePhotosSectionProps {
  photos?: string[];
  isEditing?: boolean;
  onPhotosChange?: (photos: string[]) => void;
}

export default function EditablePhotosSection({ 
  photos = [], 
  isEditing = false,
  onPhotosChange 
}: EditablePhotosSectionProps) {

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingCount, setUploadingCount] = useState(0);

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoViewerVisible(true);
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Добавить фотографию',
      'Выберите источник фотографии',
      [
        {
          text: 'Галерея',
          onPress: () => pickFromGallery()
        },
        {
          text: 'Камера',
          onPress: () => takePhoto()
        },
        {
          text: 'Отмена',
          style: 'cancel'
        }
      ]
    );
  };

  const pickFromGallery = async () => {
    try {
      // Проверяем лимит фотографий
      if (photos.length >= 50) {
        Alert.alert('Ошибка', 'Максимальное количество фотографий: 50');
        return;
      }

      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (event) => {
          const files = (event.target as HTMLInputElement).files;
                     if (files) {

             setIsUploading(true);
             setUploadingCount(files.length);
             setUploadProgress(0);
             
             const newPhotos = [...photos];
             let uploadedCount = 0;
             
             for (let i = 0; i < files.length && newPhotos.length < 50; i++) {
               const file = files[i];

               const reader = new FileReader();
               reader.onload = async (e) => {
                 const base64String = e.target?.result as string;

                 const uploadedUrl = await uploadGalleryPhoto(base64String);

                                   if (uploadedUrl) {
                    newPhotos.unshift(uploadedUrl);
                    onPhotosChange?.(newPhotos);
                  }
                 
                 uploadedCount++;
                 setUploadProgress((uploadedCount / files.length) * 100);
                 
                 // Скрываем индикатор загрузки когда все файлы загружены
                 if (uploadedCount === files.length) {
                   setIsUploading(false);
                   setUploadProgress(0);
                   setUploadingCount(0);
                 }
               };
               reader.readAsDataURL(file);
             }
           }
        };
        input.click();
        return;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Ошибка', 'Нужно разрешение для доступа к галерее');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          allowsMultipleSelection: true,
          quality: 0.8,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

                          if (!result.canceled && result.assets) {

           setIsUploading(true);
           setUploadingCount(result.assets.length);
           setUploadProgress(0);
           
           const newPhotos = [...photos];
                        for (let i = 0; i < result.assets.length && newPhotos.length < 50; i++) {
               const asset = result.assets[i];

             
             // Обновляем прогресс
             setUploadProgress(((i + 1) / result.assets.length) * 100);
             
             const uploadedUrl = await uploadGalleryPhoto(asset.uri);

                           if (uploadedUrl) {
                newPhotos.unshift(uploadedUrl);
              }
           }
           

           onPhotosChange?.(newPhotos);
           
           // Скрываем индикатор загрузки
           setIsUploading(false);
           setUploadProgress(0);
           setUploadingCount(0);
         }
      }
         } catch (error) {
       console.error('❌ Ошибка выбора фото из галереи:', error);
       Alert.alert('Ошибка', 'Не удалось загрузить фото из галереи.');
       // Скрываем индикатор загрузки в случае ошибки
       setIsUploading(false);
       setUploadProgress(0);
       setUploadingCount(0);
     }
  };

  const takePhoto = async () => {
    try {

             if (Platform.OS === 'web') {
         Alert.alert('Информация', 'Съемка фото не поддерживается в веб-версии. Используйте галерею.');
         return;
       }

       // Проверяем лимит фотографий
       if (photos.length >= 50) {
         Alert.alert('Ошибка', 'Максимальное количество фотографий: 50');
         return;
       }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нужно разрешение для доступа к камере');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

             if (!result.canceled && result.assets[0]) {
         setIsUploading(true);
         setUploadingCount(1);
         setUploadProgress(0);
         
         const uploadedUrl = await uploadGalleryPhoto(result.assets[0].uri);
                   if (uploadedUrl) {
            const newPhotos = [uploadedUrl, ...photos];
            onPhotosChange?.(newPhotos);
          }
         
         setIsUploading(false);
         setUploadProgress(0);
         setUploadingCount(0);
       }
         } catch (error) {
       console.error('❌ Ошибка съемки фото:', error);
       Alert.alert('Ошибка', 'Не удалось снять фото.');
       // Скрываем индикатор загрузки в случае ошибки
       setIsUploading(false);
       setUploadProgress(0);
       setUploadingCount(0);
     }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Удаление фотографии',
      'Вы уверены, что хотите удалить эту фотографию?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange?.(newPhotos);
          }
        }
      ]
    );
  };

  if (photos.length === 0 && !isEditing) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Хоккейные фото</Text>
      
             {isEditing && (
         <>
                       <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
              disabled={isUploading || photos.length >= 50}
            >
              <Ionicons name="add-circle" size={24} color={(isUploading || photos.length >= 50) ? "#666" : "#FF4444"} />
              <Text style={[styles.addPhotoButtonText, (isUploading || photos.length >= 50) && styles.disabledText]}>
                {(isUploading || photos.length >= 50) ? (photos.length >= 50 ? 'Максимум 50 фото' : 'Загрузка...') : `Добавить фотографию (${photos.length}/50)`}
              </Text>
            </TouchableOpacity>
           
           {isUploading && (
             <View style={styles.uploadProgressContainer}>
               <View style={styles.uploadProgressBar}>
                 <View 
                   style={[
                     styles.uploadProgressFill, 
                     { width: `${uploadProgress}%` }
                   ]} 
                 />
               </View>
               <Text style={styles.uploadProgressText}>
                 Загружается {uploadingCount} фото... {Math.round(uploadProgress)}%
               </Text>
             </View>
           )}
         </>
       )}
      
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosScroll}
        >
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
                             <TouchableOpacity
                 style={styles.photoWrapper}
                 onPress={() => openPhotoViewer(index)}
                 activeOpacity={0.8}
               >
                 <Image
                   source={{ uri: photo }}
                   style={styles.photo}
                   resizeMode="cover"
                 />
               </TouchableOpacity>
              
              {isEditing && (
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {photos.length === 0 && isEditing && (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>Нет фотографий</Text>
          <Text style={styles.emptySubtext}>Нажмите "Добавить фотографию" чтобы начать</Text>
        </View>
      )}

      <PhotoViewer
        photos={photos}
        visible={photoViewerVisible}
        onClose={() => setPhotoViewerVisible(false)}
        initialIndex={selectedPhotoIndex}
      />
    </View>
  );
}

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
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 15,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  addPhotoButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#FF4444',
    marginLeft: 8,
  },
  disabledText: {
    color: '#666',
  },
  uploadProgressContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  uploadProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#FF4444',
    borderRadius: 2,
  },
  uploadProgressText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#FF4444',
    textAlign: 'center',
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
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginTop: 5,
    textAlign: 'center',
  },
  photosScroll: {
    paddingRight: 20,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 15,
    marginTop: 12,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    zIndex: 10,
  },
}); 