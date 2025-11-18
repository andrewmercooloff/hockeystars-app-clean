import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import ChangeIndicator from './ChangeIndicator';

interface NormativesSectionProps {
  pullUps?: string;
  pushUps?: string;
  plankTime?: string;
  sprint100m?: string;
  longJump?: string;
  jumpRope?: string;
  changes?: { [key: string]: number };
  style?: StyleProp<ViewStyle>;
  showTitle?: boolean;
}

export default function NormativesSection({
  pullUps,
  pushUps,
  plankTime,
  sprint100m,
  longJump,
  jumpRope,
  changes = {},
  style,
  showTitle = true,
}: NormativesSectionProps) {
  const { t } = useLanguage();
  
  // Проверяем, что значение не пустое, не "0", не "null" и не undefined
  const isValidValue = (value?: string | number) => {
    if (value === null || value === undefined || value === '' || value === 'null') {
      return false;
    }
    // Проверяем, если это строка "0" или число 0
    if (value === '0' || value === 0) {
      return false;
    }
    // Проверяем, если это строка, которая после trim становится пустой или "0"
    if (typeof value === 'string' && value.trim() === '0') {
      return false;
    }
    return true;
  };
  
  const hasAnyNormative = 
    isValidValue(pullUps) || 
    isValidValue(pushUps) || 
    isValidValue(plankTime) || 
    isValidValue(sprint100m) || 
    isValidValue(longJump) || 
    isValidValue(jumpRope);

  if (!hasAnyNormative) {
    return null;
  }

  // Собираем все валидные элементы нормативов
  const normativeItems = [];
  
  if (isValidValue(pullUps)) {
    normativeItems.push(
      <View key="pullUps" style={styles.normativeItem}>
        <View style={styles.normativeIcon}>
          <Ionicons name="body-outline" size={24} color="#fff" />
          <ChangeIndicator 
            change={changes.pullUps || 0} 
            size="normative" 
          />
        </View>
        <View style={styles.normativeContent}>
          <Text style={styles.normativeLabel}>{t('profile.pullUps')}</Text>
          <Text style={styles.normativeValue}>{pullUps} {t('profile.times')}</Text>
        </View>
      </View>
    );
  }

  if (isValidValue(pushUps)) {
    normativeItems.push(
      <View key="pushUps" style={styles.normativeItem}>
        <View style={styles.normativeIcon}>
          <Ionicons name="barbell-outline" size={24} color="#fff" />
          <ChangeIndicator 
            change={changes.pushUps || 0} 
            size="normative" 
          />
        </View>
        <View style={styles.normativeContent}>
          <Text style={styles.normativeLabel}>{t('profile.pushUps')}</Text>
          <Text style={styles.normativeValue}>{pushUps} {t('profile.times')}</Text>
        </View>
      </View>
    );
  }

  if (isValidValue(plankTime)) {
    normativeItems.push(
      <View key="plankTime" style={styles.normativeItem}>
        <View style={styles.normativeIcon}>
          <Ionicons name="timer-outline" size={24} color="#fff" />
          <ChangeIndicator 
            change={changes.plankTime || 0} 
            size="normative" 
          />
        </View>
        <View style={styles.normativeContent}>
          <Text style={styles.normativeLabel}>{t('profile.plank')}</Text>
          <Text style={styles.normativeValue}>{plankTime} {t('profile.seconds')}</Text>
        </View>
      </View>
    );
  }

  if (isValidValue(sprint100m)) {
    normativeItems.push(
      <View key="sprint100m" style={styles.normativeItem}>
        <View style={styles.normativeIcon}>
          <Ionicons name="speedometer-outline" size={24} color="#fff" />
          <ChangeIndicator 
            change={changes.sprint100m || 0} 
            size="normative" 
          />
        </View>
        <View style={styles.normativeContent}>
          <Text style={styles.normativeLabel}>{t('profile.sprint')}</Text>
          <Text style={styles.normativeValue}>{sprint100m} {t('profile.seconds')}</Text>
        </View>
      </View>
    );
  }

  if (isValidValue(longJump)) {
    normativeItems.push(
      <View key="longJump" style={styles.normativeItem}>
        <View style={styles.normativeIcon}>
          <Ionicons name="arrow-up-outline" size={24} color="#fff" />
          <ChangeIndicator 
            change={changes.longJump || 0} 
            size="normative" 
          />
        </View>
        <View style={styles.normativeContent}>
          <Text style={styles.normativeLabel}>{t('profile.longJump')}</Text>
          <Text style={styles.normativeValue}>{longJump} {t('profile.cm')}</Text>
        </View>
      </View>
    );
  }

  if (isValidValue(jumpRope)) {
    normativeItems.push(
      <View key="jumpRope" style={styles.normativeItem}>
        <View style={styles.normativeIcon}>
          <Ionicons name="repeat-outline" size={24} color="#fff" />
          <ChangeIndicator 
            change={changes.jumpRope || 0} 
            size="normative" 
          />
        </View>
        <View style={styles.normativeContent}>
          <Text style={styles.normativeLabel}>{t('profile.jumpRope')}</Text>
          <Text style={styles.normativeValue}>{jumpRope} {t('profile.times')}</Text>
        </View>
      </View>
    );
  }

  // Если нет элементов, не показываем сетку
  if (normativeItems.length === 0) {
    return null;
  }

  return (
    <View style={[styles.section, style]}>
      {showTitle && (
        <Text style={styles.sectionTitle}>{t('profile.standards')}</Text>
      )}
      
      <View style={styles.normativesGrid}>
        {normativeItems}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    marginTop: 10,
  },
  normativesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  normativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexBasis: '48%',
    maxWidth: '48%',
    minHeight: 70,
  },
  normativeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  normativeContent: {
    flex: 1,
  },
  normativeLabel: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 2,
  },
  normativeValue: {
    color: '#FF4444',
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
  },
}); 