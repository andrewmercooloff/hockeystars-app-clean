import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

interface TabBarLabelProps {
  labelKey: string;
  focused: boolean;
}

export default function TabBarLabel({ labelKey, focused }: TabBarLabelProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        ellipsizeMode="clip"
        style={[styles.label, focused ? styles.labelFocused : styles.labelInactive]}
      >
        {t(labelKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
    minHeight: 14,
  },
  label: {
    width: '100%',
    fontSize: Platform.OS === 'ios' ? 10 : 9,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginTop: Platform.OS === 'android' ? 0 : 1,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  labelFocused: {
    color: '#eee',
  },
  labelInactive: {
    color: '#888',
  },
});
