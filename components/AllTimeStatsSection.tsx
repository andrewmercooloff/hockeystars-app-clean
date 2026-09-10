import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import {
  countSeasonsWithStats,
  getAllTimeBlock,
  getArchivedSeasonBlocks,
  hasSeasonStatData,
} from '../utils/seasonStats';
import type { Player } from '../utils/playerStorage';
import { FieldView, GoalieView } from './PreviousSeasonStatsSection';

type Props = {
  player: Player;
  isGoalkeeper: boolean;
};

/**
 * Career totals: current season + every archived season. Read-only (derived),
 * shown only when there is more than the current season to sum up.
 * The search rating uses these same totals.
 */
export default function AllTimeStatsSection({ player, isGoalkeeper }: Props) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  if (getArchivedSeasonBlocks(player).length === 0) return null;
  const block = getAllTimeBlock(player);
  if (!hasSeasonStatData(block)) return null;

  const seasons = countSeasonsWithStats(player);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        <View style={styles.headerLeft}>
          <Ionicons name="trophy-outline" size={16} color="rgba(255,255,255,0.55)" />
          <Text style={styles.headerTitle}>{t('profile.allTime')}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('profile.seasonsCount', { count: seasons })}</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="rgba(255,255,255,0.45)"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {isGoalkeeper ? <GoalieView block={block} t={t} /> : <FieldView block={block} t={t} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(250,47,64,0.22)',
    backgroundColor: 'rgba(250,47,64,0.05)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: 'rgba(255,255,255,0.85)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(250,47,64,0.18)',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    color: '#ff8a94',
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
});
