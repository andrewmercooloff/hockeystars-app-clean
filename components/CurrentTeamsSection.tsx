import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { createTeam, PastTeam, searchTeams, Team } from '../utils/playerStorage';
import DraggableTeamItem from './DraggableTeamItem';
import { useLanguage } from '../contexts/LanguageContext';
import { getTeamDisplayName as getTeamTranslation, getCityDisplayName, getCountryDisplayName } from '../utils/teamTranslations';

interface CurrentTeamsSectionProps {
  currentTeams?: PastTeam[];
  isEditing?: boolean;
  onCurrentTeamsChange?: (currentTeams: PastTeam[]) => void;
  onMoveToPastTeams?: (team: PastTeam) => void;
  readOnly?: boolean;
}

export default function CurrentTeamsSection({ 
  currentTeams = [], 
  isEditing = false,
  onCurrentTeamsChange,
  readOnly = false
}: CurrentTeamsSectionProps) {
  const { t, language } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  // Функция для получения переведенного названия команды
  const getTeamDisplayName = (teamName: string) => {
    // Сначала пробуем получить перевод из локализации
    const translationKey = `teams.${teamName}`;
    const translated = t(translationKey);
    // Если функция t() вернула сам ключ или ключ с префиксом, значит перевода нет
    if (translated !== translationKey && !translated.startsWith('teams.')) {
      return translated;
    }
    
    // Если нет в локализации, используем наш словарь переводов
    const teamTranslation = getTeamTranslation(teamName, language);
    // Если и в словаре нет, возвращаем оригинальное название
    return teamTranslation || teamName;
  };
  const [editingTeam, setEditingTeam] = useState<PastTeam | null>(null);
  const [newTeam, setNewTeam] = useState({
    teamName: '',
    teamCountry: '',
    teamCity: '',
    startYear: '',
    endYear: '',
    isCurrent: true
  });

  // Состояние для автодополнения команд
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedExistingTeam, setSelectedExistingTeam] = useState<Team | null>(null);

  // Поиск команд при изменении поискового запроса
  useEffect(() => {
    const searchTeamsAsync = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      setShowSuggestions(true);
      try {
        const results = await searchTeams(searchTerm.trim(), language);
        setSearchResults(results);
      } catch (error) {
        console.error('Ошибка поиска команд:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchTeamsAsync, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Выбор команды из автодополнения
  const selectTeam = (team: Team) => {
    if (editingTeam) {
      setEditingTeam({ 
        ...editingTeam, 
        teamName: team.name,
        teamCountry: team.country || '',
        teamCity: team.city || ''
      });
    } else {
      setNewTeam({ 
        ...newTeam, 
        teamName: team.name,
        teamCountry: team.country || '',
        teamCity: team.city || ''
      });
      // Сохраняем выбранную команду
      setSelectedExistingTeam(team);
    }
    setSearchTerm('');
    setSearchResults([]);
    setShowSuggestions(false);
  };

  const handleAddTeam = async () => {
    if (!newTeam.teamName.trim()) {
      Alert.alert(t('error'), t('enterTeamName'));
      return;
    }

    const startYear = parseInt(newTeam.startYear);
    if (isNaN(startYear) || startYear < 1900 || startYear > new Date().getFullYear()) {
      Alert.alert(t('error'), t('enterStartYear'));
      return;
    }

    let endYear: number | undefined;
    if (newTeam.endYear.trim()) {
      endYear = parseInt(newTeam.endYear);
      if (isNaN(endYear) || endYear < startYear || endYear > new Date().getFullYear()) {
        Alert.alert(t('error'), t('enterEndYear'));
        return;
      }
    }

    // Проверяем, была ли выбрана существующая команда
    let teamId: string;
    
    if (selectedExistingTeam && selectedExistingTeam.name.toLowerCase() === newTeam.teamName.trim().toLowerCase()) {
      // Используем выбранную существующую команду
      teamId = selectedExistingTeam.id;
      
    } else {
      // Проверяем, есть ли команда в результатах поиска
      const existingTeam = searchResults.find(team => 
        team.name.toLowerCase() === newTeam.teamName.trim().toLowerCase()
      );

      if (existingTeam) {
        // Используем существующую команду из результатов поиска
        teamId = existingTeam.id;

      } else {
        // Создаем новую команду в базе данных

        
        const createdTeam = await createTeam({
          name: newTeam.teamName.trim(),
          type: 'club', // По умолчанию тип "клуб"
          country: newTeam.teamCountry.trim() || t('belarus'),
          city: newTeam.teamCity.trim() || undefined
        });

        if (createdTeam) {
          teamId = createdTeam.id;

        } else {
          console.error('❌ Не удалось создать команду в базе данных для:', newTeam.teamName.trim());
          Alert.alert(t('error'), t('createTeamError'));
          return;
        }
      }
    }

    const currentTeam: PastTeam = {
      id: teamId, // Используем ID из базы данных
      teamName: newTeam.teamName.trim(),
      teamCountry: newTeam.teamCountry.trim() || undefined,
      teamCity: newTeam.teamCity.trim() || undefined,
      startYear: startYear,
      endYear: undefined, // Для текущих команд год окончания всегда undefined
      isCurrent: true // Все команды в CurrentTeamsSection - текущие
    };

    // Добавляем команду в текущие команды
    const updatedTeams = [...currentTeams, currentTeam];
    onCurrentTeamsChange?.(updatedTeams);
    
    setNewTeam({
      teamName: '',
      teamCountry: '',
      teamCity: '',
      startYear: '',
      endYear: '',
      isCurrent: true // Всегда true для CurrentTeamsSection
    });
    setSelectedExistingTeam(null);
    setModalVisible(false);
  };

  const handleEditTeam = async () => {
    if (!editingTeam) return;

    if (!editingTeam.teamName.trim()) {
      Alert.alert(t('error'), t('enterTeamName'));
      return;
    }

    if (editingTeam.startYear < 1900 || editingTeam.startYear > new Date().getFullYear()) {
      Alert.alert(t('error'), t('enterStartYear'));
      return;
    }

    if (editingTeam.endYear && (editingTeam.endYear < editingTeam.startYear || editingTeam.endYear > new Date().getFullYear())) {
      Alert.alert('Ошибка', 'Введите корректный год окончания');
      return;
    }

    // Проверяем, была ли выбрана существующая команда
    let teamId: string;
    
    if (selectedExistingTeam && selectedExistingTeam.name.toLowerCase() === editingTeam.teamName.trim().toLowerCase()) {
      // Используем выбранную существующую команду
      teamId = selectedExistingTeam.id;
      
    } else {
      // Проверяем, есть ли команда в результатах поиска
      const existingTeam = searchResults.find(team => 
        team.name.toLowerCase() === editingTeam.teamName.trim().toLowerCase()
      );

      if (existingTeam) {
        teamId = existingTeam.id;

      } else {
        const createdTeam = await createTeam({
          name: editingTeam.teamName.trim(),
          type: 'club',
          country: editingTeam.teamCountry.trim() || 'Беларусь',
          city: editingTeam.teamCity.trim() || undefined
        });

        if (createdTeam) {
          teamId = createdTeam.id;

        } else {
          Alert.alert(t('error'), t('createTeamError'));
          return;
        }
      }
    }

    // Обновляем команду в текущих командах (всегда остается текущей)
    const updatedTeam = { 
      ...editingTeam, 
      id: teamId, 
      teamName: editingTeam.teamName.trim(),
      endYear: undefined, // Для текущих команд год окончания всегда undefined
      isCurrent: true // Всегда true для CurrentTeamsSection
    };
    
    const updatedTeams = currentTeams.map(team => 
      team.id === editingTeam.id ? updatedTeam : team
    );
    onCurrentTeamsChange?.(updatedTeams);
    
    setEditingTeam(null);
    setSelectedExistingTeam(null);
    setModalVisible(false);
  };

  const handleDeleteTeam = (id: string) => {
    Alert.alert(
      t('common.deleteConfirm'),
      t('common.deleteTeamConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const updatedTeams = currentTeams.filter(team => team.id !== id);
            onCurrentTeamsChange?.(updatedTeams);
          }
        }
      ]
    );
  };

  const openEditModal = (team: PastTeam) => {
    setEditingTeam(team);
    setSelectedExistingTeam(null);
    setModalVisible(true);
  };

  const handleDragEnd = ({ data }: { data: PastTeam[] }) => {
    
    onCurrentTeamsChange?.(data);
  };

  const currentTeamKeyExtractor = useCallback((item: PastTeam, index: number) => {
    if (item?.id) return String(item.id);
    return `current-team-${index}`;
  }, []);

  const renderCurrentTeamItem = ({ item, drag, isActive }: RenderItemParams<PastTeam>) => {
    return (
      <DraggableTeamItem
        team={item}
        onRemove={readOnly ? undefined : () => handleDeleteTeam(item.id)}
        onEdit={readOnly ? undefined : () => openEditModal(item)}
        drag={readOnly ? undefined : drag}
        isActive={isActive}
        readOnly={readOnly}
      />
    );
  };

  const getPeriodText = (team: PastTeam) => {
    // Для текущих команд всегда показываем "настоящее время"
    return `(${team.startYear} - ${t('profile.настоящее время')})`;
  };

  return (
    <View style={styles.container}>
      {currentTeams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shirt-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>{t('noCurrentTeams')}</Text>
        </View>
      ) : (
        <DraggableFlatList
          data={currentTeams}
          renderItem={renderCurrentTeamItem}
          keyExtractor={currentTeamKeyExtractor}
          onDragEnd={handleDragEnd}
          scrollEnabled={false}
          contentContainerStyle={styles.teamsList}
        />
      )}

      {isEditing && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setModalVisible(true);
            setSelectedExistingTeam(null);
          }}
        >
          <Ionicons name="add-circle" size={24} color="#FF4444" />
          <Text style={styles.addButtonText}>{t('addTeam')}</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
              <View style={styles.modalContent}>
                <ScrollView 
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScrollContent}
                >
                  <Text style={styles.modalTitle}>
                    {editingTeam ? t('editTeam') : t('addTeam')}
                  </Text>
                  
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('searchTeams')}
                      placeholderTextColor="#888"
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                    />
                    {showSuggestions && (
                      <View style={styles.suggestionsContainer}>
                        {isSearching ? (
                          <Text style={styles.suggestionText}>{t('searching')}</Text>
                        ) : searchResults.length > 0 ? (
                          <ScrollView style={styles.suggestionsList} nestedScrollEnabled>
                            {searchResults.map((team) => (
                              <TouchableOpacity
                                key={team.id}
                                style={styles.suggestionItem}
                                onPress={() => selectTeam(team)}
                              >
                                <Text style={styles.suggestionText}>{getTeamDisplayName(team.name)}</Text>
                                {(team.city || team.country) && (
                                  <Text style={styles.suggestionSubtext}>
                                    {[
                                      team.city ? getCityDisplayName(team.city, language) : null,
                                      team.country ? getCountryDisplayName(team.country, language) : null
                                    ].filter(Boolean).join(', ')}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : searchTerm.trim().length >= 2 ? (
                          <Text style={styles.suggestionText}>{t('noTeamsFound')}</Text>
                        ) : null}
                      </View>
                    )}
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder={t('teamName')}
                    placeholderTextColor="#888"
                    value={editingTeam?.teamName || newTeam.teamName}
                    onChangeText={(text) => {
                      if (editingTeam) {
                        setEditingTeam({ ...editingTeam, teamName: text });
                      } else {
                        setNewTeam({ ...newTeam, teamName: text });
                      }
                    }}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder={t('teamCountry')}
                    placeholderTextColor="#888"
                    value={editingTeam?.teamCountry || newTeam.teamCountry}
                    onChangeText={(text) => {
                      if (editingTeam) {
                        setEditingTeam({ ...editingTeam, teamCountry: text });
                      } else {
                        setNewTeam({ ...newTeam, teamCountry: text });
                      }
                    }}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder={t('teamCity')}
                    placeholderTextColor="#888"
                    value={editingTeam?.teamCity || newTeam.teamCity}
                    onChangeText={(text) => {
                      if (editingTeam) {
                        setEditingTeam({ ...editingTeam, teamCity: text });
                      } else {
                        setNewTeam({ ...newTeam, teamCity: text });
                      }
                    }}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder={t('startYear')}
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    returnKeyType="done"
                    value={editingTeam?.startYear?.toString() || newTeam.startYear}
                    onChangeText={(text) => {
                      if (editingTeam) {
                        setEditingTeam({ ...editingTeam, startYear: parseInt(text) || 0 });
                      } else {
                        setNewTeam({ ...newTeam, startYear: text });
                      }
                    }}
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  {/* Поле окончания скрыто для текущих команд - они активные */}
                </ScrollView>
                
                {/* Кнопки вынесены за пределы ScrollView для фиксации над клавиатурой */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setModalVisible(false);
                      setEditingTeam(null);
                      setNewTeam({
                        teamName: '',
                        teamCountry: '',
                        teamCity: '',
                        startYear: '',
                        endYear: '',
                        isCurrent: true
                      });
                    }}
                  >
                    <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={editingTeam ? handleEditTeam : handleAddTeam}
                  >
                    <Text style={styles.saveButtonText}>
                      {editingTeam ? t('save') : t('add')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#666',
    marginTop: 10,
  },
  teamsList: {
    paddingBottom: 10,
    flexGrow: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    marginBottom: 10,
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
  keyboardView: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    maxHeight: 500,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  suggestionSubtext: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginTop: 2,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveButton: {
    backgroundColor: '#FF4444',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
}); 