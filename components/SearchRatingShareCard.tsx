import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  LEADER_BORDER_COLORS,
  getMedalLeaderRank,
} from '../utils/leaderDisplay';
import { type Player } from '../utils/playerStorage';
import { getAllTimeGoalieBlock, getAllTimePoints, getSeasonSavePercentage } from '../utils/seasonStats';
import { getRatingShareCardWidth } from '../utils/ratingShareExport';
import { birthYearOf } from '../utils/birthDate';

export type SearchRatingShareEntry = {
  player: Player;
  rank: number;
};

export type SearchRatingShareCardProps = {
  title: string;
  filterLine?: string;
  /** Например «Сезон 25/26» — выводится под фильтром. */
  seasonLine?: string;
  subtitle?: string;
  goalieMode: boolean;
  entries: SearchRatingShareEntry[];
  t: (key: string) => string;
};

export const RATING_SHARE_SITE = 'hockey-stars.com';
export const RATING_SHARE_CARD_WIDTH = getRatingShareCardWidth();
const CARD_SCALE = RATING_SHARE_CARD_WIDTH / 1080;
/** Формат поста Instagram 4:5 (1080×1350) — выше этого лента обрезает картинку. */
export const RATING_SHARE_CARD_HEIGHT = Math.round(RATING_SHARE_CARD_WIDTH * 1.25);
const STAR_BG = require('../assets/images/star.png');
/** Те же пропорции, что в LogoHeader (189×63) — logo.png горизонтальный, не квадрат. */
const LOGO_HEADER_W = 189;
const LOGO_HEADER_H = 63;
const LOGO_DESIGN_WIDTH = 440;
const LOGO_DESIGN_HEIGHT = Math.round(LOGO_DESIGN_WIDTH * (LOGO_HEADER_H / LOGO_HEADER_W));

function formatLeaderStat(
  player: Player,
  goalieMode: boolean,
  t: (key: string) => string
): string {
  // Рейтинг поиска — суммарно за все сезоны
  if (goalieMode) {
    const block = getAllTimeGoalieBlock(player);
    if (block) return `SV% ${getSeasonSavePercentage(block)}`;
    return 'SV% —';
  }
  const pts = getAllTimePoints(player);
  return `${pts} ${t('search.ratingPointsLabel') || 'pts'}`;
}

function getPlayerMeta(player: Player, t: (key: string) => string): string {
  return [
    player.country
      ? t(`profile.countries.${player.country}`) !== `profile.countries.${player.country}`
        ? t(`profile.countries.${player.country}`)
        : player.country
      : null,
    player.birthDate
      ? String(birthYearOf(player.birthDate) ?? '')
      : player.age
        ? String(new Date().getFullYear() - player.age)
        : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function getAvatarUri(player: Player): string | undefined {
  return player.avatar || (player.photos && player.photos.length > 0 ? player.photos[0] : undefined);
}

function ShareAvatar({
  player,
  ringSize,
  imageSize,
  borderColor,
  borderWidth = 2,
  iconSize,
}: {
  player: Player;
  ringSize: number;
  imageSize: number;
  borderColor: string;
  borderWidth?: number;
  iconSize: number;
}) {
  const avatarUri = getAvatarUri(player);
  return (
    <View
      style={[
        styles.avatarRingBase,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor,
          borderWidth,
        },
      ]}
    >
      {avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: imageSize / 2,
          }}
        />
      ) : (
        <View
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: imageSize / 2,
            backgroundColor: '#2a2a2a',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="person" size={iconSize} color="#888" />
        </View>
      )}
    </View>
  );
}

const SearchRatingShareCard = React.forwardRef<View, SearchRatingShareCardProps>(
  function SearchRatingShareCard(
    { title, filterLine, seasonLine, subtitle, goalieMode, entries, t },
    ref
  ) {
    const rows = entries.slice(0, 10);
    const topThree = rows.filter((e) => e.rank <= 3).sort((a, b) => a.rank - b.rank);
    const restRows = rows.filter((e) => e.rank > 3).sort((a, b) => a.rank - b.rank);
    // Пьедестал: 2 — 1 — 3, победитель в центре и выше остальных
    const podiumOrder = [2, 1, 3]
      .map((r) => topThree.find((e) => e.rank === r))
      .filter((e): e is SearchRatingShareEntry => !!e);

    const footer =
      t('search.shareRatingFooter') === 'search.shareRatingFooter' ||
      t('search.shareRatingFooter') === 'hockeystars.com'
        ? RATING_SHARE_SITE
        : t('search.shareRatingFooter');

    const rowRing = s(58);
    const rowImage = s(54);

    return (
      <View ref={ref} style={styles.card} collapsable={false}>
        <ImageBackground
          source={STAR_BG}
          resizeMode="repeat"
          style={StyleSheet.absoluteFillObject}
          imageStyle={styles.starPattern}
        />
        <View style={styles.bgDeep} />
        <View style={styles.bgGlowCenter} />
        <View style={styles.bgGlowBottom} />
        <View style={styles.bgVignetteTop} />
        <View style={styles.bgVignetteBottom} />
        <View style={styles.bgBorderGlow} />

        <View style={styles.inner}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{title}</Text>
          {filterLine ? (
            <View style={styles.filterLineWrap}>
              <Text style={styles.filterLine}>{filterLine}</Text>
            </View>
          ) : null}
          {seasonLine ? <Text style={styles.seasonLine}>{seasonLine}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {podiumOrder.length > 0 ? (
            <View style={styles.podiumRow}>
              {podiumOrder.map(({ player, rank }) => {
                const medal = getMedalLeaderRank(rank);
                const ringColor = medal ? LEADER_BORDER_COLORS[medal] : '#fa2f40';
                const meta = getPlayerMeta(player, t);
                const isWinner = rank === 1;
                const ring = isWinner ? s(168) : s(118);
                const image = isWinner ? s(156) : s(108);
                return (
                  <View
                    key={player.id}
                    style={[
                      styles.podiumCol,
                      isWinner ? styles.podiumColWinner : styles.podiumColSide,
                      { borderColor: isWinner ? ringColor : 'rgba(250, 47, 64, 0.28)' },
                    ]}
                  >
                    <View style={[styles.podiumBadge, { backgroundColor: ringColor }]}>
                      <Text style={styles.podiumBadgeText}>{rank}</Text>
                    </View>
                    <ShareAvatar
                      player={player}
                      ringSize={ring}
                      imageSize={image}
                      borderColor={ringColor}
                      borderWidth={isWinner ? 5 : 3}
                      iconSize={Math.round((isWinner ? 52 : 36) * CARD_SCALE)}
                    />
                    <Text
                      style={[styles.podiumName, isWinner ? styles.podiumNameWinner : null]}
                      numberOfLines={2}
                    >
                      {player.name}
                    </Text>
                    {meta ? (
                      <Text style={styles.podiumMeta} numberOfLines={1}>
                        {meta}
                      </Text>
                    ) : null}
                    <Text style={[styles.podiumStat, isWinner ? styles.podiumStatWinner : null]}>
                      {formatLeaderStat(player, goalieMode, t)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {restRows.length > 0 ? (
            <View style={styles.list}>
              {restRows.map(({ player, rank }, index) => {
                const meta = getPlayerMeta(player, t);
                return (
                <View
                  key={player.id}
                  style={[styles.row, index < restRows.length - 1 ? styles.rowGap : null]}
                >
                  <Text style={styles.rank}>{rank}</Text>
                  <View style={styles.rowAvatarWrap}>
                    <ShareAvatar
                      player={player}
                      ringSize={rowRing}
                      imageSize={rowImage}
                      borderColor="rgba(250, 47, 64, 0.45)"
                      iconSize={Math.round(22 * CARD_SCALE)}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {player.name}
                    </Text>
                    {meta ? (
                      <Text style={styles.meta} numberOfLines={1}>
                        {meta}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.stat}>{formatLeaderStat(player, goalieMode, t)}</Text>
                </View>
              );})}
            </View>
          ) : null}

          <View style={styles.spacer} />
          <Text style={styles.footer}>{footer}</Text>
        </View>
      </View>
    );
  }
);

const s = (n: number) => Math.round(n * CARD_SCALE);

const styles = StyleSheet.create({
  card: {
    width: RATING_SHARE_CARD_WIDTH,
    height: RATING_SHARE_CARD_HEIGHT,
    backgroundColor: '#060408',
    overflow: 'hidden',
  },
  starPattern: {
    opacity: 0.24,
  },
  bgDeep: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 4, 10, 0.72)',
  },
  bgGlowCenter: {
    position: 'absolute',
    top: '38%',
    left: -s(80),
    width: s(320),
    height: s(320),
    borderRadius: s(160),
    backgroundColor: 'rgba(180, 20, 40, 0.12)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -s(100),
    right: -s(60),
    width: s(420),
    height: s(280),
    borderRadius: s(210),
    backgroundColor: 'rgba(250, 47, 64, 0.14)',
  },
  bgVignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: s(180),
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bgVignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: s(160),
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  bgBorderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: s(3),
    borderColor: 'rgba(250, 47, 64, 0.28)',
  },
  inner: {
    flex: 1,
    paddingHorizontal: s(40),
    paddingTop: s(22),
    paddingBottom: s(26),
  },
  spacer: {
    flex: 1,
  },
  logo: {
    width: s(LOGO_DESIGN_WIDTH),
    height: s(LOGO_DESIGN_HEIGHT),
    alignSelf: 'center',
    marginBottom: s(4),
  },
  title: {
    color: '#fff',
    fontSize: s(40),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  filterLineWrap: {
    alignSelf: 'center',
    backgroundColor: '#fa2f40',
    borderRadius: s(10),
    paddingHorizontal: s(16),
    paddingVertical: s(6),
    marginTop: s(8),
  },
  filterLine: {
    color: '#fff',
    fontSize: s(28),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  seasonLine: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: s(24),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: s(8),
  },
  subtitle: {
    color: 'rgba(250, 47, 64, 0.85)',
    fontSize: s(22),
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginTop: s(8),
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: s(18),
    gap: s(10),
  },
  podiumCol: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: s(20),
    borderWidth: 1,
    paddingHorizontal: s(6),
  },
  podiumColSide: {
    flex: 1,
    paddingTop: s(22),
    paddingBottom: s(14),
  },
  podiumColWinner: {
    flex: 1.25,
    paddingTop: s(24),
    paddingBottom: s(18),
    backgroundColor: 'rgba(250, 47, 64, 0.10)',
    borderWidth: 2,
  },
  podiumBadge: {
    position: 'absolute',
    top: -s(18),
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumBadgeText: {
    color: '#0a0608',
    fontSize: s(24),
    fontFamily: 'Gilroy-Bold',
  },
  avatarRingBase: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: s(10),
  },
  podiumName: {
    color: '#fff',
    fontSize: s(24),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    minHeight: s(56),
  },
  podiumNameWinner: {
    fontSize: s(28),
  },
  podiumMeta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: s(22),
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginTop: s(2),
    marginBottom: s(4),
  },
  podiumStat: {
    color: '#fa2f40',
    fontSize: s(26),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  podiumStatWinner: {
    fontSize: s(34),
  },
  list: {
    marginTop: s(16),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: s(20),
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.28)',
    paddingVertical: s(8),
    paddingHorizontal: s(14),
  },
  rowGap: {
    marginBottom: s(8),
  },
  rowAvatarWrap: {
    marginRight: s(12),
  },
  rank: {
    width: s(40),
    color: 'rgba(250, 47, 64, 0.55)',
    fontSize: s(30),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginRight: s(8),
    marginLeft: s(12),
  },
  name: {
    color: '#fff',
    fontSize: s(26),
    fontFamily: 'Gilroy-Bold',
  },
  meta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: s(21),
    fontFamily: 'Gilroy-Regular',
    marginTop: s(2),
  },
  stat: {
    color: '#fa2f40',
    fontSize: s(24),
    fontFamily: 'Gilroy-Bold',
    minWidth: s(100),
    textAlign: 'right',
  },
  footer: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: s(22),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginTop: s(12),
    letterSpacing: 1,
  },
});

export default SearchRatingShareCard;
