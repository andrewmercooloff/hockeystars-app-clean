import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform
} from 'react-native';
import { useCountryFilter } from '../utils/CountryFilterContext';
import { Player } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';

export default function CountryFilter({ players }: { players: Player[] }) {
  const { t } = useLanguage();
  const { 
    selectedCountry, 
    setSelectedCountry, 
    showCountryFilter, 
    setShowCountryFilter 
  } = useCountryFilter();

  // Получаем уникальные страны из игроков
  const countries = useMemo(() => {
    return Array.from(
      new Set(players.map(player => player.country).filter(Boolean))
    ).sort() as string[];
  }, [players]);

  const handleCountrySelect = useCallback((country: string) => {
    setSelectedCountry(country);
    setShowCountryFilter(false);
  }, [setSelectedCountry, setShowCountryFilter]);

  const handleFilterToggle = useCallback(() => {
    setShowCountryFilter(!showCountryFilter);
  }, [showCountryFilter, setShowCountryFilter]);

  // Мемоизируем текст кнопки
  const filterButtonText = useMemo(() => {
    return selectedCountry ? t(`profile.countries.${selectedCountry}`) : t('profile.countries.Беларусь');
  }, [selectedCountry, t]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={handleFilterToggle}
      >
        <Text style={styles.filterButtonText}>
          {filterButtonText}
        </Text>
        <Text style={styles.filterButtonIcon}>
          {showCountryFilter ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showCountryFilter && (
        <View style={styles.countriesList}>
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
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  filterButtonIcon: {
    color: '#fff', // Белый цвет иконки
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
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
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
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
    textAlign: 'center',
  },
  selectedCountryText: {
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
