import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { processAvatarThumbnails } from '../utils/ThumbnailGenerator';

interface AvatarUploaderProps {
  playerId: string;
  onUploadComplete: (originalUrl: string, thumbnailUrls: { [key: string]: string }) => void;
  currentAvatar?: string;
  size?: number;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  playerId,
  onUploadComplete,
  currentAvatar,
  size = 100,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    try {
      // На Android 13+ (API 33+) используем Photo Picker без разрешений
      // На старых версиях Android запрашиваем разрешения
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Android 13+ использует Photo Picker автоматически, разрешения не нужны
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          await uploadAndProcessAvatar(result.assets[0].uri);
        }
      } else {
        // Для старых версий Android запрашиваем разрешения
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permissionResult.granted === false) {
          Alert.alert('Ошибка', 'Нужно разрешение для доступа к галерее');
          return;
        }

        // Выбираем изображение
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          await uploadAndProcessAvatar(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Ошибка выбора изображения:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  };

  const takePhoto = async () => {
    try {
      // Запрашиваем разрешения камеры
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Ошибка', 'Нужно разрешение для доступа к камере');
        return;
      }

      // Делаем фото
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAndProcessAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Ошибка съемки:', error);
      Alert.alert('Ошибка', 'Не удалось сделать фото');
    }
  };

  const uploadAndProcessAvatar = async (imageUri: string) => {
    setIsUploading(true);
    
    try {
      console.log(`📤 Начинаем загрузку и обработку аватара для ${playerId}`);
      
      // Сначала загружаем оригинальное изображение
      const originalUrl = await uploadOriginalImage(imageUri, playerId);
      
      // Затем генерируем и загружаем миниатюры
      const thumbnailUrls = await processAvatarThumbnails(originalUrl, playerId);
      
      console.log(`✅ Аватар и миниатюры успешно загружены для ${playerId}`);
      
      // Уведомляем родительский компонент
      onUploadComplete(originalUrl, thumbnailUrls);
      
      Alert.alert('Успех', 'Аватар и миниатюры успешно загружены!');
      
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить аватар');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadOriginalImage = async (imageUri: string, playerId: string): Promise<string> => {
    try {
      // Сжимаем изображение до 250px перед загрузкой
      let processedImageUri = imageUri;
      if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
        try {
          const result = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 250 } }], // Уменьшенный размер для аватаров (250px)
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // JPEG для аватаров с сжатием 0.8
          );
          processedImageUri = result.uri;
        } catch (manipulatorError) {
          console.error('❌ Ошибка обработки изображения:', manipulatorError);
          processedImageUri = imageUri;
        }
      }
      
      // Конвертируем в blob
      const response = await fetch(processedImageUri);
      const blob = await response.blob();
      
      // Создаем FormData
      // ВАЖНО: используем фиксированное имя файла avatar_{playerId}.jpg для перезаписи старых файлов
      const formData = new FormData();
      const fileName = `avatar_${playerId}.jpg`;
      formData.append('file', blob, fileName);
      
      // Загружаем в Supabase Storage
      const uploadResponse = await fetch(
        `https://jvsypfwiajuwsyuzkyda.supabase.co/storage/v1/object/avatars/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Ошибка загрузки: ${await uploadResponse.text()}`);
      }

      const uploadedUrl = `https://jvsypfwiajuwsyuzkyda.supabase.co/storage/v1/object/public/avatars/${fileName}`;
      console.log(`✅ Оригинальный аватар загружен:`, uploadedUrl);
      
      return uploadedUrl;
    } catch (error) {
      console.error('Ошибка загрузки оригинального изображения:', error);
      throw error;
    }
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Выберите аватар',
      'Откуда хотите загрузить изображение?',
      [
        { text: 'Галерея', onPress: pickImage },
        { text: 'Камера', onPress: takePhoto },
        { text: 'Отмена', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={showUploadOptions}
        disabled={isUploading}
      >
        <Ionicons
          name={isUploading ? 'hourglass' : 'camera'}
          size={size * 0.4}
          color="#fff"
        />
        {isUploading && (
          <Text style={styles.uploadingText}>Загрузка...</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 50,
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
});

export default AvatarUploader;
