import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PlayerEditForm from '../components/PlayerEditForm';
import CachedAvatar from '../components/CachedAvatar';
import { Player, loadCurrentUser, loadPlayers } from '../utils/playerStorage';
import { createPlayerManually } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { useScreenContext } from '../contexts/ScreenContext';

const logo = require('../assets/images/logo.png');

const AdminHeader = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<Player | null>(null);

  const loadUser = async () => {
    try {
      const user = await loadCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Ошибка загрузки текущего пользователя:', error);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleProfilePress = () => {
    try {
      if (currentUser) {
        router.push(`/player/${currentUser.id}`);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Ошибка навигации к профилю:', error);
      Alert.alert(t('admin.error'), t('admin.errorLoadingProfile'));
    }
  };

  return (
    <View style={styles.adminHeader}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      <Image source={logo} style={styles.logo} resizeMode='contain' />
      
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={handleProfilePress}
      >
        <View style={styles.profileIcon}>
          {currentUser ? (
            <CachedAvatar
              playerId={currentUser.id}
              fallbackAvatarUrl={currentUser.avatar}
              size={45}
              fallbackIcon="person"
              fallbackSize={25}
              fallbackColor="#fff"
            />
          ) : (
            <Ionicons name="person" size={25} color="#fff" />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function AdminScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { setCurrentScreen } = useScreenContext();
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState<Partial<Player>>({
    name: '',
    phone: '',
    status: 'player',
    birthDate: '',
    country: 'Беларусь',
    team: '',
    position: '',
    avatar: null
  });

  const loadData = useCallback(async () => {
    try {
      const [loadedPlayers, user] = await Promise.all([
        loadPlayers(),
        loadCurrentUser()
      ]);
      
      setPlayers(loadedPlayers);
      setCurrentUser(user);
      
      // Проверяем, является ли пользователь администратором
      if (user?.status !== 'admin') {
        Alert.alert(t('admin.accessDenied'), t('admin.onlyAdmins'));
        router.back();
      }
      
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
    }
  }, [t, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Устанавливаем currentScreen при фокусе на экране админки и обновляем список игроков
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('admin');
      console.log('👑 АДМИНКА: Устанавливаем currentScreen = admin');
      // Обновляем список игроков при возврате на экран админки
      loadData();
      return () => {
        setCurrentScreen(null);
        console.log('👑 АДМИНКА: Устанавливаем currentScreen = null');
      };
    }, [setCurrentScreen, loadData])
  );

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return players.filter(
      player =>
        player.name.toLowerCase().includes(q) ||
        player.team?.toLowerCase().includes(q) ||
        player.status?.toLowerCase().includes(q)
    );
  }, [players, searchQuery]);



  const handleEditPlayer = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setShowPlayerModal(true);
  }, []);

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'star': return '#FFD700';
      case 'coach': return '#FF4444';
      case 'scout': return '#888888';
      case 'admin': return '#8A2BE2';
      case 'shop': return '#00FF00';
      default: return '#FFFFFF';
    }
  };

  const getStatusText = (status: string | undefined) => {
    switch (status) {
      case 'star': return t('admin.star');
      case 'coach': return t('admin.coach');
      case 'scout': return t('admin.scout');
      case 'admin': return t('admin.admin');
      case 'shop': return t('admin.shop');
      case 'player': return t('admin.player');
      default: return t('admin.player');
    }
  };

  const renderPlayerItem = useCallback(
    ({ item }: { item: Player }) => {
      return (
        <TouchableOpacity
          style={styles.playerItem}
          onPress={() => router.push({ pathname: '/player/[id]', params: { id: item.id } })}
        >
          <View
            style={[
              styles.playerAvatar,
              { borderColor: getStatusColor(item.status), borderWidth: 2, overflow: 'hidden' },
            ]}
          >
            <CachedAvatar
              playerId={item.id}
              fallbackAvatarUrl={item.avatar}
              size={56}
              status={item.status}
            />
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{item.name || t('admin.noName')}</Text>
            <Text style={styles.playerDetails}>
              {item.position ? t(`profile.${item.position}`) : t('admin.noPosition')} •{' '}
              {item.team ? t(`teams.${item.team}`) : t('admin.noTeam')} • {item.age || 0}{' '}
              {t('admin.yearsOld')}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleEditPlayer(item)} style={{ padding: 8 }}>
            <Ionicons name="create" size={24} color="#666" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [router, t, handleEditPlayer]
  );

  const adminPlayerKeyExtractor = useCallback((item: Player) => item.id, []);

  const handleCreateUser = async () => {
    if (!currentUser || currentUser.status !== 'admin') {
      Alert.alert('Ошибка', 'Только администратор может создавать пользователей');
      return;
    }

    // Для админа: все поля необязательны. Если телефон указан, проверим формат
    if (newUserData.phone) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(newUserData.phone.replace(/\s/g, ''))) {
        Alert.alert('Ошибка', 'Пожалуйста, введите корректный номер телефона с кодом страны');
        return;
      }
    }

    try {
      const createdPlayer = await createPlayerManually(
        {
          ...newUserData,
          age: 0,
          goals: '',
          assists: '',
          games: '',
          pullUps: '',
          pushUps: '',
          plankTime: '',
          sprint100m: '',
          longJump: ''
        } as Player,
        currentUser.id
      );

      if (createdPlayer) {
        // Обновляем список игроков
        const updatedPlayers = await loadPlayers();
        setPlayers(updatedPlayers);
        
        // Сбрасываем форму и закрываем модальное окно
        setNewUserData({
          name: '',
          phone: '',
          status: 'player',
          birthDate: '',
          country: 'Беларусь',
          team: '',
          position: '',
          avatar: null
        });
        setShowCreateUserModal(false);

        Alert.alert('Успех', `Пользователь ${createdPlayer.name} создан`);
      } else {
        Alert.alert('Ошибка', 'Не удалось создать пользователя');
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      Alert.alert('Ошибка', 'Не удалось создать пользователя');
    }
  };

  const handleAddUser = () => {
    setShowCreateUserModal(true);
  };

  if (currentUser?.status !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('admin.accessDenied')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader />

      <ScrollView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.adminButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleAddUser}
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={styles.adminButtonText}>{t('admin.addUser')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('admin.searchPlayers')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      {/* Кнопки диагностики, очистки и миграции */}
      <View style={styles.imageButtonsContainer}>
        <TouchableOpacity 
          style={[styles.imageButton, styles.fixAllButton]}
          onPress={async () => {
            try {
              Alert.alert(
                'Полное исправление',
                'Выполнить полное исправление всех проблем с изображениями?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Исправить', 
                    onPress: async () => {
                      const { fixAllImageIssues } = await import('../utils/playerStorage');
                      await fixAllImageIssues();
                      Alert.alert('Готово', 'Полное исправление завершено');
                      // Обновляем список игроков
                      loadData();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Ошибка исправления:', error);
              Alert.alert('Ошибка', 'Не удалось выполнить исправление');
            }
          }}
        >
          <Ionicons name="build" size={16} color="#fff" />
          <Text style={styles.imageButtonText}>Исправить все</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imageButtonsContainer}>
        <TouchableOpacity 
          style={[styles.imageButton, styles.diagnoseButton]}
          onPress={async () => {
            try {
              const { diagnoseImages } = await import('../utils/playerStorage');
              await diagnoseImages();
              Alert.alert('Диагностика', 'Проверьте консоль для результатов диагностики');
            } catch (error) {
              console.error('Ошибка диагностики:', error);
              Alert.alert('Ошибка', 'Не удалось выполнить диагностику');
            }
          }}
        >
          <Ionicons name="search" size={16} color="#fff" />
          <Text style={styles.imageButtonText}>Диагностика</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.imageButton, styles.cleanupButton]}
          onPress={async () => {
            try {
              Alert.alert(
                'Очистка данных',
                'Очистить некорректные данные в базе?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Очистить', 
                    onPress: async () => {
                      const { cleanupDatabaseData } = await import('../utils/playerStorage');
                      await cleanupDatabaseData();
                      Alert.alert('Готово', 'Очистка данных завершена');
                      // Обновляем список игроков
                      loadData();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Ошибка очистки:', error);
              Alert.alert('Ошибка', 'Не удалось выполнить очистку');
            }
          }}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.imageButtonText}>Очистка</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.imageButton, styles.migrateButton]}
          onPress={async () => {
            try {
              Alert.alert(
                'Миграция изображений',
                'Начать миграцию всех локальных изображений в Storage?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Начать', 
                    onPress: async () => {
                      const { migrateAllImagesToStorage } = await import('../utils/playerStorage');
                      await migrateAllImagesToStorage();
                      Alert.alert('Готово', 'Миграция изображений завершена');
                      // Обновляем список игроков
                      loadData();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Ошибка миграции:', error);
              Alert.alert('Ошибка', 'Не удалось выполнить миграцию');
            }
          }}
        >
          <Ionicons name="cloud-upload" size={16} color="#fff" />
          <Text style={styles.imageButtonText}>Миграция</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.imageButton, styles.fixUrlsButton]}
          onPress={async () => {
            try {
              Alert.alert(
                'Исправление URL',
                'Проверить и исправить URL изображений?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Исправить', 
                    onPress: async () => {
                      const { fixImageUrls } = await import('../utils/playerStorage');
                      await fixImageUrls();
                      Alert.alert('Готово', 'Проверка URL изображений завершена');
                      // Обновляем список игроков
                      loadData();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Ошибка исправления URL:', error);
              Alert.alert('Ошибка', 'Не удалось исправить URL');
            }
          }}
        >
          <Ionicons name="link" size={16} color="#fff" />
          <Text style={styles.imageButtonText}>Исправить URL</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.imageButton, styles.publicUrlsButton]}
          onPress={async () => {
            try {
              Alert.alert(
                'Публичные URL',
                'Обновить URL изображений на публичные ссылки?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Обновить', 
                    onPress: async () => {
                      const { updateImageUrlsToPublic } = await import('../utils/playerStorage');
                      await updateImageUrlsToPublic();
                      Alert.alert('Готово', 'Обновление публичных URL завершено');
                      // Обновляем список игроков
                      loadData();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Ошибка обновления публичных URL:', error);
              Alert.alert('Ошибка', 'Не удалось обновить публичные URL');
            }
          }}
        >
          <Ionicons name="globe" size={16} color="#fff" />
          <Text style={styles.imageButtonText}>Публичные URL</Text>
        </TouchableOpacity>
      </View>

      {/* Кнопка добавления пользователя */}
      <TouchableOpacity 
        style={[styles.imageButton, styles.addUserButton]}
        onPress={() => setShowCreateUserModal(true)}
      >
        <Ionicons name="person-add" size={16} color="#fff" />
        <Text style={styles.imageButtonText}>Добавить</Text>
      </TouchableOpacity>

      {/* Модальное окно создания пользователя */}
      <Modal
        visible={showCreateUserModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowCreateUserModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCreateUserModal(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {t('admin.createUser')}
            </Text>
          </View>

          <ScrollView 
            style={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>{t('admin.basicInfo')}</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('admin.name')} (только латиница)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Введите имя"
                  placeholderTextColor="#666"
                  value={newUserData.name}
                  onChangeText={(text) => setNewUserData(prev => ({ ...prev, name: text }))}
                />
                <Text style={styles.inputHint}>Используйте только латинские буквы</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('admin.phone')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+375 (29) 123-45-67"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  value={newUserData.phone}
                  onChangeText={(text) => setNewUserData(prev => ({ ...prev, phone: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('admin.status')}</Text>
                <View style={styles.statusSelector}>
                  {['player', 'coach', 'scout', 'star', 'shop'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        newUserData.status === status && styles.statusOptionSelected
                      ]}
                      onPress={() => setNewUserData(prev => ({ ...prev, status: status as Player['status'] }))}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        newUserData.status === status && styles.statusOptionTextSelected
                      ]}>
                        {getStatusText(status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Команда</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Название команды"
                  placeholderTextColor="#666"
                  value={newUserData.team}
                  onChangeText={(text) => setNewUserData(prev => ({ ...prev, team: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('admin.position')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Позиция в команде"
                  placeholderTextColor="#666"
                  value={newUserData.position}
                  onChangeText={(text) => setNewUserData(prev => ({ ...prev, position: text }))}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.footerButton, { backgroundColor: '#FF4444' }]}
              onPress={handleCreateUser}
            >
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.modalButtonText}>Создать</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FlatList
        data={filteredPlayers}
        renderItem={renderPlayerItem}
        keyExtractor={adminPlayerKeyExtractor}
        style={styles.playerList}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {/* Модальное окно редактирования игрока */}
      <Modal
        visible={showPlayerModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowPlayerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPlayerModal(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Редактирование игрока
            </Text>
          </View>

          {selectedPlayer && (
            <PlayerEditForm
              player={selectedPlayer}
              onSave={async (updatedPlayer) => {
                // Обновляем список игроков
                const updatedPlayers = await loadPlayers();
                setPlayers(updatedPlayers);
                setShowPlayerModal(false);
              }}
              onCancel={() => setShowPlayerModal(false)}
            />
          )}
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    color: '#fff',
    fontSize: 16,
  },
  playerList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  playerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  playerDetails: {
    fontSize: 14,
    color: '#ccc',
  },
  playerStatus: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050008',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonDisabled: {
    color: '#666',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  photoContainer: {
    borderRadius: 60,
    overflow: 'hidden',
  },
  editPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(1, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginTop: 20,
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
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
    minHeight: 48,
  },
  inputDisabled: {
    backgroundColor: '#2a2a2a',
    color: '#999',
  },
  row: {
    flexDirection: 'row',
  },
  statusSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptionSelected: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  statusOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statusOptionTextSelected: {
    color: '#050008',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    minHeight: 50,
  },
  editButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 0, 8, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalMessage: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  modalButtons: {
    width: '100%',
    gap: 15,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4444',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    minHeight: 50,
  },
  modalButtonSecondary: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalButtonTextSecondary: {
    color: '#FFD700',
  },
  techSupportText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 10,
  },
  saveButtonContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFD700',
  },
  closeButton: {
    padding: 8,
  },
  imagePickerModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    flex: 1,
    justifyContent: 'center',
  },
  imagePickerModalHeader: {
    marginBottom: 20,
  },
  imagePickerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  adminHeader: {
    height: 128,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#2a2a2a',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logo: {
    width: 180,
    height: 60,
  },
  profileButton: {
    alignItems: 'center',
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  profileIcon: {
    width: 51,
    height: 51,
    borderRadius: 25.5,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 48,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginRight: 10,
  },
  placeholderText: {
    color: '#666',
  },
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  selectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#333',
    marginBottom: 8,
  },
  selectorOptionSelected: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  selectorOptionText: {
    fontSize: 14,
    color: '#ccc',
  },
  selectorOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 0, 8, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  datePickerModal: {
    backgroundColor: '#050008',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 300,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  datePickerButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  confirmButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  diagnoseButton: {
    backgroundColor: '#4CAF50',
  },
  cleanupButton: {
    backgroundColor: '#FF9800',
  },
  migrateButton: {
    backgroundColor: '#FF4444',
  },
  fixUrlsButton: {
    backgroundColor: '#2196F3',
  },
  publicUrlsButton: {
    backgroundColor: '#00BCD4',
  },
  fixAllButton: {
    backgroundColor: '#9C27B0',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addUserButton: {
    backgroundColor: '#FF4444',  // Изменим цвет на более яркий
    marginTop: 10,
    marginBottom: 20,
    marginHorizontal: 20,
    alignSelf: 'stretch',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    marginBottom: 20,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 10,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 