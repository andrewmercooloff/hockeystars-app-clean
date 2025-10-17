import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
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
  changes?: { [key: string]: number }; // Изменения для каждого поля
}

export default function NormativesSection({
  pullUps,
  pushUps,
  plankTime,
  sprint100m,
  longJump,
  jumpRope,
  changes = {},
}: NormativesSectionProps) {
  const { t } = useLanguage();
  const hasAnyNormative = pullUps || pushUps || plankTime || sprint100m || longJump || jumpRope;

  if (!hasAnyNormative) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('profile.standards')}</Text>
      
      <View style={styles.normativesGrid}>
        {pullUps && (
          <View style={styles.normativeItem}>
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
        )}

        {pushUps && (
          <View style={styles.normativeItem}>
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
        )}

        {plankTime && (
          <View style={styles.normativeItem}>
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
        )}

        {sprint100m && (
          <View style={styles.normativeItem}>
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
        )}

        {longJump && (
          <View style={styles.normativeItem}>
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
        )}

        {jumpRope && (
          <View style={styles.normativeItem}>
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
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
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
    backgroundColor: 'rgba(250, 47, 64, 0.9)',
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
    fontFamily: 'Gilroy-Regular',
    marginBottom: 2,
  },
  normativeValue: {
    color: '#fa2f40',
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
  },
}); 