import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, resetToDeviceLanguage, t } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: 'US' },
    { code: 'ru', name: 'Русский', flag: 'RU' },
    { code: 'lt', name: 'Lietuvių', flag: 'LT' },
    { code: 'lv', name: 'Latviešu', flag: 'LV' },
    { code: 'pl', name: 'Polski', flag: 'PL' },
    { code: 'sv', name: 'Svenska', flag: 'SE' },
    { code: 'cs', name: 'Čeština', flag: 'CZ' },
    { code: 'sk', name: 'Slovenčina', flag: 'SK' },
    { code: 'fi', name: 'Suomi', flag: 'FI' },
    { code: 'it', name: 'Italiano', flag: 'IT' },
    { code: 'de', name: 'Deutsch', flag: 'DE' },
    { code: 'fr', name: 'Français', flag: 'FR' },
  ];

  const handleLanguageSelect = (langCode: 'ru' | 'en' | 'lt' | 'lv' | 'pl' | 'sv' | 'cs' | 'sk' | 'fi' | 'it' | 'de' | 'fr') => {
    setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const handleAutoLanguage = async () => {
    await resetToDeviceLanguage();
    setShowLanguageModal(false);
  };

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <>
      <TouchableOpacity 
        style={styles.languageButton}
        onPress={() => setShowLanguageModal(true)}
      >
        <View style={styles.languageButtonContent}>
          <View style={styles.flagContainer}>
            <Text style={styles.flagText}>{currentLanguage?.flag}</Text>
          </View>
          <Text style={styles.languageText}>{currentLanguage?.name}</Text>
          <Ionicons name="chevron-down" size={16} color="#fa2f40" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowLanguageModal(false)}
              >
                <Ionicons name="close" size={24} color="#fa2f40" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.languageList}>
              {/* Опция "Автоматически" */}
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  styles.autoLanguageOption
                ]}
                onPress={handleAutoLanguage}
              >
                <View style={styles.flagContainer}>
                  <Ionicons name="globe-outline" size={12} color="#fa2f40" />
                </View>
                <Text style={styles.languageOptionText}>
                  {t('settings.autoLanguage') || 'Автоматически'}
                </Text>
                <Ionicons name="refresh" size={16} color="#fa2f40" />
              </TouchableOpacity>
              
              {/* Разделитель */}
              <View style={styles.separator} />
              
              {/* Список языков */}
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionSelected
                  ]}
                  onPress={() => handleLanguageSelect(lang.code as 'ru' | 'en' | 'lt' | 'lv' | 'pl' | 'sv' | 'cs' | 'sk' | 'fi' | 'it' | 'de' | 'fr')}
                >
                  <View style={styles.flagContainer}>
                    <Text style={styles.flagText}>{lang.flag}</Text>
                  </View>
                  <Text style={[
                    styles.languageOptionText,
                    language === lang.code && styles.languageOptionTextSelected
                  ]}>
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark" size={20} color="#fa2f40" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  languageButton: {
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    marginVertical: 8,
  },
  languageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  flagContainer: {
    width: 24,
    height: 16,
    borderRadius: 3,
    backgroundColor: 'rgba(250, 47, 64, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  flagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  languageText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    width: '80%',
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250, 47, 64, 0.2)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    maxHeight: 300,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250, 47, 64, 0.1)',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(250, 47, 64, 0.1)',
  },
  languageOptionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  languageOptionTextSelected: {
    color: '#fa2f40',
    fontFamily: 'Gilroy-Bold',
  },
  autoLanguageOption: {
    backgroundColor: 'rgba(250, 47, 64, 0.05)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(250, 47, 64, 0.2)',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(250, 47, 64, 0.1)',
    marginVertical: 8,
  },
});

export default LanguageSwitcher;

