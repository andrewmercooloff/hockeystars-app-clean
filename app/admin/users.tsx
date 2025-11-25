import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Player, loadCurrentUser, loadPlayers, updatePlayer, deletePlayer, fixMissingCreatedAt } from '../../utils/playerStorage';
import { useLanguage } from '../../contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AdminUsersScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [loadedPlayers, user] = await Promise.all([
        loadPlayers(true), // forceRefresh = true для получения актуальных данных
        loadCurrentUser()
      ]);
      
      setPlayers(loadedPlayers);
      setCurrentUser(user);
      
      if (user?.status !== 'admin') {
        Alert.alert('Доступ запрещён', 'Только для администраторов');
        router.back();
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Фильтрация и сортировка
  const filteredPlayers = players
    .filter(player => 
      player.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.country?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: any = a[sortField as keyof Player];
      let bVal: any = b[sortField as keyof Player];
      
      // Обработка дат
      if (sortField === 'createdAt' || sortField === 'lastSeen') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
      case 'star': return 'Звезда';
      case 'coach': return 'Тренер';
      case 'scout': return 'Скаут';
      case 'admin': return 'Админ';
      case 'shop': return 'Магазин';
      case 'player': return 'Игрок';
      default: return 'Игрок';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const formatShortDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const handlePlayerAction = (player: Player) => {
    setSelectedPlayer(player);
    setShowActionMenu(true);
  };

  const handleHidePlayer = async (player: Player) => {
    try {
      const isHidden = (player as any).is_hidden;
      await updatePlayer(player.id, { is_hidden: !isHidden } as any);
      Alert.alert('Успех', isHidden ? 'Пользователь показан' : 'Пользователь скрыт');
      loadData();
    } catch (error) {
      console.error('Ошибка скрытия:', error);
      Alert.alert('Ошибка', 'Не удалось изменить видимость пользователя');
    }
    setShowActionMenu(false);
  };

  const handleDeletePlayer = async (player: Player) => {
    Alert.alert(
      'Удаление пользователя',
      `Вы уверены, что хотите удалить ${player.name}? Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlayer(player.id);
              Alert.alert('Успех', 'Пользователь удалён');
              loadData();
            } catch (error) {
              console.error('Ошибка удаления:', error);
              Alert.alert('Ошибка', 'Не удалось удалить пользователя');
            }
          }
        }
      ]
    );
    setShowActionMenu(false);
  };

  const handleEditPlayer = (player: Player) => {
    setShowActionMenu(false);
    router.push(`/player/${player.id}?edit=true`);
  };

  const handleViewProfile = (player: Player) => {
    setShowActionMenu(false);
    router.push(`/player/${player.id}`);
  };

  const getImageSource = (avatar: string | undefined) => {
    if (!avatar) return require('../../assets/images/me.jpg');
    if (typeof avatar === 'string' && (
      avatar.startsWith('data:image/') ||
      avatar.startsWith('http') ||
      avatar.startsWith('file://') ||
      avatar.startsWith('content://')
    )) {
      return { uri: avatar };
    }
    return require('../../assets/images/me.jpg');
  };

  if (currentUser?.status !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Доступ запрещён</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Пользователи ({filteredPlayers.length})</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={async () => {
              Alert.alert(
                'Исправить даты регистрации',
                'Установить текущую дату для всех пользователей без даты регистрации?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Исправить',
                    onPress: async () => {
                      const fixed = await fixMissingCreatedAt();
                      Alert.alert('Готово', `Исправлено записей: ${fixed}`);
                      loadData();
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="calendar" size={20} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={loadData}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по имени, телефону, email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      ) : (
        <ScrollView style={styles.tableContainer} horizontal>
          <View>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={[styles.cell, styles.cellPhoto]}>
                <Text style={styles.headerText}>Фото</Text>
              </View>
              <TouchableOpacity style={[styles.cell, styles.cellName]} onPress={() => handleSort('name')}>
                <Text style={styles.headerText}>Имя {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cell, styles.cellStatus]} onPress={() => handleSort('status')}>
                <Text style={styles.headerText}>Тип {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cell, styles.cellCountry]} onPress={() => handleSort('country')}>
                <Text style={styles.headerText}>Страна {sortField === 'country' && (sortDirection === 'asc' ? '↑' : '↓')}</Text>
              </TouchableOpacity>
              <View style={[styles.cell, styles.cellPhone]}>
                <Text style={styles.headerText}>Телефон</Text>
              </View>
              <View style={[styles.cell, styles.cellEmail]}>
                <Text style={styles.headerText}>Email</Text>
              </View>
              <TouchableOpacity style={[styles.cell, styles.cellBirth]} onPress={() => handleSort('birthDate')}>
                <Text style={styles.headerText}>Дата рожд. {sortField === 'birthDate' && (sortDirection === 'asc' ? '↑' : '↓')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cell, styles.cellDate]} onPress={() => handleSort('createdAt')}>
                <Text style={styles.headerText}>Регистрация {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cell, styles.cellDate]} onPress={() => handleSort('lastSeen')}>
                <Text style={styles.headerText}>Активность {sortField === 'lastSeen' && (sortDirection === 'asc' ? '↑' : '↓')}</Text>
              </TouchableOpacity>
              <View style={[styles.cell, styles.cellOnline]}>
                <Text style={styles.headerText}>Online</Text>
              </View>
              <View style={[styles.cell, styles.cellHidden]}>
                <Text style={styles.headerText}>Скрыт</Text>
              </View>
              <View style={[styles.cell, styles.cellActions]}>
                <Text style={styles.headerText}>Действия</Text>
              </View>
            </View>

            {/* Table Body */}
            <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
              {filteredPlayers.map((player, index) => (
                <View key={player.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                  <View style={[styles.cell, styles.cellPhoto]}>
                    <Image source={getImageSource(player.avatar)} style={styles.avatar} />
                  </View>
                  <View style={[styles.cell, styles.cellName]}>
                    <Text style={styles.cellText} numberOfLines={1}>{player.name || '—'}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellStatus]}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(player.status) }]}>
                      <Text style={styles.statusBadgeText}>{getStatusText(player.status)}</Text>
                    </View>
                  </View>
                  <View style={[styles.cell, styles.cellCountry]}>
                    <Text style={styles.cellText} numberOfLines={1}>{player.country || '—'}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellPhone]}>
                    <Text style={styles.cellText} numberOfLines={1}>{player.phone || '—'}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellEmail]}>
                    <Text style={styles.cellText} numberOfLines={1}>{player.email || '—'}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellBirth]}>
                    <Text style={styles.cellText}>{formatShortDate(player.birthDate)}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellDate]}>
                    <Text style={styles.cellText}>{formatDate((player as any).createdAt)}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellDate]}>
                    <Text style={styles.cellText}>{formatDate((player as any).lastSeen)}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellOnline]}>
                    <View style={[styles.onlineIndicator, (player as any).isOnline && styles.onlineIndicatorActive]} />
                  </View>
                  <View style={[styles.cell, styles.cellHidden]}>
                    {(player as any).is_hidden ? (
                      <Ionicons name="eye-off" size={18} color="#FF4444" />
                    ) : (
                      <Ionicons name="eye" size={18} color="#4CAF50" />
                    )}
                  </View>
                  <View style={[styles.cell, styles.cellActions]}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleViewProfile(player)}>
                      <Ionicons name="eye" size={18} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleEditPlayer(player)}>
                      <Ionicons name="create" size={18} color="#FFD700" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleHidePlayer(player)}>
                      <Ionicons name={(player as any).is_hidden ? "eye" : "eye-off"} size={18} color="#FF9800" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleDeletePlayer(player)}>
                      <Ionicons name="trash" size={18} color="#FF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Stats */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Всего: {players.length} | Онлайн: {players.filter(p => (p as any).isOnline).length} | Скрыто: {players.filter(p => (p as any).is_hidden).length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tableRowAlt: {
    backgroundColor: '#111',
  },
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellPhoto: {
    width: 50,
  },
  cellName: {
    width: 140,
    alignItems: 'flex-start',
  },
  cellStatus: {
    width: 80,
  },
  cellCountry: {
    width: 100,
    alignItems: 'flex-start',
  },
  cellPhone: {
    width: 130,
    alignItems: 'flex-start',
  },
  cellEmail: {
    width: 180,
    alignItems: 'flex-start',
  },
  cellBirth: {
    width: 90,
  },
  cellDate: {
    width: 130,
  },
  cellOnline: {
    width: 60,
  },
  cellHidden: {
    width: 60,
  },
  cellActions: {
    width: 160,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  headerText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cellText: {
    color: '#ccc',
    fontSize: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#444',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#444',
    borderWidth: 2,
    borderColor: '#222',
  },
  onlineIndicatorActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  actionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statsBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statsText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});

