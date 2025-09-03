import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ImageBackground,
    Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { loadPlayers, Player, loadCurrentUser } from '../utils/playerStorage';

// Предотвращаем автоматическое скрытие заставки
SplashScreen.preventAutoHideAsync();

// Компонент для фильтра
const FilterButton = React.memo(({ 
  title, 
  options, 
  selectedValue, 
  onSelect 
}: { 
  title: string, 
  options: string[], 
  selectedValue: string | null, 
  onSelect: (value: string | null) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((value: string | null) => {
    onSelect(value);
    setIsOpen(false);
  }, [onSelect]);

  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={styles.filterButton} 
        onPress={toggleDropdown}
      >
        <Text style={styles.filterButtonText}>
          {selectedValue || title}
        </Text>
        <Text style={styles.filterButtonIcon}>
          {isOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.filterDropdown}>
          <TouchableOpacity 
            style={styles.filterDropdownItem} 
            onPress={() => handleSelect(null)}
          >
            <Text style={styles.filterDropdownItemText}>Все</Text>
          </TouchableOpacity>
          {options.map((option) => (
            <TouchableOpacity 
              key={option}
              style={[
                styles.filterDropdownItem,
                selectedValue === option && styles.selectedFilterItem
              ]} 
              onPress={() => handleSelect(option)}
            >
              <Text style={styles.filterDropdownItemText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

export default function SearchScreen() {
  const router = useRouter();
  
  // Состояния для фильтрации и поиска
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMinHeight, setSelectedMinHeight] = useState<string | null>(null);
  const [selectedMinWeight, setSelectedMinWeight] = useState<string | null>(null);

  // Загрузка пользователя и данных
  useEffect(() => {
    const loadData = async () => {
      try {
        // Загрузка пользователя с таймаутом
        const userPromise = loadCurrentUser();
        const userTimeout = new Promise<Player | null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 500)
        );

        const user = await Promise.race([userPromise, userTimeout]);

        if (!user) {
          router.replace('/login');
          return;
        }

        setCurrentUser(user);

        // Загрузка игроков
        const allPlayers = await loadPlayers();
        const filteredPlayers = allPlayers.filter(
          player => 
            player.status === 'player' || 
            player.status === 'coach' || 
            player.status === 'admin'
        );
        
        setPlayers(filteredPlayers);
      } catch (error) {
        console.error('Ошибка загрузки:', error);
        router.replace('/login');
      } finally {
        await SplashScreen.hideAsync();
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // Мемоизированные фильтры
  const countries = useMemo(() => 
    Array.from(new Set(players.map(p => p.country).filter(Boolean))).sort(), 
    [players]
  );

  const hands = useMemo(() => ['Левый', 'Правый'], []);

  const positions = useMemo(() => 
    Array.from(new Set(players.map(p => p.position).filter(Boolean))).sort(), 
    [players]
  );

  const years = useMemo(() => 
    Array.from(new Set(
      players
        .map(p => p.birthDate ? p.birthDate.split('-')[0] : null)
        .filter(Boolean)
    )).sort(), 
    [players]
  );

  const heights = useMemo(() => 
    Array.from(new Set(
      players
        .map(p => p.height ? Math.round(parseInt(p.height) / 10) * 10 : null)
        .filter(Boolean)
    )).sort((a, b) => a - b).map(h => `${h} см`), 
    [players]
  );

  const weights = useMemo(() => 
    Array.from(new Set(
      players
        .map(p => p.weight ? Math.round(parseInt(p.weight) / 10) * 10 : null)
        .filter(Boolean)
    )).sort((a, b) => a - b).map(w => `${w} кг`), 
    [players]
  );

  // Фильтрация игроков
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Администратор всегда виден
      if (player.status === 'admin') return true;

      // Фильтр по поиску
      const matchesSearch = !searchQuery || 
        player.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Фильтр по стране
      const matchesCountry = !selectedCountry || player.country === selectedCountry;
      
      // Фильтр по хвату
      const matchesHand = !selectedHand || 
        (selectedHand === 'Левый' && player.grip === 'Левый') || 
        (selectedHand === 'Правый' && player.grip === 'Правый');
      
      // Фильтр по позиции
      const matchesPosition = !selectedPosition || player.position === selectedPosition;
      
      // Фильтр по году
      const matchesYear = !selectedYear || 
        (player.birthDate && player.birthDate.startsWith(selectedYear));
      
      // Фильтр по росту (от)
      const matchesHeight = !selectedMinHeight || 
        (player.height && parseInt(player.height) >= parseInt(selectedMinHeight));
      
      // Фильтр по весу (от)
      const matchesWeight = !selectedMinWeight || 
        (player.weight && parseInt(player.weight) >= parseInt(selectedMinWeight));
      
      return matchesSearch && 
             matchesCountry && 
             matchesHand && 
             matchesPosition && 
             matchesYear &&
             matchesHeight &&
             matchesWeight;
    });
  }, [players, searchQuery, selectedCountry, selectedHand, selectedPosition, selectedYear, selectedMinHeight, selectedMinWeight]);

  // Рендер элемента списка игроков
  const renderPlayerItem = useCallback(({ item }: { item: Player }) => {
    // Приоритет: avatar, photos[0], default
    const playerPhoto = 
      item.avatar || 
      (item.photos && item.photos.length > 0 && item.photos[0]) || 
      require('../assets/images/default-avatar.png');

    // Определяем стиль контура в зависимости от статуса
    const photoContainerStyle = 
      item.status === 'coach' 
        ? styles.coachPhotoContainer 
        : styles.playerPhotoContainer;

    return (
      <TouchableOpacity 
        style={styles.playerItem} 
        onPress={() => router.push({ pathname: '/player/[id]', params: { id: item.id } })}
      >
        <View style={photoContainerStyle}>
          <Image 
            source={typeof playerPhoto === 'string' ? { uri: playerPhoto } : playerPhoto} 
            style={styles.playerPhoto} 
            onError={(e) => {
              console.warn(`Ошибка загрузки фото для игрока ${item.name}:`, e.nativeEvent.error);
            }}
            defaultSource={require('../assets/images/default-avatar.png')}
          />
        </View>
        <View style={styles.playerDetails}>
          <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          {item.status !== 'admin' && (
            <Text style={styles.playerInfo} numberOfLines={2} ellipsizeMode="tail">
              {item.country} | {item.position} | {item.birthDate?.split('-')[0]} | {item.height} см | {item.weight} кг | {item.grip === 'Левый' ? 'Л' : 'П'} хват
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [router]);

  // Показываем загрузку пока проверяем авторизацию
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Проверка авторизации...</Text>
      </View>
    );
  }

  // Если пользователь не авторизован, не показываем контент
  if (!currentUser) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Полупрозрачный фон льда */}
      <ImageBackground
        source={require('../assets/images/led.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        
        <View style={styles.contentContainer}>
          {/* Поле поиска */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск игроков..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Контейнер фильтров */}
          <View style={styles.filtersContainer}>
            <FilterButton 
              title="Страна" 
              options={countries} 
              selectedValue={selectedCountry}
              onSelect={setSelectedCountry}
            />
            <FilterButton 
              title="Хват" 
              options={hands} 
              selectedValue={selectedHand}
              onSelect={setSelectedHand}
            />
            <FilterButton 
              title="Позиция" 
              options={positions} 
              selectedValue={selectedPosition}
              onSelect={setSelectedPosition}
            />
            <FilterButton 
              title="Год" 
              options={years} 
              selectedValue={selectedYear}
              onSelect={setSelectedYear}
            />
            <FilterButton 
              title="Рост от" 
              options={heights} 
              selectedValue={selectedMinHeight}
              onSelect={setSelectedMinHeight}
            />
            <FilterButton 
              title="Вес от" 
              options={weights} 
              selectedValue={selectedMinWeight}
              onSelect={setSelectedMinWeight}
            />
          </View>

          {/* Список игроков */}
          <FlatList
            data={filteredPlayers}
            renderItem={renderPlayerItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Игроки не найдены</Text>
              </View>
            }
            contentContainerStyle={styles.playersList}
          />
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', // Легкое затемнение фона
  },
  contentContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)', // Полупрозрачный фон
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  filterContainer: {
    width: '30%',
    marginBottom: 10,
  },
  filterButton: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 13,
  },
  filterButtonIcon: {
    color: '#fff',
    fontSize: 10,
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 10,
    marginTop: 4,
    zIndex: 10,
  },
  filterDropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterDropdownItemText: {
    color: '#fff',
    fontSize: 13,
  },
  selectedFilterItem: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  playersList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 10,
  },
  playerPhotoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'white',
    marginRight: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachPhotoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'red',
    marginRight: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerPhoto: {
    width: '100%',
    height: '100%',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  playerInfo: {
    color: '#ccc',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
});
