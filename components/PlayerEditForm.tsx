import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Player, updatePlayer } from '../utils/playerStorage';
import { uploadImageToStorage } from '../utils/uploadImage';
import TeamSelector from './TeamSelector';

interface PlayerEditFormProps {
  player: Player;
  currentUser?: Player;
  onSave: (updatedPlayer: Player) => void;
  onCancel: () => void;
}

const PlayerEditForm: React.FC<PlayerEditFormProps> = ({ player, currentUser, onSave, onCancel }) => {
  const [editData, setEditData] = useState<Player>(player);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  const countries = ['Беларусь', 'Россия', 'Украина', 'Казахстан', 'Латвия', 'Литва', 'Эстония', 'Польша', 'Чехия', 'Словакия', 'Финляндия', 'Швеция', 'Норвегия', 'Дания', 'Германия', 'Австрия', 'Швейцария', 'Франция', 'Италия', 'Испания', 'Великобритания', 'США', 'Канада'];
  const positions = ['Центральный нападающий', 'Крайний нападающий', 'Защитник', 'Вратарь'];

  const pickImage = async () => {
    Alert.alert(
      'Выберите источник фото',
      'Откуда хотите загрузить фото?',
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
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
              const base64String = e.target?.result as string;
              const uploadedUrl = await uploadImageToStorage(base64String);
              if (uploadedUrl) {
                setEditData({ ...editData, avatar: uploadedUrl });
              }
            };
            reader.readAsDataURL(file);
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
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          const uploadedUrl = await uploadImageToStorage(result.assets[0].uri);
          if (uploadedUrl) {
            setEditData({ ...editData, avatar: uploadedUrl });
          }
        }
      }
    } catch (error) {
      console.error('❌ Ошибка выбора фото из галереи:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить фото из галереи.');
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Информация', 'Съемка фото не поддерживается в веб-версии. Используйте галерею.');
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нужно разрешение для доступа к камере');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uploadedUrl = await uploadImageToStorage(result.assets[0].uri);
        if (uploadedUrl) {
          setEditData({ ...editData, avatar: uploadedUrl });
        }
      }
    } catch (error) {
      console.error('❌ Ошибка съемки фото:', error);
      Alert.alert('Ошибка', 'Не удалось снять фото');
    }
  };

  const handleSave = async () => {
    try {
      // Проверяем права доступа
      if (currentUser && (currentUser.status !== 'admin' && currentUser.id !== player.id)) {
        Alert.alert('Ошибка', 'У вас нет прав для редактирования этого профиля');
        return;
      }
      
      await updatePlayer(player.id, editData, currentUser?.id);
      onSave(editData);
      Alert.alert('Успешно', 'Данные игрока обновлены');
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить данные');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Фото профиля */}
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
          {editData.avatar ? (
            <Image
              source={{ 
                uri: editData.avatar,
                cache: 'reload',
                headers: { 'Cache-Control': 'no-cache' }
              }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={48} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.editOverlay}>
            <Ionicons name="camera" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Основная информация */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Основная информация</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Имя</Text>
          <TextInput
            style={styles.input}
            value={editData.name}
            onChangeText={(text) => setEditData({...editData, name: text})}
            placeholder="Имя игрока"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Страна</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCountryPicker(true)}
          >
            <Text style={styles.pickerButtonText}>
              {editData.country || 'Выберите страну'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {player.status === 'player' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Позиция</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowPositionPicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                {editData.position || 'Выберите позицию'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Дата рождения</Text>
          <TextInput
            style={styles.input}
            value={editData.birthDate || ''}
            onChangeText={(text) => setEditData({...editData, birthDate: text})}
            placeholder="ДД.ММ.ГГГГ"
            placeholderTextColor="#888"
          />
        </View>
      </View>

      {/* Физические данные */}
      {player.status === 'player' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Физические данные</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Рост (см)</Text>
            <TextInput
              style={styles.input}
              value={editData.height || ''}
              onChangeText={(text) => setEditData({...editData, height: text})}
              placeholder="Рост"
              placeholderTextColor="#888"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Вес (кг)</Text>
            <TextInput
              style={styles.input}
              value={editData.weight || ''}
              onChangeText={(text) => setEditData({...editData, weight: text})}
              placeholder="Вес"
              placeholderTextColor="#888"
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      {/* Статистика текущего сезона для игроков */}
      {player.status === 'player' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Статистика текущего сезона</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Игр</Text>
              <TextInput
                style={styles.statInput}
                value={editData.games || ''}
                onChangeText={(text) => setEditData({...editData, games: text})}
                placeholder="0"
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Голов</Text>
              <TextInput
                style={styles.statInput}
                value={editData.goals || ''}
                onChangeText={(text) => setEditData({...editData, goals: text})}
                placeholder="0"
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Передач</Text>
              <TextInput
                style={styles.statInput}
                value={editData.assists || ''}
                onChangeText={(text) => setEditData({...editData, assists: text})}
                placeholder="0"
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      )}

      {/* Команды */}
      {(player.status === 'player' || player.status === 'coach') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Команды</Text>
          <TeamSelector
            selectedTeams={selectedTeams}
            onTeamsChange={setSelectedTeams}
          />
        </View>
      )}

      {/* Кнопки */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
          <Text style={styles.buttonText}>Сохранить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
          <Text style={styles.buttonText}>Отмена</Text>
        </TouchableOpacity>
      </View>

      {/* Модальные окна для выбора */}
      {showCountryPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите страну</Text>
            <ScrollView style={styles.modalScroll}>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country}
                  style={styles.modalItem}
                  onPress={() => {
                    setEditData({...editData, country});
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{country}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCountryPicker(false)}
            >
              <Text style={styles.modalCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showPositionPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите позицию</Text>
            <ScrollView style={styles.modalScroll}>
              {positions.map((position) => (
                <TouchableOpacity
                  key={position}
                  style={styles.modalItem}
                  onPress={() => {
                    setEditData({...editData, position});
                    setShowPositionPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{position}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowPositionPicker(false)}
            >
              <Text style={styles.modalCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  photoContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FF4444',
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF4444',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  pickerButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 5,
  },
  statInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#FF4444',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  modalItemText: {
    color: '#fff',
    fontSize: 16,
  },
  modalCancelButton: {
    marginTop: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FF4444',
    fontSize: 16,
  },
});

export default PlayerEditForm; 