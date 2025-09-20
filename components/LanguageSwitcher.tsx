import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLanguage = language === 'ru' ? 'en' : 'ru';
    setLanguage(newLanguage);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={toggleLanguage}>
      <View style={styles.content}>
        <Ionicons 
          name="language" 
          size={20} 
          color="#fff" 
        />
        <Text style={styles.text}>
          {language === 'ru' ? 'EN' : 'RU'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginLeft: 6,
  },
});

export default LanguageSwitcher;
