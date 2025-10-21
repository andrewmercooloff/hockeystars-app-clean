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
    Dimensions,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { loadPlayers, Player, loadCurrentUser } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { useScreenContext } from '../contexts/ScreenContext';
import { useUser } from '../contexts/UserContext';
import { forceGilroyFont } from '../utils/forceGilroyFont';

// Предотвращаем автоматическое скрытие заставки
SplashScreen.preventAutoHideAsync();

// Компонент для фильтра
const FilterButton = React.memo(({ 
  title, 
  options, 
  selectedValue, 
  onSelect,
  isActive = false,
  filterName,
  isOpen,
  onToggle,
  positions,
  countries
}: { 
  title: string, 
  options: any[], 
  selectedValue: string | null, 
  onSelect: (value: string | null) => void,
  isActive?: boolean,
  filterName: string,
  isOpen: boolean,
  onToggle: (filterName: string) => void,
  positions?: any[],
  countries?: any[]
}) => {
  const { t, language } = useLanguage();

  const toggleDropdown = useCallback(() => {
    onToggle(filterName);
  }, [onToggle, filterName]);

  const handleSelect = useCallback((value: string | null) => {
    onSelect(value);
    onToggle(filterName); // Закрываем фильтр после выбора
  }, [onSelect, onToggle, filterName]);

  return (
    <View style={[styles.filterContainer, isActive && styles.filterContainerActive]}>
      <TouchableOpacity 
        style={[styles.filterButton, isActive && styles.filterButtonActive]} 
        onPress={toggleDropdown}
      >
        <Text style={styles.filterButtonText}>
          {(() => {
            if (selectedValue) {
              // Для позиций нужно найти переведенное название
              if (title === t('search.position') && positions) {
                const positionMapping = positions.find(p => p.original === selectedValue);
                if (positionMapping) {
                  return positionMapping.translated;
                }
                // Если не найдено, делаем первую букву заглавной
                return selectedValue.charAt(0).toUpperCase() + selectedValue.slice(1).toLowerCase();
              }
              
              // Для стран нужно найти переведенное название
              if (title === t('search.country') && countries) {
                const countryMapping = countries.find(c => c.original === selectedValue);
                if (countryMapping) {
                  return countryMapping.translated;
                }
                // Если не найдено, используем оригинальное название
                return selectedValue;
              }
              return selectedValue;
            }
            return title;
          })()}
        </Text>
        <Text style={styles.filterButtonIcon}>
          {isOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      
      {isOpen && (
        <View style={[styles.filterDropdown, isActive && styles.filterDropdownActive]}>
          <ScrollView 
            style={styles.filterDropdownScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
          <TouchableOpacity 
            style={styles.filterDropdownItem} 
            onPress={() => handleSelect(null)}
          >
            <Text style={styles.filterDropdownItemText}>{t('search.all')}</Text>
          </TouchableOpacity>
            {options.map((option) => {
              const displayText = typeof option === 'string' ? option : option.translated;
              const optionValue = typeof option === 'string' ? option : option.original;
              
              
              return (
            <TouchableOpacity 
                  key={displayText}
              style={[
                styles.filterDropdownItem,
                    selectedValue === optionValue && styles.selectedFilterItem
              ]} 
                  onPress={() => handleSelect(optionValue)}
            >
                  <Text style={styles.filterDropdownItemText}>{displayText}</Text>
            </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
});

export default function SearchScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser } = useUser();
  
  
  // Функция для форматирования даты в формат DD.MM.YYYY
  const formatBirthDate = (dateString: string): string => {
    if (!dateString) return '';
    
    try {
      let day, month, year;
      
      // Проверяем формат YYYY-MM-DD (из базы данных)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [yearStr, monthStr, dayStr] = dateString.split('-');
        year = parseInt(yearStr);
        month = parseInt(monthStr);
        day = parseInt(dayStr);
      }
      // Проверяем формат DD.MM.YYYY (старый формат)
      else if (dateString.includes('.')) {
        [day, month, year] = dateString.split('.').map(Number);
      }
      else {
        return '';
      }
      
      if (!day || !month || !year) {
        return '';
      }
      
      // Форматируем в нужный формат DD.MM.YYYY
      const formattedDay = day.toString().padStart(2, '0');
      const formattedMonth = month.toString().padStart(2, '0');
      return `${formattedDay}.${formattedMonth}.${year}`;
    } catch (error) {
      return '';
    }
  };
  
  // Состояния для фильтрации и поиска
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMinHeight, setSelectedMinHeight] = useState<string | null>(null);
  const [selectedMinWeight, setSelectedMinWeight] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // Состояние для отслеживания открытых фильтров
  const [openFilters, setOpenFilters] = useState<Set<string>>(new Set());
  
  // Функция для открытия фильтра (закрывает все остальные)
  const openFilter = useCallback((filterName: string) => {
    setOpenFilters(new Set([filterName]));
    setActiveFilter(filterName);
  }, []);
  
  // Функция для закрытия фильтра
  const closeFilter = useCallback((filterName: string) => {
    setOpenFilters(prev => {
      const newSet = new Set(prev);
      newSet.delete(filterName);
      return newSet;
    });
    setActiveFilter(null);
  }, []);
  
  // Функция для проверки, открыт ли фильтр
  const isFilterOpen = useCallback((filterName: string) => {
    return openFilters.has(filterName);
  }, [openFilters]);
  
  // Функция для переключения фильтра (открывает один, закрывает остальные)
  const toggleFilter = useCallback((filterName: string) => {
    if (openFilters.has(filterName)) {
      // Если фильтр уже открыт, закрываем его
      closeFilter(filterName);
    } else {
      // Если фильтр закрыт, открываем его и закрываем все остальные
      openFilter(filterName);
    }
  }, [openFilters, openFilter, closeFilter]);

  // Загрузка пользователя и данных
  useEffect(() => {
    const loadData = async () => {
      try {
        // Принудительно применяем шрифт Gilroy
        forceGilroyFont();
        
        // Используем пользователя из UserContext
        if (!currentUser) {
          console.log('🔍 Поиск: Пользователь не найден, перенаправляем на логин');
          router.replace('/login');
          return;
        }


        // Очищаем кеш для принудительной перезагрузки рейтингов
        const { clearAllPlayersCache } = await import('../utils/playerStorage');
        await clearAllPlayersCache();
        
        // Загрузка игроков
        const allPlayers = await loadPlayers();
        
        // Администратор видит всех пользователей, обычные пользователи - только игроков и администраторов
        const filteredPlayers = currentUser.status === 'admin' 
          ? allPlayers // Администратор видит всех
          : allPlayers.filter(player => 
              player.status === 'player' || 
              player.status === 'admin'
            );
        
        setPlayers(filteredPlayers);
      } catch (error) {
        console.error('❌ Ошибка загрузки поиска:', error);
        router.replace('/login');
      } finally {
        await SplashScreen.hideAsync();
        setLoading(false);
      }
    };

    // Запускаем загрузку только если currentUser определен и не null
    if (currentUser !== undefined && currentUser !== null) {
      loadData();
    } else if (currentUser === null) {
      // Если currentUser явно null, перенаправляем на логин
      router.replace('/login');
    }
  }, [router, currentUser]);

  // Устанавливаем currentScreen при фокусе на экране поиска
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('search');
      console.log('🔍 ПОИСК: Устанавливаем currentScreen = search');
      return () => {
        setCurrentScreen(null);
        console.log('🔍 ПОИСК: Устанавливаем currentScreen = null');
      };
    }, [setCurrentScreen])
  );

  // Мемоизированные фильтры
  const countries = useMemo(() => {
    const rawCountries = Array.from(new Set(players.map(p => p.country).filter((country): country is string => Boolean(country))));
    
    // Создаем массив стран с переводами
    const countriesWithTranslations = rawCountries.map(country => {
      // Пытаемся найти перевод в секции countries
      const translated = t(`profile.countries.${country}`);
      
      // Если перевод не найден, используем оригинальное название
      const displayName = translated !== `profile.countries.${country}` ? translated : country;
      
      return {
        original: country,
        translated: displayName
      };
    });
    
    return countriesWithTranslations.sort((a, b) => a.translated.localeCompare(b.translated));
  }, [players, t, language]);

  const hands = useMemo(() => [t('search.left'), t('search.right')], [t]);

  const positions = useMemo(() => {
    const rawPositions = Array.from(new Set(players.map(p => p.position).filter((position): position is string => Boolean(position))));
    
    
    // Создаем группы позиций для объединения дублей
    const positionGroups = {
      'winger': ['Крайний нападающий', 'Край', 'Winger', 'winger', 'WINGER'],
      'center': ['Центральный нападающий', 'Центр', 'Center', 'center', 'CENTER'],
      'defender': ['Защитник', 'Defender', 'defender', 'DEFENDER'],
      'goalie': ['Вратарь', 'Goalie', 'goalie', 'GOALIE']
    };
    
    // Создаем массив уникальных групп позиций
    const uniqueGroups = Object.entries(positionGroups).map(([groupKey, variants]) => {
      // Проверяем, есть ли хотя бы один игрок с любой из позиций в группе
      const hasPlayers = variants.some(variant => rawPositions.includes(variant));
      
      if (!hasPlayers) return null;
      
      // Находим первую доступную позицию из группы, предпочитая полные названия
      const firstAvailable = variants.find(variant => rawPositions.includes(variant)) || variants[0];
      
      // Выбираем приоритетный ключ для группы
      let originalKey = firstAvailable;
      
      // Приоритет: полные русские названия > сокращенные русские > английские
      if (groupKey === 'winger') {
        if (rawPositions.includes('Крайний нападающий')) {
          originalKey = 'Крайний нападающий';
        } else if (rawPositions.includes('Край')) {
          originalKey = 'Край';
        } else if (rawPositions.includes('Winger')) {
          originalKey = 'Winger';
        }
      } else if (groupKey === 'center') {
        if (rawPositions.includes('Центральный нападающий')) {
          originalKey = 'Центральный нападающий';
        } else if (rawPositions.includes('Центр')) {
          originalKey = 'Центр';
        } else if (rawPositions.includes('Center')) {
          originalKey = 'Center';
        }
      } else if (groupKey === 'defender') {
        if (rawPositions.includes('Защитник')) {
          originalKey = 'Защитник';
        } else if (rawPositions.includes('Defender')) {
          originalKey = 'Defender';
        }
      } else if (groupKey === 'goalie') {
        if (rawPositions.includes('Вратарь')) {
          originalKey = 'Вратарь';
        } else if (rawPositions.includes('Goalie')) {
          originalKey = 'Goalie';
        }
      }
      
      let translated = '';
      switch (groupKey) {
        case 'winger':
          translated = t('winger');
          // Если перевод не найден, используем правильное название в зависимости от языка
          if (translated === 'winger') {
            translated = language === 'en' ? 'Winger' : 'Крайний нападающий';
          }
          break;
        case 'center':
          translated = t('center');
          // Если перевод не найден, используем правильное название в зависимости от языка
          if (translated === 'center') {
            translated = language === 'en' ? 'Center' : 'Центральный нападающий';
          }
          break;
        case 'defender':
          translated = t('defender');
          // Если перевод не найден, используем правильное название в зависимости от языка
          if (translated === 'defender') {
            translated = language === 'en' ? 'Defender' : 'Защитник';
          }
          break;
        case 'goalie':
          translated = t('goalie');
          // Если перевод не найден, используем правильное название в зависимости от языка
          if (translated === 'goalie' || translated === 'Translation missing for key: goalie in language: ru') {
            translated = language === 'en' ? 'Goalie' : 'Вратарь';
          }
          break;
        default:
          translated = firstAvailable;
      }
      
      // Делаем первую букву заглавной
      translated = translated.charAt(0).toUpperCase() + translated.slice(1).toLowerCase();
      
      
      return { 
        original: originalKey, // Используем правильный ключ для группы
        translated,
        group: groupKey,
        variants // Все варианты позиций в группе
      };
    }).filter(Boolean);
    
    return uniqueGroups.sort((a, b) => (a?.translated || '').localeCompare(b?.translated || ''));
  }, [players, t, language]);

  const years = useMemo(() => 
    Array.from(new Set(
      players
        .map(p => p.birthDate ? p.birthDate.split('-')[0] : null)
        .filter((year): year is string => Boolean(year))
    )).sort(), 
    [players]
  );

  const heights = useMemo(() => 
    Array.from(new Set(
      players
        .map(p => p.height ? Math.round(parseInt(p.height) / 10) * 10 : null)
        .filter(Boolean)
    )).sort((a, b) => (a || 0) - (b || 0)).map(h => `${h} ${language === 'en' ? 'cm' : 'см'}`), 
    [players, language]
  );

  const weights = useMemo(() => 
    Array.from(new Set(
      players
        .map(p => p.weight ? Math.round(parseInt(p.weight) / 10) * 10 : null)
        .filter(Boolean)
    )).sort((a, b) => (a || 0) - (b || 0)).map(w => `${w} ${language === 'en' ? 'kg' : 'кг'}`), 
    [players, language]
  );

  // Фильтрация и сортировка игроков
  const filteredPlayers = useMemo(() => {
    const filtered = players.filter(player => {
      // Администратор всегда виден
      if (player.status === 'admin') return true;
      
      // Если текущий пользователь - администратор, показываем всех
      if (currentUser?.status === 'admin') return true;

      // Фильтр по поиску
      const matchesSearch = !searchQuery || 
        player.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Фильтр по стране
      const matchesCountry = !selectedCountry || player.country === selectedCountry;
      
      // Фильтр по хвату
      const matchesHand = !selectedHand || 
        (selectedHand === t('search.left') && player.grip === 'Левый') || 
        (selectedHand === t('search.right') && player.grip === 'Правый');
      
      // Фильтр по позиции
      const matchesPosition = !selectedPosition || (() => {
        // Находим группу позиций для выбранной позиции
        const selectedGroup = positions.find(p => p?.original === selectedPosition);
        if (selectedGroup && selectedGroup.variants) {
          return selectedGroup.variants.includes(player.position);
        }
        
        // Если позиция не найдена в группах, используем точное совпадение
        return player.position === selectedPosition;
      })();
      
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

    // Сортируем по рейтингу активности (убывание)
    const sorted = filtered.sort((a, b) => {
      const ratingA = a.activityRating || 0;
      const ratingB = b.activityRating || 0;
      return ratingB - ratingA;
    });
    
    
    return sorted;
  }, [players, searchQuery, selectedCountry, selectedHand, selectedPosition, selectedYear, selectedMinHeight, selectedMinWeight, currentUser]);

  // Key extractor для FlatList
  const keyExtractor = useCallback((item: Player) => item.id.toString(), []);

  // Empty component для FlatList
  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t('search.noPlayersFound')}</Text>
    </View>
  ), [t]);

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
            fadeDuration={0}
            resizeMode="cover"
          />
        </View>
        <View style={styles.playerDetails}>
          <View style={styles.playerNameRow}>
            <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
            {item.activityRating !== undefined && item.activityRating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#AA3333" />
                <Text style={styles.ratingText}>{item.activityRating}</Text>
              </View>
            )}
          </View>
          {item.status !== 'admin' && (
            <Text style={styles.playerInfo} numberOfLines={2} ellipsizeMode="tail">
              {item.country ? t(`profile.countries.${item.country}`) : item.country} | {item.position ? (t(`profile.${item.position}`) || item.position) : ''} | {formatBirthDate(item.birthDate || '')} | {item.height} {t('profile.cm')} | {item.weight} {t('profile.kg')} | {(() => {
                const grip = item.grip?.toLowerCase();
                if (grip === 'левый' || grip === 'left') return t('profile.left');
                if (grip === 'правый' || grip === 'right') return t('profile.right');
                return grip ? (t(`profile.${grip}`) || item.grip) : '';
              })()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [router, t]);

  // Показываем загрузку пока проверяем авторизацию
  // Если пользователь не авторизован, показываем загрузку или перенаправляем
  if (!currentUser) {
    if (currentUser === null) {
      // Пользователь явно не авторизован, перенаправляем
      return null;
    } else {
      // currentUser === undefined, еще загружается
      return (
        <View style={styles.container}>
          <ImageBackground
            source={require('../assets/images/led.jpg')}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#fa2f40" />
            </View>
          </ImageBackground>
        </View>
      );
    }
  }

  // Если загружаем данные
  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require('../assets/images/led.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fa2f40" />
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Полупрозрачный фон льда */}
      <ImageBackground
        source={require('../assets/images/led.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Заголовок страницы */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t('search.title')}</Text>
          </View>
          
          {/* Общий контейнер для поиска и фильтров */}
          <View style={styles.searchSection}>
            {/* Поле поиска */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('search.placeholder')}
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Контейнер фильтров */}
            <View style={styles.filtersContainer}>
            <FilterButton 
              title={t('search.country')} 
              options={countries} 
              selectedValue={selectedCountry}
              onSelect={(value) => {
                setSelectedCountry(value);
                setActiveFilter(value ? 'country' : null);
              }}
              isActive={activeFilter === 'country'}
              filterName="country"
              isOpen={isFilterOpen('country')}
              onToggle={toggleFilter}
              countries={countries}
            />
            <FilterButton 
              title={t('search.grip')} 
              options={hands} 
              selectedValue={selectedHand}
              onSelect={(value) => {
                setSelectedHand(value);
                setActiveFilter(value ? 'grip' : null);
              }}
              isActive={activeFilter === 'grip'}
              filterName="grip"
              isOpen={isFilterOpen('grip')}
              onToggle={toggleFilter}
            />
            <FilterButton 
              title={t('search.position')} 
              options={positions} 
              selectedValue={selectedPosition}
              onSelect={(value) => {
                setSelectedPosition(value);
                setActiveFilter(value ? 'position' : null);
              }}
              isActive={activeFilter === 'position'}
              filterName="position"
              isOpen={isFilterOpen('position')}
              onToggle={toggleFilter}
              positions={positions}
            />
            <FilterButton 
              title={t('search.year')} 
              options={years} 
              selectedValue={selectedYear}
              onSelect={(value) => {
                setSelectedYear(value);
                setActiveFilter(value ? 'year' : null);
              }}
              isActive={activeFilter === 'year'}
              filterName="year"
              isOpen={isFilterOpen('year')}
              onToggle={toggleFilter}
            />
            <FilterButton 
              title={t('search.heightFrom')} 
              options={heights} 
              selectedValue={selectedMinHeight}
              onSelect={(value) => {
                setSelectedMinHeight(value);
                setActiveFilter(value ? 'height' : null);
              }}
              isActive={activeFilter === 'height'}
              filterName="height"
              isOpen={isFilterOpen('height')}
              onToggle={toggleFilter}
            />
            <FilterButton 
              title={t('search.weightFrom')} 
              options={weights} 
              selectedValue={selectedMinWeight}
              onSelect={(value) => {
                setSelectedMinWeight(value);
                setActiveFilter(value ? 'weight' : null);
              }}
              isActive={activeFilter === 'weight'}
              filterName="weight"
              isOpen={isFilterOpen('weight')}
              onToggle={toggleFilter}
            />
            </View>
          </View>

          {/* Список игроков */}
          <FlatList
            data={filteredPlayers}
            renderItem={renderPlayerItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmptyComponent}
            contentContainerStyle={styles.playersList}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            windowSize={7}
            initialNumToRender={8}
            getItemLayout={(data, index) => ({
              length: 80, // примерная высота элемента
              offset: 80 * index,
              index,
            })}
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
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    flex: 1,
  },
  searchSection: {
    position: 'absolute',
    top: 41, // Под заголовком
    left: 0,
    right: 0,
    zIndex: 1001,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: '#fa2f40',
    height: 40,
    width: '100%',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    height: 24,
    textAlignVertical: 'center',
    paddingVertical: 0,
    fontFamily: 'Gilroy-Regular',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginTop: 8,
    marginBottom: 0,
    zIndex: 1000,
    elevation: 1000,
    minHeight: 80,
    position: 'relative',
  },
  filterContainer: {
    width: '30%',
    marginBottom: 10,
    zIndex: 1000,
    elevation: 1000,
    position: 'relative',
  },
  filterContainerActive: {
    zIndex: 10000,
    elevation: 10000,
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: '#fa2f40',
    borderColor: '#fa2f40',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
  },
  filterButtonIcon: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 10,
    marginTop: 4,
    zIndex: 10000,
    elevation: 10000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterDropdownActive: {
    zIndex: 10001,
    elevation: 10001,
  },
  filterDropdownScroll: {
    maxHeight: 180,
  },
  filterDropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterDropdownItemText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
  },
  selectedFilterItem: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  playersList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
    elevation: 1,
    marginTop: 200, // Отступ для поиска и фильтров
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  ratingText: {
    color: '#AA3333',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 2,
  },
  playerInfo: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
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
    fontFamily: 'Gilroy-Regular',
  },
});


