import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import CachedAvatar from './CachedAvatar';
import type { GameScoreRow } from '../utils/gameLeaderboard';

export type LeaderboardLabels = {
  monthlyChampion: string;
  allTimeChampion: string;
  monthlyTop?: string;
  allTimeTop?: string;
};

type Props<T extends GameScoreRow> = {
  monthly: T[];
  allTime: T[];
  formatScore: (score: number) => string;
  labels: LeaderboardLabels;
  introLimit?: number;
  showAvatar?: boolean;
  showRank?: boolean;
  rankStyle?: object;
  nameStyle?: object;
  scoreStyle?: object;
  titleStyle?: object;
  cardStyle?: object;
  rowStyle?: object;
  compact?: boolean;
};

function LeaderboardBlock<T extends GameScoreRow>({
  title,
  entries,
  limit,
  formatScore,
  showAvatar,
  showRank = true,
  rankStyle,
  nameStyle,
  scoreStyle,
  titleStyle,
  cardStyle,
  rowStyle,
  compact,
}: {
  title: string;
  entries: T[];
  limit: number;
  formatScore: (score: number) => string;
  showAvatar?: boolean;
  showRank?: boolean;
  rankStyle?: object;
  nameStyle?: object;
  scoreStyle?: object;
  titleStyle?: object;
  cardStyle?: object;
  rowStyle?: object;
  compact?: boolean;
}) {
  if (entries.length === 0) return null;
  const list = entries.slice(0, limit);

  return (
    <View style={[styles.block, compact && styles.blockCompact]}>
      <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact, titleStyle]}>{title}</Text>
      <View style={[styles.lbCard, compact && styles.lbCardCompact, cardStyle]}>
        {list.map((entry, i) => (
          <View key={`${entry.player_id}-${i}`} style={[styles.lbRow, compact && styles.lbRowCompact, rowStyle]}>
            {showRank ? (
              <Text style={[styles.lbRank, compact && styles.lbRankCompact, rankStyle]}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </Text>
            ) : null}
            {showAvatar ? (
              entry.player_avatar ? (
                <CachedAvatar
                  playerId={entry.player_id}
                  fallbackAvatarUrl={entry.player_avatar}
                  size={compact ? 24 : 28}
                  style={[styles.lbAvatar, compact && styles.lbAvatarCompact]}
                />
              ) : (
                <View style={[styles.lbAvatar, styles.lbAvatarPlaceholder, compact && styles.lbAvatarCompact]} />
              )
            ) : null}
            <Text style={[styles.lbName, compact && styles.lbNameCompact, nameStyle]} numberOfLines={1}>
              {entry.player_name}
            </Text>
            <Text style={[styles.lbScore, compact && styles.lbScoreCompact, scoreStyle]}>
              {formatScore(entry.score)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function GameDualLeaderboard<T extends GameScoreRow>({
  monthly,
  allTime,
  formatScore,
  labels,
  introLimit = 5,
  showAvatar = true,
  showRank = true,
  rankStyle,
  nameStyle,
  scoreStyle,
  titleStyle,
  cardStyle,
  rowStyle,
  compact = false,
}: Props<T>) {
  if (monthly.length === 0 && allTime.length === 0) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <LeaderboardBlock
        title={labels.monthlyChampion}
        entries={monthly}
        limit={introLimit}
        formatScore={formatScore}
        showAvatar={showAvatar}
        showRank={showRank}
        rankStyle={rankStyle}
        nameStyle={nameStyle}
        scoreStyle={scoreStyle}
        titleStyle={titleStyle}
        cardStyle={cardStyle}
        rowStyle={rowStyle}
        compact={compact}
      />
      <LeaderboardBlock
        title={labels.allTimeChampion}
        entries={allTime}
        limit={introLimit}
        formatScore={formatScore}
        showAvatar={showAvatar}
        showRank={showRank}
        rankStyle={rankStyle}
        nameStyle={nameStyle}
        scoreStyle={scoreStyle}
        titleStyle={titleStyle}
        cardStyle={cardStyle}
        rowStyle={rowStyle}
        compact={compact}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 14 },
  wrapCompact: { gap: 8 },
  block: { width: '100%', gap: 8 },
  blockCompact: { gap: 4 },
  sectionTitle: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionTitleCompact: {
    fontSize: 13,
    marginBottom: 0,
  },
  lbCard: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  lbCardCompact: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  lbRowCompact: {
    gap: 6,
    paddingVertical: 3,
  },
  lbRank: { width: 28, textAlign: 'center', color: '#fff', fontSize: 14 },
  lbRankCompact: { width: 24, fontSize: 12 },
  lbAvatar: { width: 28, height: 28, borderRadius: 14 },
  lbAvatarCompact: { width: 24, height: 24, borderRadius: 12 },
  lbAvatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.15)' },
  lbName: { flex: 1, color: '#fff', fontSize: 14 },
  lbNameCompact: { fontSize: 12, lineHeight: 15 },
  lbScore: { color: '#ffd700', fontWeight: '700', fontSize: 13, minWidth: 28, textAlign: 'right' },
  lbScoreCompact: { fontSize: 12, minWidth: 24 },
});
