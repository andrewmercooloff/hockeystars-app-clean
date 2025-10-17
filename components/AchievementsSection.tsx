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
import { Ionicons } from '@expo/vector-icons';
import { Achievement } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t } = useLanguage();
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

  const getPlaceText = (place: number | string) => {
    // Если place - это строка (ключ перевода), убираем префикс
    if (typeof place === 'string') {
      if (place.startsWith('profile.')) {
        return place.replace('profile.', '');
      }
      return place;
    }
    
    // Если place - это число, переводим его
    switch (place) {
      case 1: return t('achievements.firstPlace');
      case 2: return t('achievements.secondPlace');
      case 3: return t('achievements.thirdPlace');
      default: return t('achievements.place', { place });
    }
  };

  const getCompetitionText = (competition: string) => {
    // Если это ключ перевода, убираем префикс и возвращаем чистый текст
    if (competition.startsWith('profile.')) {
      return competition.replace('profile.', '');
    }
    
    // Создаем маппинг для названий соревнований
    const competitionMap: { [key: string]: string } = {
      'Первенство РБ': 'Первенство РБ',
      'Кубок Федерации': 'Кубок Федерации',
      'Belarus Championship': 'Первенство РБ',
      'Federation Cup': 'Кубок Федерации',
    };
    
    return competitionMap[competition] || competition;
  };

  const handleAddAchievement = () => {
    if (!newAchievement.competition.trim()) {
      Alert.alert(t('common.error'), t('profile.errorEnterCompetition'));
      return;
    }

    if (newAchievement.year < 1900 || newAchievement.year > new Date().getFullYear()) {
      Alert.alert(t('common.error'), t('profile.errorEnterYear'));
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
      Alert.alert(t('common.error'), t('profile.errorEnterCompetition'));
      return;
    }

    if (editingAchievement.year < 1900 || editingAchievement.year > new Date().getFullYear()) {
      Alert.alert(t('common.error'), t('profile.errorEnterYear'));
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
      t('common.deleteConfirm'),
      t('common.deleteAchievementConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
      <Text style={styles.sectionTitle}>{t('profile.achievements') || 'Достижения'}</Text>
      
      {achievements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>{t('profile.noAchievements') || 'Нет достижений'}</Text>
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.achievementsScroll}
          contentContainerStyle={styles.achievementsContainer}
        >
          {achievements.map((achievement) => {
            const medal = getMedalIcon(achievement.place);
            return (
              <View key={achievement.id} style={styles.achievementMedal}>
                <View style={[styles.medalCircle, { borderColor: medal.color }]}>
                  <Ionicons name={medal.name} size={32} color={medal.color} />
                </View>
                <Text style={styles.medalTitle}>{getCompetitionText(achievement.competition)}</Text>
                <Text style={styles.medalYear}>{achievement.year}</Text>
                <Text style={[styles.medalPlace, { color: medal.color }]}>{getPlaceText(achievement.place)}</Text>
                {isEditing && (
                  <View style={styles.medalEditButtons}>
                    <TouchableOpacity
                      style={styles.medalEditButton}
                      onPress={() => openEditModal(achievement)}
                    >
                      <Ionicons name="create" size={14} color="#FF4444" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.medalDeleteButton}
                      onPress={() => handleDeleteAchievement(achievement.id)}
                    >
                      <Ionicons name="trash" size={14} color="#FF4444" />
                    </TouchableOpacity>
                  </View>
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
          <Text style={styles.addButtonText}>{t('profile.addAchievement')}</Text>
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
              {editingAchievement ? t('profile.editAchievement') : t('profile.addAchievement')}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder={t('profile.competitionName')}
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
              placeholder={t('profile.year')}
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
              <Text style={styles.placeLabel}>{t('profile.place')}:</Text>
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
              placeholder={t('profile.description')}
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
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingAchievement ? handleEditAchievement : handleAddAchievement}
              >
                <Text style={styles.saveButtonText}>
                  {editingAchievement ? t('common.save') : t('common.add')}
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
  achievementsScroll: {
    marginHorizontal: -5,
  },
  achievementsContainer: {
    paddingHorizontal: 5,
    gap: 15,
  },
  achievementMedal: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    width: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  medalCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  medalTitle: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 14,
  },
  medalYear: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginBottom: 4,
  },
  medalPlace: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  medalEditButtons: {
    position: 'absolute',
    top: 5,
    right: 5,
    flexDirection: 'row',
    gap: 5,
  },
  medalEditButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 10,
    padding: 4,
  },
  medalDeleteButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 10,
    padding: 4,
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