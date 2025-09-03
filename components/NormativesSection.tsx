import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface NormativesSectionProps {
  pullUps?: string;
  pushUps?: string;
  plankTime?: string;
  sprint100m?: string;
  longJump?: string;
  jumpRope?: string;
}

export default function NormativesSection({
  pullUps,
  pushUps,
  plankTime,
  sprint100m,
  longJump,
  jumpRope,
}: NormativesSectionProps) {
  const hasAnyNormative = pullUps || pushUps || plankTime || sprint100m || longJump || jumpRope;

  if (!hasAnyNormative) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Нормативы</Text>
      
      <View style={styles.normativesGrid}>
        {pullUps && (
          <View style={styles.normativeItem}>
            <View style={styles.normativeIcon}>
              <Ionicons name="body-outline" size={24} color="#FF4444" />
            </View>
            <View style={styles.normativeContent}>
              <Text style={styles.normativeLabel}>Подтягивания</Text>
              <Text style={styles.normativeValue}>{pullUps} раз</Text>
            </View>
          </View>
        )}

        {pushUps && (
          <View style={styles.normativeItem}>
            <View style={styles.normativeIcon}>
              <Ionicons name="barbell-outline" size={24} color="#FF4444" />
            </View>
            <View style={styles.normativeContent}>
              <Text style={styles.normativeLabel}>Отжимания</Text>
              <Text style={styles.normativeValue}>{pushUps} раз</Text>
            </View>
          </View>
        )}

        {plankTime && (
          <View style={styles.normativeItem}>
            <View style={styles.normativeIcon}>
              <Ionicons name="time-outline" size={24} color="#FF4444" />
            </View>
            <View style={styles.normativeContent}>
              <Text style={styles.normativeLabel}>Планка</Text>
              <Text style={styles.normativeValue}>{plankTime} сек</Text>
            </View>
          </View>
        )}

        {sprint100m && (
          <View style={styles.normativeItem}>
            <View style={styles.normativeIcon}>
              <Ionicons name="speedometer-outline" size={24} color="#FF4444" />
            </View>
            <View style={styles.normativeContent}>
              <Text style={styles.normativeLabel}>100 метров</Text>
              <Text style={styles.normativeValue}>{sprint100m} сек</Text>
            </View>
          </View>
        )}

        {longJump && (
          <View style={styles.normativeItem}>
            <View style={styles.normativeIcon}>
              <Ionicons name="arrow-up-outline" size={24} color="#FF4444" />
            </View>
            <View style={styles.normativeContent}>
              <Text style={styles.normativeLabel}>Прыжок в длину</Text>
              <Text style={styles.normativeValue}>{longJump} см</Text>
            </View>
          </View>
        )}

        {jumpRope && (
          <View style={styles.normativeItem}>
            <View style={styles.normativeIcon}>
              <Ionicons name="infinite-outline" size={24} color="#FF4444" />
            </View>
            <View style={styles.normativeContent}>
              <Text style={styles.normativeLabel}>Скакалка</Text>
              <Text style={styles.normativeValue}>{jumpRope} раз</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginBottom: 15,
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
  },
  normativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
    flexBasis: '48%',
    maxWidth: '48%',
    marginBottom: 12,
  },
  normativeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  normativeContent: {
    flex: 1,
  },
  normativeLabel: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    marginBottom: 4,
  },
  normativeValue: {
    color: '#FF4444',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
}); 