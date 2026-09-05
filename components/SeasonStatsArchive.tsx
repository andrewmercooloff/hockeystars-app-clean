import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { isGoalkeeperPosition } from '../utils/playerStorage';
import {
  getArchivedSeasonStats,
  getSeasonGAA,
  getSeasonPoints,
  getSeasonSavePercentage,
  type SeasonStatBlock,
} from '../utils/seasonStats';
import { PREVIOUS_SEASON_KEY, formatSeasonLabel } from '../utils/seasonConfig';
import type { Player } from '../utils/playerStorage';

type Props = {
  player: Player;
  position?: string | null;
};

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function FieldArchive({ block, t }: { block: SeasonStatBlock; t: (key: string) => string }) {
  const goals = block.goals ?? 0;
  const assists = block.assists ?? 0;
  const games = block.games ?? 0;
  const points = getSeasonPoints(block);
  const ppg = games > 0 ? (points / games).toFixed(1) : '0.0';

  return (
    <View style={styles.pillsRow}>
      {games > 0 && <StatPill value={String(games)} label={t('profile.gamesCount')} />}
      {goals > 0 && <StatPill value={String(goals)} label={t('profile.goalsCount')} />}
      {assists > 0 && <StatPill value={String(assists)} label={t('profile.assists')} />}
      {points > 0 && <StatPill value={String(points)} label={t('profile.points')} />}
      {games > 0 && points > 0 && <StatPill value={ppg} label={t('profile.effectiveness')} />}
    </View>
  );
}

function GoalieArchive({ block, t }: { block: SeasonStatBlock; t: (key: string) => string }) {
  const games = block.games ?? 0;
  const minutes = block.minutes ?? 0;
  const shots = block.shots ?? 0;
  const saves = block.saves ?? 0;

  return (
    <View style={styles.pillsRow}>
      {games > 0 && <StatPill value={String(games)} label={t('profile.gamesCount')} />}
      {minutes > 0 && <StatPill value={String(minutes)} label={t('profile.minutes')} />}
      {saves > 0 && <StatPill value={String(saves)} label={t('profile.saves')} />}
      {shots > 0 && <StatPill value={getSeasonSavePercentage(block)} label={t('profile.savePercentage')} />}
      {minutes > 0 && shots > 0 && <StatPill value={getSeasonGAA(block)} label={t('profile.goalsAgainstAverage')} />}
    </View>
  );
}

export default function SeasonStatsArchive({ player, position }: Props) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const archive = getArchivedSeasonStats(player, PREVIOUS_SEASON_KEY);
  if (!archive) return null;

  const isGoalie = isGoalkeeperPosition(position ?? player.position);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.55)" />
          <Text style={styles.headerTitle}>
            {t('profile.previousSeason') === 'profile.previousSeason'
              ? 'Прошлый сезон'
              : t('profile.previousSeason')}
          </Text>
          <View style={styles.archiveBadge}>
            <Text style={styles.archiveBadgeText}>{formatSeasonLabel(PREVIOUS_SEASON_KEY)}</Text>
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
          {isGoalie ? (
            <GoalieArchive block={archive} t={t} />
          ) : (
            <FieldArchive block={archive} t={t} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    color: 'rgba(255,255,255,0.72)',
  },
  archiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  archiveBadgeText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    color: 'rgba(255,255,255,0.55)',
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
  },
  pill: {
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
  },
  pillValue: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  pillLabel: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
