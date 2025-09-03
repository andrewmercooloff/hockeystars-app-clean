import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Achievement } from '../utils/playerStorage';

interface AchievementsSectionProps {
  achievements?: Achievement[];
  isEditing?: boolean;
  onAchievementsChange?: (achievements: Achievement[]) => void;
}

export default function AchievementsSection({ 
  achievements = [], 
  isEditing = false,
  onAchievementsChange 
}: AchievementsSectionProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [newAchievement, setNewAchievement] = useState({
    competition: '',
    year: new Date().getFullYear(),
    place: 1 as 1 | 2 | 3,
    description: ''
  });

  const getMedalIcon = (place: number) => {
    switch (place) {
      case 1:
        return { name: 'medal' as const, color: '#FFD700' }; // золото
      case 2:
        return { name: 'medal' as const, color: '#C0C0C0' }; // серебро
      case 3:
        return { name: 'medal' as const, color: '#CD7F32' }; // бронза
      default:
        return { name: 'trophy' as const, color: '#FF4444' };
    }
  };

  const getPlaceText = (place: number) => {
    switch (place) {
      case 1: return '1 место';
      case 2: return '2 место';
      case 3: return '3 место';
      default: return `${place} место`;
    }
  };

  const handleAddAchievement = () => {
    if (!newAchievement.competition.trim()) {
      Alert.alert('Ошибка', 'Введите название соревнования');
      return;
    }

    if (newAchievement.year < 1900 || newAchievement.year > new Date().getFullYear()) {
      Alert.alert('Ошибка', 'Введите корректный год');
      return;
    }

    const achievement: Achievement = {
      id: Date.now().toString(),
      competition: newAchievement.competition.trim(),
      year: newAchievement.year,
      place: newAchievement.place,
      description: newAchievement.description.trim()
    };

    const updatedAchievements = [...achievements, achievement];
    onAchievementsChange?.(updatedAchievements);
    
    setNewAchievement({
      competition: '',
      year: new Date().getFullYear(),
      place: 1,
      description: ''
    });
    setModalVisible(false);
  };

  const handleEditAchievement = () => {
    if (!editingAchievement) return;

    if (!editingAchievement.competition.trim()) {
      Alert.alert('Ошибка', 'Введите название соревнования');
      return;
    }

    if (editingAchievement.year < 1900 || editingAchievement.year > new Date().getFullYear()) {
      Alert.alert('Ошибка', 'Введите корректный год');
      return;
    }

    const updatedAchievements = achievements.map(achievement =>
      achievement.id === editingAchievement.id ? editingAchievement : achievement
    );
    
    onAchievementsChange?.(updatedAchievements);
    setEditingAchievement(null);
    setModalVisible(false);
  };

  const handleDeleteAchievement = (id: string) => {
    Alert.alert(
      'Удаление достижения',
      'Вы уверены, что хотите удалить это достижение?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const updatedAchievements = achievements.filter(achievement => achievement.id !== id);
            onAchievementsChange?.(updatedAchievements);
          }
        }
      ]
    );
  };

  const openEditModal = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setModalVisible(true);
  };

  if (achievements.length === 0 && !isEditing) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Достижения</Text>
      
      {achievements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>Нет достижений</Text>
        </View>
      ) : (
        <ScrollView style={styles.achievementsList}>
          {achievements.map((achievement) => {
            const medal = getMedalIcon(achievement.place);
            return (
              <View key={achievement.id} style={styles.achievementItem}>
                <View style={styles.achievementHeader}>
                  <Ionicons name={medal.name} size={24} color={medal.color} />
                  <Text style={styles.achievementTitle}>{achievement.competition}</Text>
                  {isEditing && (
                    <View style={styles.editButtons}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(achievement)}
                      >
                        <Ionicons name="create" size={16} color="#FF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteAchievement(achievement.id)}
                      >
                        <Ionicons name="trash" size={16} color="#FF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={styles.achievementDetails}>
                  <Text style={styles.achievementYear}>{achievement.year}</Text>
                  <Text style={styles.achievementPlace}>{getPlaceText(achievement.place)}</Text>
                </View>
                {achievement.description && (
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {isEditing && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={24} color="#FF4444" />
          <Text style={styles.addButtonText}>Добавить достижение</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingAchievement ? 'Редактировать достижение' : 'Добавить достижение'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Название соревнования"
              placeholderTextColor="#888"
              value={editingAchievement?.competition || newAchievement.competition}
              onChangeText={(text) => {
                if (editingAchievement) {
                  setEditingAchievement({ ...editingAchievement, competition: text });
                } else {
                  setNewAchievement({ ...newAchievement, competition: text });
                }
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="Год"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={String(editingAchievement?.year || newAchievement.year)}
              onChangeText={(text) => {
                const year = parseInt(text) || new Date().getFullYear();
                if (editingAchievement) {
                  setEditingAchievement({ ...editingAchievement, year });
                } else {
                  setNewAchievement({ ...newAchievement, year });
                }
              }}
            />

            <View style={styles.placeSelector}>
              <Text style={styles.placeLabel}>Место:</Text>
              {[1, 2, 3].map((place) => (
                <TouchableOpacity
                  key={place}
                  style={[
                    styles.placeButton,
                    (editingAchievement?.place || newAchievement.place) === place && styles.placeButtonSelected
                  ]}
                  onPress={() => {
                    if (editingAchievement) {
                      setEditingAchievement({ ...editingAchievement, place: place as 1 | 2 | 3 });
                    } else {
                      setNewAchievement({ ...newAchievement, place: place as 1 | 2 | 3 });
                    }
                  }}
                >
                  <Ionicons 
                    name="medal" 
                    size={20} 
                    color={getMedalIcon(place).color} 
                  />
                  <Text style={styles.placeButtonText}>{place}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Описание (необязательно)"
              placeholderTextColor="#888"
              multiline
              numberOfLines={3}
              value={editingAchievement?.description || newAchievement.description}
              onChangeText={(text) => {
                if (editingAchievement) {
                  setEditingAchievement({ ...editingAchievement, description: text });
                } else {
                  setNewAchievement({ ...newAchievement, description: text });
                }
              }}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setEditingAchievement(null);
                  setNewAchievement({
                    competition: '',
                    year: new Date().getFullYear(),
                    place: 1,
                    description: ''
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingAchievement ? handleEditAchievement : handleAddAchievement}
              >
                <Text style={styles.saveButtonText}>
                  {editingAchievement ? 'Сохранить' : 'Добавить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  achievementsList: {
    maxHeight: 300,
  },
  achievementItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 10,
    flex: 1,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    padding: 5,
  },
  deleteButton: {
    padding: 5,
  },
  achievementDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  achievementYear: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
  },
  achievementPlace: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
  },
  achievementDescription: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  placeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  placeLabel: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginRight: 15,
  },
  placeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  placeButtonSelected: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderColor: '#FF4444',
  },
  placeButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
}); 