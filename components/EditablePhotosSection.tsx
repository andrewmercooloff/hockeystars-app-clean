import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { uploadGalleryPhoto } from '../utils/uploadImage';
import { loadCurrentUser, notifyFriendsAboutPhotos } from '../utils/playerStorage';
import PhotoViewer from './PhotoViewer';
import { useLanguage } from '../contexts/LanguageContext';
import CachedImage from './CachedImage';
import LikeButton from './LikeButton';
import { generatePhotoContentId } from '../utils/likesService';
import { addActivityPoints } from '../services/activityService';

const { width: screenWidth } = Dimensions.get('window');

interface EditablePhotosSectionProps {
  photos?: string[];
  isEditing?: boolean;
  onPhotosChange?: (photos: string[]) => void;
  isShopProfile?: boolean;
  playerId?: string; // ID игрока, владельца фото
  style?: StyleProp<ViewStyle>;
  showTitle?: boolean;
}

export default function EditablePhotosSection({ 
  photos = [], 
  isEditing = false,
  onPhotosChange,
  isShopProfile,
  playerId,
  style,
  showTitle = true,
}: EditablePhotosSectionProps) {
  const { t } = useLanguage();

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [likeRefreshTrigger, setLikeRefreshTrigger] = useState(0);

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoViewerVisible(true);
  };

  const handlePhotoViewerClose = () => {
    setPhotoViewerVisible(false);
    // Обновляем trigger для перезагрузки данных лайков в карусели
    setLikeRefreshTrigger(prev => prev + 1);
  };

  const handleAddPhoto = () => {
    Alert.alert(
      t('addPhoto'),
      t('selectPhotoSource'),
      [
        {
          text: t('gallery'),
          onPress: () => pickFromGallery()
        },
        {
          text: t('camera'),
          onPress: () => takePhoto()
        },
        {
          text: t('cancel'),
          style: 'cancel'
        }
      ]
    );
  };

  const pickFromGallery = async () => {
    try {
      // Проверяем лимит фотографий
      if (photos.length >= 50) {
        Alert.alert(t('error'), t('maxPhotosReached'));
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
                    
                    // Начисляем 1 звездочку за загруженное фото
                    try {
                      const currentUser = await loadCurrentUser();
                      if (currentUser) {
                        await addActivityPoints(currentUser.id, 'PHOTO_UPLOAD');
                      }
                    } catch (error) {
                      console.error('❌ Ошибка начисления очков активности за фото (не критично):', error);
                    }
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
        // На Android 13+ (API 33+) используем Photo Picker без разрешений
        // На старых версиях Android запрашиваем разрешения
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          // Android 13+ использует Photo Picker автоматически, разрешения не нужны
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            allowsMultipleSelection: true,
            quality: 0.7, // Уменьшаем качество для экономии места
            mediaTypes: ['images'],
          });

                          if (!result.canceled && result.assets) {

           setIsUploading(true);
           setUploadingCount(result.assets.length);
           setUploadProgress(0);
           
           // Сортируем фото по дате создания (новые сначала)
           const sortedAssets = [...result.assets].sort((a, b) => {
             const dateA = new Date(a.creationTime || a.modificationTime || 0).getTime();
             const dateB = new Date(b.creationTime || b.modificationTime || 0).getTime();
             return dateB - dateA; // Убывающий порядок (новые сначала)
           });
           
           const newPhotos = [...photos];
           const uploadedUrls: string[] = [];
           
           // Сначала загружаем все фото
           for (let i = 0; i < sortedAssets.length && newPhotos.length < 50; i++) {
             const asset = sortedAssets[i];
             
             // Обновляем прогресс
             setUploadProgress(((i + 1) / result.assets.length) * 100);
             
             const uploadedUrl = await uploadGalleryPhoto(asset.uri);
             if (uploadedUrl) {
               uploadedUrls.push(uploadedUrl);
             }
           }
           
           // Добавляем загруженные фото в начало (новые сначала)
           newPhotos.unshift(...uploadedUrls);
           

           onPhotosChange?.(newPhotos);
           
           // Начисляем очки активности за загруженные фото
           // ВАЖНО: Уведомления друзьям отправляются только при сохранении профиля (в handleSave)
           const addedPhotosCount = result.assets.length;
           if (addedPhotosCount > 0) {
             try {
               const currentUser = await loadCurrentUser();
               if (currentUser) {
                 // Начисляем 1 звездочку за каждое загруженное фото
                 for (let i = 0; i < addedPhotosCount; i++) {
                   try {
                     await addActivityPoints(currentUser.id, 'PHOTO_UPLOAD');
                   } catch (error) {
                     console.error('❌ Ошибка начисления очков активности за фото (не критично):', error);
                   }
                 }
               }
             } catch (error) {
               console.error('❌ Ошибка начисления очков активности за фото:', error);
             }
           }
           
           // Скрываем индикатор загрузки
           setIsUploading(false);
           setUploadProgress(0);
           setUploadingCount(0);
         }
        } else {
          // Для старых версий Android запрашиваем разрешения
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(t('error'), t('galleryPermissionRequired'));
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            allowsMultipleSelection: true,
            quality: 0.7, // Уменьшаем качество для экономии места
            mediaTypes: ['images'],
          });

          if (!result.canceled && result.assets) {
            setIsUploading(true);
            setUploadingCount(result.assets.length);
            setUploadProgress(0);
            
            // Сортируем фото по дате создания (новые сначала)
            const sortedAssets = [...result.assets].sort((a, b) => {
              const dateA = new Date(a.creationTime || a.modificationTime || 0).getTime();
              const dateB = new Date(b.creationTime || b.modificationTime || 0).getTime();
              return dateB - dateA; // Убывающий порядок (новые сначала)
            });
            
            const newPhotos = [...photos];
            const uploadedUrls: string[] = [];
            
            // Сначала загружаем все фото
            for (let i = 0; i < sortedAssets.length && newPhotos.length < 50; i++) {
              const asset = sortedAssets[i];
              
              // Обновляем прогресс
              setUploadProgress(((i + 1) / result.assets.length) * 100);
              
              const uploadedUrl = await uploadGalleryPhoto(asset.uri);
              if (uploadedUrl) {
                uploadedUrls.push(uploadedUrl);
              }
            }
            
            // Добавляем загруженные фото в начало (новые сначала)
            newPhotos.unshift(...uploadedUrls);

            onPhotosChange?.(newPhotos);
            
            // Начисляем очки активности за загруженные фото
            const addedPhotosCount = result.assets.length;
            if (addedPhotosCount > 0) {
              try {
                const currentUser = await loadCurrentUser();
                if (currentUser) {
                  // Начисляем 1 звездочку за каждое загруженное фото
                  for (let i = 0; i < addedPhotosCount; i++) {
                    try {
                      await addActivityPoints(currentUser.id, 'PHOTO_UPLOAD');
                    } catch (error) {
                      console.error('❌ Ошибка начисления очков активности за фото (не критично):', error);
                    }
                  }
                }
              } catch (error) {
                console.error('❌ Ошибка начисления очков активности за фото:', error);
              }
            }
            
            // Скрываем индикатор загрузки
            setIsUploading(false);
            setUploadProgress(0);
            setUploadingCount(0);
          }
        }
      }
         } catch (error) {
       console.error('❌ Ошибка выбора фото из галереи:', error);
        Alert.alert(t('error'), t('galleryError'));
       // Скрываем индикатор загрузки в случае ошибки
       setIsUploading(false);
       setUploadProgress(0);
       setUploadingCount(0);
     }
  };

  const takePhoto = async () => {
    try {

             if (Platform.OS === 'web') {
         Alert.alert(t('info'), t('cameraNotSupported'));
         return;
       }

       // Проверяем лимит фотографий
       if (photos.length >= 50) {
         Alert.alert(t('error'), t('maxPhotosReached'));
         return;
       }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), t('cameraPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Уменьшаем качество для экономии места
      });

             if (!result.canceled && result.assets[0]) {
         setIsUploading(true);
         setUploadingCount(1);
         setUploadProgress(0);
         
         const uploadedUrl = await uploadGalleryPhoto(result.assets[0].uri);
                   if (uploadedUrl) {
            const newPhotos = [uploadedUrl, ...photos];
            onPhotosChange?.(newPhotos);
            
            // Начисляем 1 звездочку за загруженное фото
            try {
              const currentUser = await loadCurrentUser();
              if (currentUser) {
                await addActivityPoints(currentUser.id, 'PHOTO_UPLOAD');
              }
            } catch (error) {
              console.error('❌ Ошибка начисления очков активности за фото (не критично):', error);
            }
          }
         
         setIsUploading(false);
         setUploadProgress(0);
         setUploadingCount(0);
       }
         } catch (error) {
       console.error('❌ Ошибка съемки фото:', error);
       Alert.alert(t('error'), t('cameraError'));
       // Скрываем индикатор загрузки в случае ошибки
       setIsUploading(false);
       setUploadProgress(0);
       setUploadingCount(0);
     }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      t('common.deleteConfirm'),
      t('common.deletePhotoConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange?.(newPhotos);
          }
        }
      ]
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragMove = (event: any) => {
    if (draggedIndex !== null) {
      setDragOffset({
        x: event.nativeEvent.translationX,
        y: event.nativeEvent.translationY,
      });
    }
  };

  const handleDragEnd = (event: any) => {
    if (draggedIndex !== null) {
      
      // Для сетки 3 столбца рассчитываем новый индекс на основе движения
      const photoWidth = screenWidth * 0.3; // 30% от ширины экрана
      const photoHeight = photoWidth + 20; // высота + отступ
      
      const deltaX = event.nativeEvent.translationX;
      const deltaY = event.nativeEvent.translationY;
      
      // Определяем направление движения
      let newIndex = draggedIndex;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Горизонтальное движение
        const horizontalSteps = Math.round(deltaX / photoWidth);
        newIndex = draggedIndex + horizontalSteps;
      } else {
        // Вертикальное движение
        const verticalSteps = Math.round(deltaY / photoHeight);
        newIndex = draggedIndex + (verticalSteps * 3); // 3 столбца
      }
      
      const targetIndex = Math.max(0, Math.min(photos.length - 1, newIndex));
      
      
      if (targetIndex !== draggedIndex) {
        const newPhotos = [...photos];
        const draggedPhoto = newPhotos[draggedIndex];
        newPhotos.splice(draggedIndex, 1);
        newPhotos.splice(targetIndex, 0, draggedPhoto);
        onPhotosChange?.(newPhotos);
      }
      
      setDraggedIndex(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };


  if (photos.length === 0 && !isEditing) {
    return null;
  }

  return (
    <View style={[styles.section, style]}>
      {showTitle && (
        <Text style={styles.sectionTitle}>
          {isShopProfile ? t('profile.photos') : t('profile.hockeyPhotos')}
        </Text>
      )}
      
             {isEditing && (
         <>
           <TouchableOpacity
             style={styles.addPhotoButton}
             onPress={handleAddPhoto}
             disabled={isUploading || photos.length >= 50}
           >
             <Ionicons name="add-circle" size={24} color={(isUploading || photos.length >= 50) ? "#666" : "#fff"} />
             <Text style={[styles.addPhotoButtonText, (isUploading || photos.length >= 50) && styles.disabledText]}>
               {(isUploading || photos.length >= 50) ? (photos.length >= 50 ? t('maxPhotos') : t('uploading')) : `${t('addPhoto')} (${photos.length}/50)`}
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
                 {t('uploadingPhotos', { count: uploadingCount, progress: Math.round(uploadProgress) })}
               </Text>
             </View>
           )}
         </>
       )}
      
      {photos.length > 0 && (
        <View style={styles.photosContainer}>
          {isEditing ? (
            // Режим редактирования - сетка 3 столбца для перетаскивания
            <ScrollView
              vertical
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.photosGridScroll}
              removeClippedSubviews={true}
            >
              <View style={styles.photosGrid}>
                {photos.map((photo, index) => (
                  <View key={photo} style={styles.photoGridItem}>
                    <View style={[
                      styles.photoGridWrapper,
                      draggedIndex === index && styles.draggingItem,
                      draggedIndex === index && {
                        transform: [
                          { translateX: dragOffset.x },
                          { translateY: dragOffset.y },
                        ],
                      },
                    ]}>
                      <TouchableOpacity
                        onPress={() => openPhotoViewer(index)}
                        activeOpacity={0.8}
                        style={styles.photoGridTouchable}
                      >
                        <CachedImage
                          imageUrl={photo}
                          style={styles.photoGrid}
                          resizeMode="cover"
                        />
                        <View style={styles.photoIndexGrid}>
                          <Text style={styles.photoIndexTextGrid}>{index + 1}</Text>
                        </View>
                      </TouchableOpacity>
                      
                      <PanGestureHandler
                        onGestureEvent={handleDragMove}
                        onHandlerStateChange={(event) => {
                          if (event.nativeEvent.state === State.BEGAN) {
                            handleDragStart(index);
                          } else if (event.nativeEvent.state === State.END) {
                            handleDragEnd(event);
                          }
                        }}
                        minDist={10}
                      >
                        <View style={styles.dragHandleGrid}>
                          <Ionicons name="reorder-three" size={16} color="#fff" />
                        </View>
                      </PanGestureHandler>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.removePhotoButtonGrid}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#fa2f40" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            // Режим просмотра - горизонтальное пролистывание
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosScroll}
              removeClippedSubviews={true}
              decelerationRate="fast"
            >
              {photos.map((photo, index) => {
                const contentId = generatePhotoContentId(photo);
                
                return (
                <View key={photo} style={styles.photoContainer}>
                  <TouchableOpacity
                    style={styles.photoWrapper}
                    onPress={() => openPhotoViewer(index)}
                    activeOpacity={0.8}
                  >
                    <CachedImage
                      imageUrl={photo}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                      {playerId && (
                        <View style={styles.photoLikeButtonContainer}>
                          <LikeButton
                            playerId={playerId}
                            contentId={contentId}
                            contentType="photo"
                            size="small"
                            refreshTrigger={likeRefreshTrigger}
                          />
                        </View>
                      )}
                  </TouchableOpacity>
                </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {photos.length === 0 && isEditing && (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>{t('noPhotos')}</Text>
          <Text style={styles.emptySubtext}>{t('clickToAddPhoto')}</Text>
        </View>
      )}

      <PhotoViewer
        photos={photos}
        visible={photoViewerVisible}
        onClose={handlePhotoViewerClose}
        initialIndex={selectedPhotoIndex}
        playerId={playerId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
    borderRadius: 15,
    padding: 20,
    paddingBottom: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
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
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    marginBottom: 15,
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fa2f40',
    paddingHorizontal: 12,
  },
  addPhotoButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
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
    backgroundColor: '#fa2f40',
    borderRadius: 2,
  },
  uploadProgressText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fa2f40',
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
  photosContainer: {
    marginTop: 5,
    // Убираем paddingHorizontal - он создает отступы
  },
  photosScroll: {
    paddingRight: 20,
  },
  draggingItem: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
  },
  dragHandle: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 2,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 15,
    marginTop: 12,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoLikeButtonContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 10,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: 'rgba(1, 0, 0, 0.3)',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    zIndex: 10,
  },
  // Стили для сетки 3 столбца в режиме редактирования
  photosGridScroll: {
    paddingBottom: 20,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 10, // Небольшой отступ для всего контейнера
  },
  photoGridItem: {
    width: '30%', // 30% для 3 столбцов
    marginBottom: 15,
    marginRight: '3.33%', // 10% / 3 = 3.33% отступ между элементами
    position: 'relative',
  },
  photoGridWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
  },
  photoGridTouchable: {
    position: 'relative',
  },
  photoGrid: {
    width: '100%',
    height: (screenWidth - 60) / 3, // Квадратные фото
    borderRadius: 12,
  },
  dragHandleGrid: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderRadius: 6,
    padding: 4,
  },
  photoIndexGrid: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(250, 47, 64, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndexTextGrid: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  removePhotoButtonGrid: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 2,
  },
}); 