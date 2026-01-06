import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ImageBackground,
    Dimensions,
    Alert,
    ScrollView,
    Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CachedAvatar from '../components/CachedAvatar';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { loadPlayers, Player, loadCurrentUser, searchTeams, PlayerTeam, isGoalkeeperPosition } from '../utils/playerStorage';
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import OptimizedBackground from '../components/OptimizedBackground';
import { useScreenContext } from '../contexts/ScreenContext';
import { useUser } from '../contexts/UserContext';
import { forceGilroyFont } from '../utils/forceGilroyFont';
import CachedBackground from '../components/CachedBackground';
import { safeHideSplashScreen } from '../utils/splashScreenUtils';

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
  countries,
  teams,
  disabled = false
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
  countries?: any[],
  teams?: any[],
  disabled?: boolean
}) => {
  const { t, language } = useLanguage();
  const [dropdownOpacity] = useState(new Animated.Value(0));
  const [dropdownTranslateY] = useState(new Animated.Value(-20));

  const toggleDropdown = useCallback(() => {
    onToggle(filterName);
  }, [onToggle, filterName]);

  const handleSelect = useCallback((value: string | null) => {
    onSelect(value);
    // Плавно закрываем dropdown перед вызовом onToggle
    Animated.parallel([
      Animated.timing(dropdownOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dropdownTranslateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      onToggle(filterName); // Закрываем фильтр после завершения анимации
    });
  }, [onSelect, onToggle, filterName, dropdownOpacity, dropdownTranslateY]);

  // Анимация открытия/закрытия dropdown
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(dropdownOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dropdownTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(dropdownOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dropdownTranslateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isOpen, dropdownOpacity, dropdownTranslateY]);

  return (
    <View style={[styles.filterContainer, isActive && styles.filterContainerActive]}>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          (isActive || selectedValue) && styles.filterButtonActive,
          disabled && styles.filterButtonDisabled
        ]} 
        onPress={disabled ? undefined : toggleDropdown}
        disabled={disabled}
      >
        <Text style={[styles.filterButtonText, disabled && styles.filterButtonTextDisabled]}>
          {(() => {
            if (selectedValue) {
              // Для команд нужно найти название по ID
              if (title === t('search.team') && teams) {
                const teamMapping = teams.find(t => t.id === selectedValue);
                if (teamMapping) {
                  return teamMapping.name;
                }
                return selectedValue;
              }
              
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
              
              // Для роста и веса добавляем ">" перед числом
              const heightTitle = t('search.heightFrom');
              const weightTitle = t('search.weightFrom');
              if (title === heightTitle || title === weightTitle) {
                // Добавляем ">" только если selectedValue не пустой
                return `> ${selectedValue}`;
              }
              
              // Для PPG, SV%, GAA показываем значение как есть
              if (title === 'PPG' || title === 'SV%' || title === 'GAA') {
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
        <Animated.View style={[
          styles.filterDropdown, 
          isActive && styles.filterDropdownActive,
          {
            opacity: dropdownOpacity,
            transform: [{ translateY: dropdownTranslateY }],
          }
        ]}>
          <ScrollView 
            style={styles.filterDropdownScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
          {/* Добавляем "Все" только если его нет в опциях (для старых фильтров) */}
          {!options.some(opt => {
            const optValue = typeof opt === 'string' ? opt : opt.original;
            return optValue === null;
          }) && (
            <TouchableOpacity 
              style={styles.filterDropdownItem} 
              onPress={() => handleSelect(null)}
            >
              <Text style={styles.filterDropdownItemText}>{language === 'ru' ? 'Все' : 'All'}</Text>
            </TouchableOpacity>
          )}
            {options.map((option) => {
              const displayText = typeof option === 'string' ? option : option.translated;
              const optionValue = typeof option === 'string' ? option : option.original;
              
              // Для роста и веса добавляем ">" перед значением в dropdown
              const heightTitle = t('search.heightFrom');
              const weightTitle = t('search.weightFrom');
              const finalDisplayText = (title === heightTitle || title === weightTitle) 
                ? `> ${displayText}` 
                : displayText;
              
              return (
            <TouchableOpacity 
                  key={displayText}
              style={[
                styles.filterDropdownItem,
                    selectedValue === optionValue && styles.selectedFilterItem
              ]} 
                  onPress={() => handleSelect(optionValue)}
            >
                  <Text style={styles.filterDropdownItemText}>{finalDisplayText}</Text>
            </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
});

export default function SearchScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser, isUserLoading } = useUser();
  
  
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Debounce для поиска - обновляем фильтр с задержкой 300мс
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMinHeight, setSelectedMinHeight] = useState<string | null>(null);
  const [selectedMinWeight, setSelectedMinWeight] = useState<string | null>(null);
  const [selectedPPG, setSelectedPPG] = useState<string | null>(null);
  const [selectedSV, setSelectedSV] = useState<string | null>(null);
  const [selectedGAA, setSelectedGAA] = useState<string | null>(null);
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
          // Не вызываем router.replace здесь, так как это может вызвать ошибку навигации
          // Вместо этого просто возвращаемся
          return;
        }

        // Загрузка игроков (включая скрытые профили)
        // Принудительно обновляем данные, чтобы получить актуальную информацию о скрытых профилях
        const allPlayers = await loadPlayers(true); // forceRefresh = true для администраторов
        
        // Для администраторов показываем всех игроков (включая скрытые профили)
        // Для обычных пользователей фильтруем по статусу
        let filteredPlayers: Player[];
        if (currentUser.status === 'admin') {
          // Администратор видит всех (включая скрытые профили)
          filteredPlayers = allPlayers;
          console.log(`🔍 Админ: загружено ${allPlayers.length} игроков, из них скрытых: ${allPlayers.filter(p => p.is_hidden).length}`);
        } else {
          filteredPlayers = allPlayers.filter(player => 
            player.status === 'player' || 
            player.status === 'admin'
          );
        }
        
        setPlayers(filteredPlayers);
        
      } catch (error) {
        console.error('❌ Ошибка загрузки поиска:', error);
        // Не вызываем router.replace здесь, так как это может вызвать ошибку навигации
        // Вместо этого просто логируем ошибку
      } finally {
        await safeHideSplashScreen();
        setLoading(false);
      }
    };

    // Запускаем загрузку только если currentUser определен и не null
    if (currentUser !== undefined && currentUser !== null) {
      loadData();
    }
  }, [router, currentUser]);

  // Устанавливаем currentScreen при фокусе на экране поиска
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('search');
      // Обновляем список игроков при возврате на экран поиска
      if (currentUser) {
        const refreshData = async () => {
          try {
            const allPlayers = await loadPlayers(true); // forceRefresh = true
            let filteredPlayers: Player[];
            if (currentUser.status === 'admin') {
              filteredPlayers = allPlayers;
              console.log(`🔍 Админ: загружено ${allPlayers.length} игроков, из них скрытых: ${allPlayers.filter(p => p.is_hidden).length}`);
            } else {
              filteredPlayers = allPlayers.filter(player => 
                player.status === 'player' || 
                player.status === 'admin'
              );
            }
            setPlayers(filteredPlayers);
          } catch (error) {
            console.error('❌ Ошибка обновления списка игроков:', error);
          }
        };
        refreshData();
      }
      return () => {
        setCurrentScreen(null);
      };
    }, [setCurrentScreen, currentUser])
  );

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

  // Определяем, является ли выбранная позиция вратарем
  const isSelectedPositionGoalkeeper = useMemo(() => {
    if (!selectedPosition) return false;
    return isGoalkeeperPosition(selectedPosition);
  }, [selectedPosition]);

  // Определяем, активны ли фильтры
  const isPPGDisabled = useMemo(() => {
    // PPG неактивен, если выбрана позиция вратаря или выбран GAA/SV%
    return isSelectedPositionGoalkeeper || selectedGAA !== null || selectedSV !== null;
  }, [isSelectedPositionGoalkeeper, selectedGAA, selectedSV]);

  const isSVDisabled = useMemo(() => {
    // SV% неактивен, если выбран PPG или выбрана позиция не вратаря
    return selectedPPG !== null || (!isSelectedPositionGoalkeeper && selectedPosition !== null);
  }, [selectedPPG, isSelectedPositionGoalkeeper, selectedPosition]);

  const isGAADisabled = useMemo(() => {
    // GAA неактивен, если выбран PPG или выбрана позиция не вратаря
    return selectedPPG !== null || (!isSelectedPositionGoalkeeper && selectedPosition !== null);
  }, [selectedPPG, isSelectedPositionGoalkeeper, selectedPosition]);

  // Опции для фильтра PPG (показываем только если есть полевые игроки с PPG)
  const ppgOptions = useMemo(() => {
    const hasFieldPlayersWithPPG = players.some(p => {
      if (isGoalkeeperPosition(p.position)) return false;
      if (!p.goals || !p.assists || !p.games) return false;
      const gamesNum = parseInt(p.games) || 0;
      return gamesNum > 0;
    });
    
    if (!hasFieldPlayersWithPPG) return [];
    
    return [
      { translated: language === 'ru' ? 'Все' : 'All', original: null },
      { translated: '< 0.3', original: '< 0.3' },
      { translated: '> 0.3', original: '> 0.3' },
      { translated: '> 0.5', original: '> 0.5' },
      { translated: '> 0.8', original: '> 0.8' },
      { translated: '> 1', original: '> 1' },
      { translated: '> 1.3', original: '> 1.3' },
      { translated: '> 1.5', original: '> 1.5' },
      { translated: '> 2', original: '> 2' },
    ];
  }, [players, language]);

  // Опции для фильтра SV% (показываем только если есть вратари с SV%)
  const svOptions = useMemo(() => {
    const hasGoalkeepersWithSV = players.some(p => {
      if (!isGoalkeeperPosition(p.position)) return false;
      if (!p.shots || !p.saves) return false;
      const shotsNum = parseInt(p.shots) || 0;
      return shotsNum > 0;
    });
    
    if (!hasGoalkeepersWithSV) return [];
    
    return [
      { translated: language === 'ru' ? 'Все' : 'All', original: null },
      { translated: '< 0.800', original: '< 0.800' },
      { translated: '> 0.800', original: '> 0.800' },
      { translated: '> 0.850', original: '> 0.850' },
      { translated: '> 0.900', original: '> 0.900' },
      { translated: '> 0.920', original: '> 0.920' },
      { translated: '> 0.930', original: '> 0.930' },
      { translated: '> 0.935', original: '> 0.935' },
    ];
  }, [players, t]);

  // Опции для фильтра GAA (показываем только если есть вратари с GAA)
  const gaaOptions = useMemo(() => {
    const hasGoalkeepersWithGAA = players.some(p => {
      if (!isGoalkeeperPosition(p.position)) return false;
      if (!p.minutes || !p.shots || !p.saves) return false;
      const minutesNum = parseInt(p.minutes) || 0;
      return minutesNum > 0;
    });
    
    if (!hasGoalkeepersWithGAA) return [];
    
    return [
      { translated: language === 'ru' ? 'Все' : 'All', original: null },
      { translated: '> 4.0', original: '> 4.0' },
      { translated: '< 4.0', original: '< 4.0' },
      { translated: '< 3.5', original: '< 3.5' },
      { translated: '< 3.0', original: '< 3.0' },
      { translated: '< 2.5', original: '< 2.5' },
      { translated: '< 2.0', original: '< 2.0' },
    ];
  }, [players, language]);
  
  // Универсальная функция фильтрации игроков с возможностью игнорировать отдельные фильтры
  const filterPlayers = useCallback((
    options?: {
      ignoreCountry?: boolean;
      ignoreTeam?: boolean;
      ignoreHand?: boolean;
      ignorePosition?: boolean;
      ignoreYear?: boolean;
      ignoreHeight?: boolean;
      ignoreWeight?: boolean;
      ignorePPG?: boolean;
      ignoreSV?: boolean;
      ignoreGAA?: boolean;
    }
  ) => {
    const {
      ignoreCountry = false,
      ignoreTeam = false,
      ignoreHand = false,
      ignorePosition = false,
      ignoreYear = false,
      ignoreHeight = false,
      ignoreWeight = false,
      ignorePPG = false,
      ignoreSV = false,
      ignoreGAA = false,
    } = options || {};

    return players.filter(player => {
      // Исключаем скрытые профили (кроме текущего пользователя, если он скрыт, и администраторов)
      // Администраторы видят все скрытые профили
      if (player.is_hidden) {
        // Если это скрытый профиль
        if (currentUser?.status === 'admin') {
          // Администраторы видят все скрытые профили
          // Продолжаем фильтрацию дальше
        } else if (currentUser && player.id === currentUser.id) {
          // Владелец видит свой скрытый профиль
          // Продолжаем фильтрацию дальше
        } else {
          // Остальные пользователи не видят скрытые профили
          return false;
        }
      }
      
      // Фильтр по поиску (используем debounced версию для производительности)
      const matchesSearch = !debouncedSearchQuery || 
        player.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      
      // Фильтр по стране
      const matchesCountry = ignoreCountry || !selectedCountry || player.country === selectedCountry;
      
      // Фильтр по команде
      const matchesTeam = ignoreTeam || !selectedTeam || (() => {
        if (!player.teams || player.teams.length === 0) {
          return false;
        }
        return player.teams.some(team => team.teamId === selectedTeam);
      })();
      
      // Фильтр по хвату
      const matchesHand = ignoreHand || !selectedHand || 
        (selectedHand === t('search.left') && player.grip === 'Левый') || 
        (selectedHand === t('search.right') && player.grip === 'Правый');
      
      // Фильтр по позиции
      const matchesPosition = ignorePosition || !selectedPosition || (() => {
        // Находим группу позиций для выбранной позиции
        const selectedGroup = positions.find(p => p?.original === selectedPosition);
        if (selectedGroup && selectedGroup.variants) {
          return selectedGroup.variants.includes(player.position);
        }
        
        // Если позиция не найдена в группах, используем точное совпадение
        return player.position === selectedPosition;
      })();
      
      // Фильтр по году
      const matchesYear = ignoreYear || !selectedYear || 
        (player.birthDate && player.birthDate.startsWith(selectedYear));
      
      // Фильтр по росту (от)
      const matchesHeight = ignoreHeight || !selectedMinHeight || 
        (player.height && parseInt(player.height) >= parseInt(selectedMinHeight));
      
      // Фильтр по весу (от)
      const matchesWeight = ignoreWeight || !selectedMinWeight || 
        (player.weight && parseInt(player.weight) >= parseInt(selectedMinWeight));
      
      // Определяем, является ли игрок вратарем
      const isGoalkeeper = isGoalkeeperPosition(player.position);
      
      // Если выбран PPG, исключаем вратарей из результатов
      if (!ignorePPG && selectedPPG && isGoalkeeper) {
        return false;
      }
      
      // Если выбран GAA или SV%, исключаем полевых игроков из результатов
      if (!ignoreGAA && !ignoreSV && (selectedGAA || selectedSV) && !isGoalkeeper) {
        return false;
      }
      
      // Фильтр по PPG (для полевых игроков)
      const matchesPPG = ignorePPG || !selectedPPG || (() => {
        // Вратари уже исключены выше
        if (!player.goals || !player.assists || !player.games) return false;
        const goalsNum = parseInt(player.goals) || 0;
        const assistsNum = parseInt(player.assists) || 0;
        const gamesNum = parseInt(player.games) || 0;
        if (gamesNum === 0) return false;
        const ppg = (goalsNum + assistsNum) / gamesNum;
        
        if (selectedPPG === '< 0.3') return ppg < 0.3;
        if (selectedPPG === '> 0.3') return ppg > 0.3;
        if (selectedPPG === '> 0.5') return ppg > 0.5;
        if (selectedPPG === '> 0.8') return ppg > 0.8;
        if (selectedPPG === '> 1') return ppg > 1;
        if (selectedPPG === '> 1.3') return ppg > 1.3;
        if (selectedPPG === '> 1.5') return ppg > 1.5;
        if (selectedPPG === '> 2') return ppg > 2;
        return true;
      })();
      
      // Фильтр по SV% (для вратарей)
      const matchesSV = ignoreSV || !selectedSV || (() => {
        // Полевые игроки уже исключены выше
        if (!player.shots || !player.saves) return false;
        const shotsNum = parseInt(player.shots) || 0;
        const savesNum = parseInt(player.saves) || 0;
        if (shotsNum === 0) return false;
        const sv = savesNum / shotsNum;
        
        if (selectedSV === '< 0.800') return sv < 0.800;
        if (selectedSV === '> 0.800') return sv > 0.800;
        if (selectedSV === '> 0.850') return sv > 0.850;
        if (selectedSV === '> 0.900') return sv > 0.900;
        if (selectedSV === '> 0.920') return sv > 0.920;
        if (selectedSV === '> 0.930') return sv > 0.930;
        if (selectedSV === '> 0.935') return sv > 0.935;
        return true;
      })();
      
      // Фильтр по GAA (для вратарей)
      const matchesGAA = ignoreGAA || !selectedGAA || (() => {
        if (!isGoalkeeperPosition(player.position)) return false; // Полевые игроки не имеют GAA
        if (!player.minutes || !player.shots || !player.saves) return false;
        const minutesNum = parseInt(player.minutes) || 0;
        const shotsNum = parseInt(player.shots) || 0;
        const savesNum = parseInt(player.saves) || 0;
        if (minutesNum === 0) return false;
        const goalsAgainst = shotsNum - savesNum;
        const gaa = (goalsAgainst * 60) / minutesNum;
        
        if (selectedGAA === '> 4.0') return gaa > 4.0;
        if (selectedGAA === '< 4.0') return gaa < 4.0;
        if (selectedGAA === '< 3.5') return gaa < 3.5;
        if (selectedGAA === '< 3.0') return gaa < 3.0;
        if (selectedGAA === '< 2.5') return gaa < 2.5;
        if (selectedGAA === '< 2.0') return gaa < 2.0;
        return true;
      })();
      
      const matches = matchesSearch && 
             matchesCountry &&
             matchesTeam &&
             matchesHand && 
             matchesPosition && 
             matchesYear &&
             matchesHeight &&
             matchesWeight &&
             matchesPPG &&
             matchesSV &&
             matchesGAA;
      
      
      return matches;
    });
  }, [
    players,
    debouncedSearchQuery,
    selectedCountry,
    selectedTeam,
    selectedHand,
    selectedPosition,
    selectedYear,
    selectedMinHeight,
    selectedMinWeight,
    selectedPPG,
    selectedSV,
    selectedGAA,
    currentUser,
    t,
    positions,
  ]);

  // Фильтрация и сортировка игроков
  const filteredPlayers = useMemo(() => {
    const filtered = filterPlayers();

    // *** НОВЫЙ ПОРЯДОК ДЛЯ СПИСКА ПОИСКА ***
    // 1) сначала показываем НОВИЧКОВ (созданных за последние 2 дня), самые новые СВЕРХУ
    // 2) потом всех остальных, отсортированных по рейтингу активности (убывание)
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const newcomers: Player[] = [];
    const others: Player[] = [];

    filtered.forEach(player => {
      if (player.createdAt) {
        const createdTime = new Date(player.createdAt).getTime();
        if (!isNaN(createdTime) && (now - createdTime) < TWO_DAYS_MS) {
          newcomers.push(player);
          return;
        }
      }
      others.push(player);
    });

    // Новички: самые новые сверху
    newcomers.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime; // более новые раньше
    });

    // Остальные: по рейтингу активности (убывание)
    others.sort((a, b) => {
      const ratingA = a.activityRating || 0;
      const ratingB = b.activityRating || 0;
      return ratingB - ratingA;
    });
    
    return [...newcomers, ...others];
  }, [players, debouncedSearchQuery, selectedCountry, selectedTeam, selectedHand, selectedPosition, selectedYear, selectedMinHeight, selectedMinWeight, selectedPPG, selectedSV, selectedGAA, currentUser, t]);
  
  // Мемоизированные фильтры, зависящие от игроков, отфильтрованных по другим фильтрам (свой фильтр игнорируем)
  const countries = useMemo(() => {
    const basePlayers = filterPlayers({ ignoreCountry: true });
    const rawCountries = Array.from(
      new Set(
        basePlayers
          .map(p => p.country)
          .filter((country): country is string => Boolean(country))
      )
    );
    
    const countriesWithTranslations = rawCountries.map(country => {
      const translated = t(`profile.countries.${country}`);
      const displayName = translated !== `profile.countries.${country}` ? translated : country;
      
      return {
        original: country,
        translated: displayName
      };
    });
    
    return countriesWithTranslations.sort((a, b) => a.translated.localeCompare(b.translated));
  }, [filterPlayers, t, language]);
  
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          filterPlayers({ ignoreYear: true })
            .map(p => (p.birthDate ? p.birthDate.split('-')[0] : null))
            .filter((year): year is string => Boolean(year))
        )
      ).sort(),
    [filterPlayers]
  );
  
  const heights = useMemo(
    () =>
      Array.from(
        new Set(
          filterPlayers({ ignoreHeight: true })
            .map(p => (p.height ? Math.round(parseInt(p.height) / 10) * 10 : null))
            .filter(Boolean)
        )
      )
        .sort((a, b) => (a || 0) - (b || 0))
        .map(h => `${h} ${language === 'en' ? 'cm' : 'см'}`),
    [filterPlayers, language]
  );
  
  const weights = useMemo(
    () =>
      Array.from(
        new Set(
          filterPlayers({ ignoreWeight: true })
            .map(p => (p.weight ? Math.round(parseInt(p.weight) / 10) * 10 : null))
            .filter(Boolean)
        )
      )
        .sort((a, b) => (a || 0) - (b || 0))
        .map(w => `${w} ${language === 'en' ? 'kg' : 'кг'}`),
    [filterPlayers, language]
  );
  
  // Команды для фильтра — только из уже отфильтрованных игроков
  const teamsFromPlayers = useMemo(() => {
    const basePlayers = filterPlayers({ ignoreTeam: true });
    const uniqueTeams = new Map<string, { id: string; name: string; name_ru?: string }>();
    
    basePlayers.forEach(player => {
      if (player.teams && player.teams.length > 0) {
        player.teams.forEach(team => {
          if (team.teamId && !uniqueTeams.has(team.teamId)) {
            uniqueTeams.set(team.teamId, {
              id: team.teamId,
              name: language === 'ru' ? (team.teamNameRu || team.teamName) : team.teamName,
              name_ru: team.teamNameRu
            });
          }
        });
      }
    });
    
    return Array.from(uniqueTeams.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filterPlayers, language]);

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
      null; // Убираем require, будем использовать fallback в CachedAvatar

    // Определяем стиль контура в зависимости от статуса
    const photoContainerStyle = 
      item.status === 'coach' 
        ? styles.coachPhotoContainer 
        : styles.playerPhotoContainer;

    return (
      <TouchableOpacity 
        onPress={() => router.push({ 
          pathname: '/player/[id]', 
          params: { id: item.id, returnTo: 'search' } 
        })}
        activeOpacity={0.7}
      >
        <View style={styles.playerGradientShadow}>
          <BlurView
            intensity={20}
            tint="dark"
            style={styles.playerItemBlur}
          >
            <View style={styles.playerItem}>
            <View style={photoContainerStyle}>
              <CachedAvatar 
                playerId={item.id}
                fallbackAvatarUrl={playerPhoto}
                size={60}
                style={styles.playerPhoto}
                status={item.status}
              />
            </View>
            <View style={styles.playerDetails}>
              <View style={styles.playerNameRow}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.createdAt && (Date.now() - new Date(item.createdAt).getTime()) < 2 * 24 * 60 * 60 * 1000 && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
                {item.is_hidden && currentUser?.status === 'admin' && (
                  <Ionicons 
                    name="eye-off-outline" 
                    size={18} 
                    color="#fa2f40" 
                    style={{ marginLeft: 8 }}
                  />
                )}
                {item.activityRating !== undefined && item.activityRating > 0 && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={11} color="#AA3333" />
                    <Text style={styles.ratingText}>{Math.round(item.activityRating)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.playerInfo}>
                {(() => {
                  // Для администратора показываем только "Администратор"
                  if (item.status === 'admin') {
                    return language === 'en' ? 'Administrator' : 'Администратор';
                  }
                  
                  const parts: string[] = [];
                  
                  // Позиция
                  if (item.position) {
                    parts.push(t(`profile.positions.${item.position}`) || item.position);
                  }
                  
                  // Страна
                  if (item.country) {
                    const countryTranslation = t(`profile.countries.${item.country}`);
                    const countryDisplay = countryTranslation !== `profile.countries.${item.country}` 
                      ? countryTranslation 
                      : item.country;
                    parts.push(countryDisplay);
                  }
                  
                  // Год рождения
                  if (item.birthDate) {
                    const birthYear = new Date(item.birthDate).getFullYear();
                    if (!isNaN(birthYear)) {
                      parts.push(birthYear.toString());
                    }
                  } else if (item.age) {
                    const currentYear = new Date().getFullYear();
                    const birthYear = currentYear - item.age;
                    parts.push(birthYear.toString());
                  }
                  
                  // Хват
                  if (item.grip) {
                    let gripDisplay = item.grip;
                    if (item.grip === 'Левый' || item.grip === 'Left') {
                      gripDisplay = t('search.left');
                    } else if (item.grip === 'Правый' || item.grip === 'Right') {
                      gripDisplay = t('search.right');
                    }
                    parts.push(gripDisplay);
                  }
                  
                  // Рост
                  if (item.height && item.height.trim() !== '' && item.height !== '0') {
                    parts.push(`${item.height} ${t('cm')}`);
                  }
                  
                  // Вес
                  if (item.weight && item.weight.trim() !== '' && item.weight !== '0') {
                    parts.push(`${item.weight} ${t('kg')}`);
                  }
                  
                  // Определяем, является ли игрок вратарем
                  const isGoalkeeper = isGoalkeeperPosition(item.position);
                  
                  // Для вратарей показываем SV% и GAA (если измерены)
                  if (isGoalkeeper) {
                    // SV%
                    if (item.shots && item.saves) {
                      const shotsNum = parseInt(item.shots) || 0;
                      const savesNum = parseInt(item.saves) || 0;
                      if (shotsNum > 0) {
                        const sv = (savesNum / shotsNum).toFixed(3);
                        parts.push(`SV%: ${sv}`);
                      }
                    }
                    
                    // GAA
                    if (item.minutes && item.shots && item.saves) {
                      const minutesNum = parseInt(item.minutes) || 0;
                      const shotsNum = parseInt(item.shots) || 0;
                      const savesNum = parseInt(item.saves) || 0;
                      if (minutesNum > 0) {
                        const goalsAgainst = shotsNum - savesNum;
                        const gaa = ((goalsAgainst * 60) / minutesNum).toFixed(2);
                        parts.push(`GAA: ${gaa}`);
                      }
                    }
                  } else {
                    // Для полевых игроков показываем PPG (если измерен)
                    if (item.goals && item.assists && item.games) {
                      const goalsNum = parseInt(item.goals) || 0;
                      const assistsNum = parseInt(item.assists) || 0;
                      const gamesNum = parseInt(item.games) || 0;
                      if (gamesNum > 0) {
                        const ppg = ((goalsNum + assistsNum) / gamesNum).toFixed(2);
                        parts.push(`PPG: ${ppg}`);
                      }
                    }
                  }
                  
                  return parts.join(' • ');
                })()}
              </Text>
            </View>
          </View>
          </BlurView>
        </View>
      </TouchableOpacity>
    );
  }, [router, t, currentUser]);

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
          <CachedBackground
            source={require('../assets/images/led.jpg')}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <View style={styles.overlayLoading}>
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          </CachedBackground>
        </View>
      );
    }
  }

  // Если загружаем данные
  if (loading) {
    return (
      <View style={styles.container}>
        <CachedBackground
          source={require('../assets/images/led.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlayLoading}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </CachedBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Полупрозрачный фон льда */}
      <CachedBackground
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
          <BlurView
            intensity={20}
            tint="dark"
            style={styles.searchSectionBlur}
          >
            <View style={styles.searchSection}>
              {/* Полупрозрачный оверлей */}
              <View style={styles.searchSectionOverlay}>
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
              {/* Первая строка: Страна, Команда, Позиция */}
              <View style={styles.filterRow}>
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
                  title={t('search.team')} 
                  options={teamsFromPlayers.map(team => ({
                    translated: language === 'ru' ? (team.name_ru || team.name) : team.name,
                    original: team.id
                  }))} 
                  selectedValue={selectedTeam}
                  onSelect={(value) => {
                    setSelectedTeam(value);
                    setActiveFilter(value ? 'team' : null);
                  }}
                  isActive={activeFilter === 'team'}
                  filterName="team"
                  isOpen={isFilterOpen('team')}
                  onToggle={toggleFilter}
                  teams={teamsFromPlayers}
                />
                <FilterButton 
                  title={t('search.position')} 
                  options={positions} 
                  selectedValue={selectedPosition}
                  onSelect={(value) => {
                    setSelectedPosition(value);
                    setActiveFilter(value ? 'position' : null);
                    // Если выбрана позиция вратаря - сбрасываем PPG
                    if (value && isGoalkeeperPosition(value)) {
                      setSelectedPPG(null);
                    }
                    // Если выбрана позиция не вратаря - сбрасываем GAA и SV%
                    if (value && !isGoalkeeperPosition(value)) {
                      setSelectedGAA(null);
                      setSelectedSV(null);
                    }
                  }}
                  isActive={activeFilter === 'position'}
                  filterName="position"
                  isOpen={isFilterOpen('position')}
                  onToggle={toggleFilter}
                  positions={positions}
                />
              </View>

              {/* Вторая строка: Год, Хват, Рост, Вес */}
              <View style={styles.filterRow}>
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

              {/* Третья строка: PPG, SV%, GAA */}
              {(ppgOptions.length > 0 || svOptions.length > 0 || gaaOptions.length > 0) && (
                <View style={styles.filterRow}>
                  {ppgOptions.length > 0 && (
                    <FilterButton 
                      title="PPG" 
                      options={ppgOptions} 
                      selectedValue={selectedPPG}
                      onSelect={(value) => {
                        if (isPPGDisabled) return;
                        setSelectedPPG(value);
                        setActiveFilter(value ? 'ppg' : null);
                        // Сбрасываем GAA и SV% при выборе PPG
                        if (value) {
                          setSelectedGAA(null);
                          setSelectedSV(null);
                        }
                      }}
                      isActive={activeFilter === 'ppg'}
                      filterName="ppg"
                      isOpen={isFilterOpen('ppg')}
                      onToggle={toggleFilter}
                      disabled={isPPGDisabled}
                    />
                  )}
                  {svOptions.length > 0 && (
                    <FilterButton 
                      title="SV%" 
                      options={svOptions} 
                      selectedValue={selectedSV}
                      onSelect={(value) => {
                        if (isSVDisabled) return;
                        setSelectedSV(value);
                        setActiveFilter(value ? 'sv' : null);
                        // Сбрасываем PPG при выборе SV%
                        if (value) {
                          setSelectedPPG(null);
                        }
                      }}
                      isActive={activeFilter === 'sv'}
                      filterName="sv"
                      isOpen={isFilterOpen('sv')}
                      onToggle={toggleFilter}
                      disabled={isSVDisabled}
                    />
                  )}
                  {gaaOptions.length > 0 && (
                    <FilterButton 
                      title="GAA" 
                      options={gaaOptions} 
                      selectedValue={selectedGAA}
                      onSelect={(value) => {
                        if (isGAADisabled) return;
                        setSelectedGAA(value);
                        setActiveFilter(value ? 'gaa' : null);
                        // Сбрасываем PPG при выборе GAA
                        if (value) {
                          setSelectedPPG(null);
                        }
                      }}
                      isActive={activeFilter === 'gaa'}
                      filterName="gaa"
                      isOpen={isFilterOpen('gaa')}
                      onToggle={toggleFilter}
                      disabled={isGAADisabled}
                    />
                  )}
                </View>
              )}

              {/* Кнопка сброса всех фильтров */}
              <TouchableOpacity
                style={[
                  styles.resetFiltersButton,
                  !(selectedCountry || selectedTeam || selectedHand || selectedPosition || selectedYear || selectedMinHeight || selectedMinWeight || selectedPPG || selectedSV || selectedGAA || searchQuery) && styles.resetFiltersButtonInactive
                ]}
                onPress={() => {
                  setSelectedCountry(null);
                  setSelectedTeam(null);
                  setSelectedHand(null);
                  setSelectedPosition(null);
                  setSelectedYear(null);
                  setSelectedMinHeight(null);
                  setSelectedMinWeight(null);
                  setSelectedPPG(null);
                  setSelectedSV(null);
                  setSelectedGAA(null);
                  setActiveFilter(null);
                  setOpenFilters(new Set());
                  setSearchQuery(''); // Сброс текста поиска
                }}
                disabled={!(selectedCountry || selectedTeam || selectedHand || selectedPosition || selectedYear || selectedMinHeight || selectedMinWeight || selectedPPG || selectedSV || selectedGAA || searchQuery)}
              >
                <Text style={[
                  styles.resetFiltersButtonText,
                  !(selectedCountry || selectedTeam || selectedHand || selectedPosition || selectedYear || selectedMinHeight || selectedMinWeight || selectedPPG || selectedSV || selectedGAA || searchQuery) && styles.resetFiltersButtonTextInactive
                ]}>
                  {t('search.resetFilters')}
                </Text>
              </TouchableOpacity>
            </View>
            </View>
            </View>
          </BlurView>

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

          {/* Кнопка массовой отправки сообщений (только для администратора) */}
          {currentUser?.status === 'admin' && filteredPlayers.length > 0 && (
            <View style={styles.sendMessageButtonContainer}>
              <TouchableOpacity 
                style={styles.sendMessageButton}
                onPress={() => {
                  // Переходим к экрану отправки сообщений со всеми выбранными пользователями
                  const selectedPlayerIds = filteredPlayers.map(p => p.id);
                  router.push({
                    pathname: '/messages/mass',
                    params: { playerIds: JSON.stringify(selectedPlayerIds) }
                  });
                }}
              >
                <Ionicons name="mail" size={24} color="#fff" />
                <Text style={styles.sendMessageButtonText}>{filteredPlayers.length}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CachedBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87A3B1',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.2)',
  },
  overlayLoading: {
    flex: 1,
    backgroundColor: 'rgba(135, 163, 177, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
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
  searchSectionBlur: {
    position: 'absolute',
    top: 41, // Под заголовком
    left: 0,
    right: 0,
    zIndex: 1001,
    overflow: 'visible', // Разрешаем фильтрам выходить за пределы
  },
  searchSection: {
    backgroundColor: 'rgba(1, 0, 0, 0.53)',
  },
  searchSectionOverlay: {
    backgroundColor: 'rgba(1, 0, 0, 0.53)',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(1, 0, 0, 0.3)',
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
    flexDirection: 'column',
    paddingHorizontal: 0,
    marginTop: 8,
    marginBottom: 0,
    zIndex: 1000,
    elevation: 1000,
    position: 'relative',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  filterContainer: {
    flex: 1,
    marginHorizontal: 2,
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
    paddingVertical: 5,
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
  filterButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
  },
  filterButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
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
    backgroundColor: 'rgba(1, 0, 0, 0.95)',
    borderRadius: 10,
    marginTop: 4,
    zIndex: 10000,
    elevation: 10000,
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: 200, // Фиксированная максимальная высота
    transformOrigin: 'top', // Важно для правильной анимации scaleY
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
  resetFiltersButton: {
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  resetFiltersButtonInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  resetFiltersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
  },
  resetFiltersButtonTextInactive: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  playersList: {
    paddingBottom: 20,
    zIndex: 1,
    elevation: 1,
    marginTop: 260, // Отступ для поиска и фильтров (включая третью строку и кнопку сброса, уменьшено на 10px)
  },
  playerItemBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 10,
    backgroundColor: 'rgba(1, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  playerGradientShadow: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 20,
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
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
  newBadge: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
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
  sendMessageButtonContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 1000,
    elevation: 1000,
  },
  sendMessageButton: {
    backgroundColor: '#fa2f40',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  sendMessageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 5,
  },
});


