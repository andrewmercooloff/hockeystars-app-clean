import React, { useMemo } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useCountryFilter } from '../utils/CountryFilterContext';
import { useYearFilter } from '../utils/YearFilterContext';

export default function YearFilter({ players }: { players: any[] }) {
  const { 
    selectedYear, 
    setSelectedYear, 
    showYearFilter, 
    setShowYearFilter 
  } = useYearFilter();
  const { selectedCountry } = useCountryFilter();

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

        // Проверяем диапазон лет
        if (birthYear && birthYear >= 2008 && birthYear <= 2019) {
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

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setShowYearFilter(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowYearFilter(!showYearFilter)}
      >
        <Text style={styles.filterButtonText}>
          {selectedYear ? `${selectedYear} год` : '2012 год'}
        </Text>
        <Text style={styles.filterButtonIcon}>
          {showYearFilter ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showYearFilter && (
        <View style={styles.yearsList}>
          {availableYears.map(({ year }) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.yearItem, 
                selectedYear === year && styles.selectedYearItem
              ]}
              onPress={() => handleYearSelect(year)}
            >
              <Text style={[
                styles.yearText, 
                selectedYear === year && styles.selectedYearText
              ]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Черный полупрозрачный фон
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    width: 100,
  },
  filterButtonText: {
    color: '#fff', // Белый текст
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    flex: 1,
  },
  filterButtonIcon: {
    color: '#fff', // Белый цвет иконки
    fontSize: 10,
  },
  yearsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    marginTop: 4,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Белая граница
    shadowColor: '#000', // Черный цвет тени
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  yearItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)', // Белый цвет разделителя
  },
  selectedYearItem: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  yearText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    textAlign: 'center',
  },
  selectedYearText: {
    color: '#FF4444',
    fontFamily: 'Gilroy-Bold',
  },
});
