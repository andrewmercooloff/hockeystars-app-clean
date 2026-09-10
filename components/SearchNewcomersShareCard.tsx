import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Player } from '../utils/playerStorage';
import { getRatingShareCardWidth } from '../utils/ratingShareExport';
import { birthYearOf } from '../utils/birthDate';

export type SearchNewcomersShareCardProps = {
  title: string;
  filterLine?: string;
  countLine?: string;
  players: Player[];
  language: string;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export const NEWCOMERS_SHARE_COLS = 3;
export const NEWCOMERS_SHARE_CARD_WIDTH = getRatingShareCardWidth();

const CARD_SCALE = NEWCOMERS_SHARE_CARD_WIDTH / 1080;
const s = (n: number) => Math.round(n * CARD_SCALE);

const STAR_BG = require('../assets/images/star.png');
const LOGO_HEADER_W = 189;
const LOGO_HEADER_H = 63;
const LOGO_DESIGN_WIDTH = 440;
const LOGO_DESIGN_HEIGHT = Math.round(LOGO_DESIGN_WIDTH * (LOGO_HEADER_H / LOGO_HEADER_W));
const ROW_HEIGHT = s(128);
const ROW_GAP = s(8);
const HEADER_HEIGHT = s(300);
const FOOTER_HEIGHT = s(72);

export function getNewcomersShareCardHeight(playerCount: number): number {
  const rows = Math.max(1, Math.ceil(playerCount / NEWCOMERS_SHARE_COLS));
  const gridHeight = rows * ROW_HEIGHT + Math.max(0, rows - 1) * ROW_GAP;
  const total = HEADER_HEIGHT + gridHeight + FOOTER_HEIGHT;
  return Math.max(Math.round(NEWCOMERS_SHARE_CARD_WIDTH * 1.25), total);
}

function getAvatarUri(player: Player): string | undefined {
  return player.avatar || (player.photos && player.photos.length > 0 ? player.photos[0] : undefined);
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

function formatJoinedDate(createdAt: string | undefined, language: string): string {
  if (!createdAt) return '';
  try {
    const locale =
      language === 'ru'
        ? 'ru-RU'
        : language === 'de'
          ? 'de-DE'
          : language === 'fr'
            ? 'fr-FR'
            : language === 'pl'
              ? 'pl-PL'
              : language === 'cs'
                ? 'cs-CZ'
                : language === 'sk'
                  ? 'sk-SK'
                  : language === 'fi'
                    ? 'fi-FI'
                    : language === 'sv'
                      ? 'sv-SE'
                      : language === 'lt'
                        ? 'lt-LT'
                        : language === 'lv'
                          ? 'lv-LV'
                          : language === 'it'
                            ? 'it-IT'
                            : 'en-US';
    return new Date(createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function ShareAvatar({
  player,
  ringSize,
  imageSize,
  iconSize,
}: {
  player: Player;
  ringSize: number;
  imageSize: number;
  iconSize: number;
}) {
  const avatarUri = getAvatarUri(player);
  return (
    <View
      style={[
        styles.avatarRing,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
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

const SearchNewcomersShareCard = React.forwardRef<View, SearchNewcomersShareCardProps>(
  function SearchNewcomersShareCard({ title, filterLine, countLine, players, language, t }, ref) {
    const footer =
      t('search.shareRatingFooter') === 'search.shareRatingFooter' ||
      t('search.shareRatingFooter') === 'hockeystars.com'
        ? 'hockey-stars.com'
        : t('search.shareRatingFooter');

    const ring = s(72);
    const image = s(66);
    const cardHeight = getNewcomersShareCardHeight(players.length);

    return (
      <View ref={ref} style={[styles.card, { height: cardHeight }]} collapsable={false}>
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
          {countLine ? <Text style={styles.countLine}>{countLine}</Text> : null}

          <View style={styles.grid}>
            {players.map((player) => {
              const meta = getPlayerMeta(player, t);
              const joined = formatJoinedDate(player.createdAt, language);
              return (
                <View key={player.id} style={styles.cell}>
                  <ShareAvatar
                    player={player}
                    ringSize={ring}
                    imageSize={image}
                    iconSize={Math.round(28 * CARD_SCALE)}
                  />
                  <Text style={styles.name} numberOfLines={2}>
                    {player.name}
                  </Text>
                  {meta ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {meta}
                    </Text>
                  ) : null}
                  {joined ? (
                    <Text style={styles.joined} numberOfLines={1}>
                      {joined}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.spacer} />
          <Text style={styles.footer}>{footer}</Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    width: NEWCOMERS_SHARE_CARD_WIDTH,
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
    top: '22%',
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
    paddingHorizontal: s(32),
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
  countLine: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: s(24),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginTop: s(10),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: s(18),
    gap: ROW_GAP,
  },
  cell: {
    width: (NEWCOMERS_SHARE_CARD_WIDTH - s(64) - ROW_GAP * (NEWCOMERS_SHARE_COLS - 1)) / NEWCOMERS_SHARE_COLS,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: s(16),
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.28)',
    paddingVertical: s(10),
    paddingHorizontal: s(6),
    minHeight: ROW_HEIGHT,
  },
  avatarRing: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(250, 47, 64, 0.55)',
    borderWidth: 2,
    marginBottom: s(6),
  },
  name: {
    color: '#fff',
    fontSize: s(20),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    minHeight: s(44),
  },
  meta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: s(18),
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
  },
  joined: {
    color: '#fa2f40',
    fontSize: s(18),
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginTop: s(2),
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

export default SearchNewcomersShareCard;
