import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCountryFilter } from '../utils/CountryFilterContext';
import { useYearFilter } from '../utils/YearFilterContext';
import { Player } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';

export default React.memo(function CountryFilter({ players }: { players: Player[] }) {
  const { t } = useLanguage();
  const { 
    selectedCountry, 
    setSelectedCountry, 
    showCountryFilter, 
    setShowCountryFilter 
  } = useCountryFilter();
  const { selectedYear, setSelectedYear } = useYearFilter();

  // Анимированные значения для dropdown
  const [dropdownOpacity] = useState(new Animated.Value(0));
  const [dropdownTranslateY] = useState(new Animated.Value(-20));

  // Получаем уникальные страны из игроков
  const countries = useMemo(() => {
    return Array.from(
      new Set(players.map(player => player.country).filter(Boolean))
    ).sort() as string[];
  }, [players]);

  // Мемоизируем текст кнопки с учетом "Все"
  const filterButtonText = useMemo(() => {
    if (!selectedCountry) {
      return t('filters.allCountries') || 'Все';
    }
    return t(`profile.countries.${selectedCountry}`);
  }, [selectedCountry, t]);

  const handleCountrySelect = useCallback((country: string | null) => {
    setSelectedCountry(country);

    if (country === null) {
      setSelectedYear(null);
    }

    // Проверяем, есть ли игроки с выбранным годом в новой стране
    if (selectedYear !== null && country !== null) {
      const playersInCountry = players.filter(player =>
        player.country === country &&
        player.birthDate &&
        player.status === 'player'
      );
      
      // Проверяем, есть ли игроки в этом году в новой стране
      const playersInYear = playersInCountry.filter(player => {
        if (!player.birthDate) return false;
        let birthYear: number | null = null;
        
        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(player.birthDate)) {
          birthYear = parseInt(player.birthDate.split('-')[0]);
        }
        // DD.MM.YYYY (обратная совместимость)
        else if (player.birthDate.includes('.')) {
          const parts = player.birthDate.split('.');
          if (parts.length === 3) {
            birthYear = parseInt(parts[2]);
          }
        }
        
        return birthYear === selectedYear;
      });
      
      // Если нет игроков в этом году в новой стране, сбрасываем год на "все"
      if (playersInYear.length === 0) {
        setSelectedYear(null);
      }
    }
    
    // Плавно закрываем dropdown перед вызовом setShowCountryFilter
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
      setShowCountryFilter(false); // Закрываем фильтр после завершения анимации
    });
  }, [setSelectedCountry, setShowCountryFilter, dropdownOpacity, dropdownTranslateY, selectedYear, setSelectedYear, players]);

  const handleFilterToggle = useCallback(() => {
    setShowCountryFilter(!showCountryFilter);
  }, [showCountryFilter, setShowCountryFilter]);

  // Анимация открытия/закрытия dropdown
  useEffect(() => {
    if (showCountryFilter) {
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
  }, [showCountryFilter, dropdownOpacity, dropdownTranslateY]);


  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={handleFilterToggle}
      >
        <Text style={styles.filterButtonText} numberOfLines={1}>
          {filterButtonText}
        </Text>
        <Ionicons
          name={showCountryFilter ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="rgba(255,255,255,0.75)"
        />
      </TouchableOpacity>

      {showCountryFilter && (
        <Animated.View style={[
          styles.countriesList,
          {
            opacity: dropdownOpacity,
            transform: [{ translateY: dropdownTranslateY }],
          }
        ]}>
          {/* Опция "Все" */}
          <TouchableOpacity
            style={[
              styles.countryItem,
              !selectedCountry && styles.selectedCountryItem
            ]}
            onPress={() => handleCountrySelect(null)}
          >
            <Text style={[
              styles.countryText,
              !selectedCountry && styles.selectedCountryText
            ]}>
              {t('filters.allCountries') || 'Все'}
            </Text>
          </TouchableOpacity>
          
          {countries.map((country, index) => {
            const isSelected = selectedCountry === country;
            const isFirst = index === 0;
            const isLast = index === countries.length - 1;
            const isOnly = countries.length === 1;
            
            let selectedStyle = styles.selectedCountryItem;
            if (isOnly) {
              selectedStyle = styles.onlySelectedItem;
            } else if (isFirst) {
              selectedStyle = styles.firstSelectedItem;
            } else if (isLast) {
              selectedStyle = styles.lastSelectedItem;
            }
            
            return (
              <TouchableOpacity
                key={country}
                style={[
                  styles.countryItem, 
                  isSelected && selectedStyle
                ]}
                onPress={() => handleCountrySelect(country)}
              >
                <Text style={[
                  styles.countryText, 
                  isSelected && styles.selectedCountryText
                ]}>
                  {t(`profile.countries.${country}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
    minWidth: 108,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 20, 24, 0.82)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 108,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  countriesList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: 140,
    backgroundColor: 'rgba(20, 20, 24, 0.94)',
    borderRadius: 14,
    marginTop: 6,
    zIndex: 1001,
    elevation: 1001,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000', // Черный цвет тени
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(22, 22, 26, 0.42)',
      },
    }),
  },
  countryItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)', // Белый цвет разделителя
  },
  selectedCountryItem: {
    backgroundColor: '#fa2f40',
    borderRadius: 12,
  },
  countryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedCountryText: {
    color: '#FFFFFF',
    fontFamily: 'Gilroy-Bold',
    fontWeight: '700',
  },
  firstSelectedItem: {
    backgroundColor: '#fa2f40',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  lastSelectedItem: {
    backgroundColor: '#fa2f40',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  onlySelectedItem: {
    backgroundColor: '#fa2f40',
    borderRadius: 12,
  },
});
