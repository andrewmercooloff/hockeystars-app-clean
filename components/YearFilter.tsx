import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    Animated
} from 'react-native';
import { useCountryFilter } from '../utils/CountryFilterContext';
import { useYearFilter } from '../utils/YearFilterContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function YearFilter({ players }: { players: any[] }) {
  const { t } = useLanguage();
  const { 
    selectedYear, 
    setSelectedYear, 
    showYearFilter, 
    setShowYearFilter 
  } = useYearFilter();
  const { selectedCountry } = useCountryFilter();

  // Анимированные значения для dropdown
  const [dropdownOpacity] = useState(new Animated.Value(0));
  const [dropdownTranslateY] = useState(new Animated.Value(-20));

  // Получаем доступные годы рождения (только те, для которых есть игроки)
  const availableYears = useMemo(() => {
    const yearCounts: Record<number, number> = {};

    // Ограничиваем по выбранной стране (если выбрана)
    const scopedPlayers = selectedCountry
      ? players.filter(p => p.country === selectedCountry)
      : players;

    // Подсчитываем игроков по годам (исключая тренеров и звезд)
    scopedPlayers.forEach(player => {
      if ((player.status === 'coach') || (player.status === 'star')) return;
      if (!player.birthDate) return;
      try {
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

        // Добавляем все годы без ограничений (только проверяем, что год валидный)
        if (birthYear && !isNaN(birthYear) && birthYear > 1900 && birthYear <= new Date().getFullYear() + 1) {
          yearCounts[birthYear] = (yearCounts[birthYear] || 0) + 1;
        }
      } catch (_) {
        // ignore parse errors
      }
    });

    // Сортируем по убыванию и возвращаем только существующие годы
    const years = Object.keys(yearCounts)
      .map(year => parseInt(year))
      .sort((a, b) => b - a)
      .map(year => ({ year, count: yearCounts[year] }));

    return years;
  }, [players, selectedCountry]);


  const handleFilterToggle = useCallback(() => {
    setShowYearFilter(!showYearFilter);
  }, [showYearFilter, setShowYearFilter]);

  // Анимация открытия/закрытия dropdown
  useEffect(() => {
    if (showYearFilter) {
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
  }, [showYearFilter, dropdownOpacity, dropdownTranslateY]);

  const handleYearSelect = useCallback((year: number | null) => {
    setSelectedYear(year);
    // Плавно закрываем dropdown перед вызовом setShowYearFilter
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
      setShowYearFilter(false); // Закрываем фильтр после завершения анимации
    });
  }, [setSelectedYear, setShowYearFilter, dropdownOpacity, dropdownTranslateY]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={handleFilterToggle}
      >
        <Text style={styles.filterButtonText}>
          {selectedYear ? `${selectedYear}` : (t('filters.allYears') || 'Все')}
        </Text>
        <Text style={styles.filterButtonIcon}>
          {showYearFilter ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showYearFilter && (
        <Animated.View style={[
          styles.yearsList,
          {
            opacity: dropdownOpacity,
            transform: [{ translateY: dropdownTranslateY }],
          }
        ]}>
          {/* Опция "Все" */}
          <TouchableOpacity
            style={[
              styles.yearItem,
              !selectedYear && styles.selectedYearItem
            ]}
            onPress={() => handleYearSelect(null)}
          >
            <Text style={[
              styles.yearText,
              !selectedYear && styles.selectedYearText
            ]}>
              {t('filters.allYears') || 'Все'}
            </Text>
          </TouchableOpacity>
          
          {availableYears.map(({ year }, index) => {
            const isSelected = selectedYear === year;
            const isFirst = index === 0;
            const isLast = index === availableYears.length - 1;
            const isOnly = availableYears.length === 1;
            
            let selectedStyle = styles.selectedYearItem;
            if (isOnly) {
              selectedStyle = styles.onlySelectedItem;
            } else if (isFirst) {
              selectedStyle = styles.firstSelectedItem;
            } else if (isLast) {
              selectedStyle = styles.lastSelectedItem;
            }
            
            return (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearItem, 
                  isSelected && selectedStyle
                ]}
                onPress={() => handleYearSelect(year)}
              >
                <Text style={[
                  styles.yearText, 
                  isSelected && styles.selectedYearText
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
    width: 100,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(1, 0, 0, 0.8)', // Черный полупрозрачный фон
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    width: 100,
  },
  filterButtonText: {
    color: '#fff', // Белый текст
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  filterButtonIcon: {
    color: '#fff', // Белый цвет иконки
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
  },
  yearsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: 100,
    backgroundColor: 'rgba(1, 0, 0, 0.9)',
    borderRadius: 12,
    marginTop: 4,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Белая граница
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
        boxShadow: '0 4px 8px rgba(1, 0, 0, 0.3)',
      },
    }),
  },
  yearItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)', // Белый цвет разделителя
  },
  selectedYearItem: {
    backgroundColor: '#fa2f40',
    borderRadius: 12,
  },
  yearText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  selectedYearText: {
    color: '#FFFFFF',
    fontFamily: 'Gilroy-Bold',
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
