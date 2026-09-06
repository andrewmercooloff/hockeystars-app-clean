import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FIELD_PLAYER_SEASON_FIELDS,
  GOALIE_SEASON_FIELDS,
  getSeasonBlockForEdit,
  getSeasonFieldEditValue,
  getSeasonGAA,
  getSeasonPoints,
  getSeasonSavePercentage,
  hasSeasonStatData,
  patchSeasonEdit,
  type SeasonStatBlock,
} from '../utils/seasonStats';
import { PREVIOUS_SEASON_KEY, formatSeasonLabel } from '../utils/seasonConfig';
import type { Player } from '../utils/playerStorage';

type Props = {
  player: Player;
  editData: Partial<Player>;
  isEditing: boolean;
  isGoalkeeper: boolean;
  onUpdateEdit: (next: Partial<Player>) => void;
  onInputFocus?: () => void;
  editInputStyle?: ViewStyle;
  statLabelStyle?: TextStyle;
  statsGridStyle?: ViewStyle;
  statItemStyle?: ViewStyle;
};

const FIELD_LABELS: Record<string, string> = {
  games: 'profile.gamesCount',
  goals: 'profile.goalsCount',
  assists: 'profile.assists',
  minutes: 'profile.minutes',
  shots: 'profile.shots',
  saves: 'profile.saves',
};

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={styles.pillLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Text>
    </View>
  );
}

function FieldView({ block, t }: { block: SeasonStatBlock; t: (key: string) => string }) {
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

function GoalieView({ block, t }: { block: SeasonStatBlock; t: (key: string) => string }) {
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
      {minutes > 0 && shots > 0 && (
        <StatPill value={getSeasonGAA(block)} label={t('profile.goalsAgainstAverage')} />
      )}
    </View>
  );
}

export default function PreviousSeasonStatsSection({
  player,
  editData,
  isEditing,
  isGoalkeeper,
  onUpdateEdit,
  onInputFocus,
  editInputStyle,
  statLabelStyle,
  statsGridStyle,
  statItemStyle,
}: Props) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(isEditing);
  const block = getSeasonBlockForEdit(player, editData, PREVIOUS_SEASON_KEY);
  const hasArchive = hasSeasonStatData(block);

  useEffect(() => {
    if (isEditing) setExpanded(true);
  }, [isEditing]);

  if (!isEditing && !hasArchive) return null;

  const fields = isGoalkeeper ? GOALIE_SEASON_FIELDS : FIELD_PLAYER_SEASON_FIELDS;
  const title =
    t('profile.previousSeason') === 'profile.previousSeason'
      ? 'Прошлый сезон'
      : t('profile.previousSeason');

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => !isEditing && setExpanded((v) => !v)}
        activeOpacity={isEditing ? 1 : 0.75}
        disabled={isEditing}
        accessibilityRole="button"
      >
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.55)" />
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.archiveBadge}>
            <Text style={styles.archiveBadgeText}>{formatSeasonLabel(PREVIOUS_SEASON_KEY)}</Text>
          </View>
        </View>
        {!isEditing && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="rgba(255,255,255,0.45)"
          />
        )}
      </TouchableOpacity>

      {(expanded || isEditing) && (
        <View style={styles.body}>
          {isEditing ? (
            <View style={statsGridStyle}>
              {fields.map((field) => {
                const labelKey = FIELD_LABELS[field] ?? field;
                const label = t(labelKey) === labelKey ? field : t(labelKey);
                return (
                  <View key={field} style={statItemStyle}>
                    <Text style={statLabelStyle}>{label}</Text>
                    <TextInput
                      style={editInputStyle}
                      value={getSeasonFieldEditValue(block, field)}
                      onFocus={onInputFocus}
                      onChangeText={(text) =>
                        onUpdateEdit(patchSeasonEdit(editData, PREVIOUS_SEASON_KEY, field, text))
                      }
                      placeholder="0"
                      placeholderTextColor="#888"
                      keyboardType="numeric"
                    />
                  </View>
                );
              })}
            </View>
          ) : isGoalkeeper ? (
            <GoalieView block={block} t={t} />
          ) : (
            <FieldView block={block} t={t} />
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
  // Single compact row: pills share width equally, never wrap.
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    paddingTop: 10,
  },
  pill: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
  },
  pillValue: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  pillLabel: {
    marginTop: 2,
    fontSize: 9.5,
    fontFamily: 'Gilroy-Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
