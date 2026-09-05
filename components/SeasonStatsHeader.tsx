import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { CURRENT_SEASON_KEY, formatSeasonLabel } from '../utils/seasonConfig';

type Props = {
  titleKey?: string;
  fallbackTitle?: string;
};

export default function SeasonStatsHeader({
  titleKey = 'profile.statistics',
  fallbackTitle = 'Статистика',
}: Props) {
  const { t } = useLanguage();
  const title = t(titleKey);
  const label = title === titleKey ? fallbackTitle : title;

  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.hint}>
          {t('profile.currentSeasonHint') === 'profile.currentSeasonHint'
            ? 'Текущий сезон'
            : t('profile.currentSeasonHint')}
        </Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{formatSeasonLabel(CURRENT_SEASON_KEY)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  hint: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: 'rgba(255,255,255,0.45)',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(250, 47, 64, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.45)',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    letterSpacing: 0.4,
  },
});
