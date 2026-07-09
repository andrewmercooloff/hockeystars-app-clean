import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';

interface LoadingCenterProps {
  message?: string;
  style?: ViewStyle;
  size?: 'small' | 'large';
}

export default function LoadingCenter({ message, style, size = 'large' }: LoadingCenterProps) {
  const { t } = useLanguage();
  return (
    <View style={[styles.center, style]}>
      <ActivityIndicator size={size} color={colors.brand} />
      <Text style={styles.text}>{message ?? t('common.loading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
});
