import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const languages = [
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' },
  ];

  const handleLanguageSelect = (langCode: 'ru' | 'en') => {
    setLanguage(langCode);
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
          <Text style={styles.languageText}>{currentLanguage?.name}</Text>
          <Ionicons name="chevron-down" size={16} color="#FF4444" />
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
                <Ionicons name="close" size={24} color="#FF4444" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.languageList}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionSelected
                  ]}
                  onPress={() => handleLanguageSelect(lang.code as 'ru' | 'en')}
                >
                  <Text style={[
                    styles.languageOptionText,
                    language === lang.code && styles.languageOptionTextSelected
                  ]}>
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark" size={20} color="#FF4444" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    marginVertical: 8,
  },
  languageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  languageText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    width: '80%',
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 68, 68, 0.2)',
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
    borderBottomColor: 'rgba(255, 68, 68, 0.1)',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  languageOptionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  languageOptionTextSelected: {
    color: '#FF4444',
    fontFamily: 'Gilroy-Bold',
  },
});

export default LanguageSwitcher;

