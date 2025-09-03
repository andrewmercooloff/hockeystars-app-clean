import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useCountryFilter } from '../utils/CountryFilterContext';
import { Player } from '../utils/playerStorage';

export default function CountryFilter({ players }: { players: Player[] }) {
  const { 
    selectedCountry, 
    setSelectedCountry, 
    showCountryFilter, 
    setShowCountryFilter 
  } = useCountryFilter();
  const [countries, setCountries] = useState<string[]>([]);

  // Получаем уникальные страны из игроков
  useEffect(() => {
    const uniqueCountries = Array.from(
      new Set(players.map(player => player.country).filter(Boolean))
    );
    setCountries(uniqueCountries.sort());
  }, [players]);

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    setShowCountryFilter(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowCountryFilter(!showCountryFilter)}
      >
        <Text style={styles.filterButtonText}>
          {selectedCountry || 'Беларусь'}
        </Text>
        <Text style={styles.filterButtonIcon}>
          {showCountryFilter ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showCountryFilter && (
        <View style={styles.countriesList}>
          {countries.map((country) => (
            <TouchableOpacity
              key={country}
              style={[
                styles.countryItem, 
                selectedCountry === country && styles.selectedCountryItem
              ]}
              onPress={() => handleCountrySelect(country)}
            >
              <Text style={[
                styles.countryText, 
                selectedCountry === country && styles.selectedCountryText
              ]}>
                {country}
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
  countriesList: {
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
  countryItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)', // Белый цвет разделителя
  },
  selectedCountryItem: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  countryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    textAlign: 'center',
  },
  selectedCountryText: {
    color: '#FF4444',
    fontFamily: 'Gilroy-Bold',
  },
});
