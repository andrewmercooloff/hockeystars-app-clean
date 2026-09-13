import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Player } from '../utils/playerStorage';
import { getRatingShareCardWidth } from '../utils/ratingShareExport';
import { birthYearOf } from '../utils/birthDate';

export type SearchNewcomersShareCardProps = {
  title: string;
  players: Player[];
  t: (key: string, params?: Record<string, string | number>) => string;
};

export const NEWCOMERS_SHARE_CARD_WIDTH = getRatingShareCardWidth();

const CARD_SCALE = NEWCOMERS_SHARE_CARD_WIDTH / 1080;
const s = (n: number) => Math.round(n * CARD_SCALE);

const STAR_BG = require('../assets/images/star.png');
const LOGO_DESIGN_WIDTH = 440;
const LOGO_HEADER_H = 63;
const LOGO_HEADER_W = 189;
const LOGO_DESIGN_HEIGHT = Math.round(LOGO_DESIGN_WIDTH * (LOGO_HEADER_H / LOGO_HEADER_W));

/** ~3× previous row avatar (was 104 / 96). */
const GRID_AVATAR_RING = s(312);
const GRID_AVATAR_IMAGE = s(288);
const GRID_COL_GAP = s(20);
const GRID_ROW_GAP = s(24);
const GRID_CELL_PADDING_V = s(16);
const GRID_TEXT_BLOCK = s(110);
const HEADER_HEIGHT = s(280);
const FOOTER_HEIGHT = s(72);

const GRID_CELL_HEIGHT =
  GRID_CELL_PADDING_V * 2 + GRID_AVATAR_RING + GRID_TEXT_BLOCK;

export function getNewcomersShareCardHeight(playerCount: number): number {
  const count = Math.max(playerCount, 1);
  const rows = Math.ceil(count / 2);
  const gridHeight = rows * GRID_CELL_HEIGHT + Math.max(0, rows - 1) * GRID_ROW_GAP;
  const total = HEADER_HEIGHT + gridHeight + FOOTER_HEIGHT;
  return Math.max(Math.round(NEWCOMERS_SHARE_CARD_WIDTH * 1.25), total);
}

function getAvatarUri(player: Player): string | undefined {
  return player.avatar || (player.photos && player.photos.length > 0 ? player.photos[0] : undefined);
}

function getPlayerMeta(player: Player, t: (key: string) => string): string {
  const parts: string[] = [];

  if (player.birthDate) {
    const year = birthYearOf(player.birthDate);
    if (year) parts.push(String(year));
  } else if (player.age) {
    parts.push(String(new Date().getFullYear() - player.age));
  }

  if (player.country) {
    const countryKey = `profile.countries.${player.country}`;
    const countryTranslation = t(countryKey);
    parts.push(countryTranslation !== countryKey ? countryTranslation : player.country);
  }

  if (player.position) {
    const positionKey = `profile.positions.${player.position}`;
    const positionTranslation = t(positionKey);
    if (positionTranslation && positionTranslation !== positionKey) {
      parts.push(positionTranslation);
    }
  }

  if (player.grip) {
    if (player.grip === 'Левый' || player.grip === 'Left') {
      parts.push(t('search.left'));
    } else if (player.grip === 'Правый' || player.grip === 'Right') {
      parts.push(t('search.right'));
    } else {
      parts.push(player.grip);
    }
  }

  return parts.join(' · ');
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
  function SearchNewcomersShareCard({ title, players, t }, ref) {
    const footer =
      t('search.shareRatingFooter') === 'search.shareRatingFooter' ||
      t('search.shareRatingFooter') === 'hockeystars.com'
        ? 'hockey-stars.com'
        : t('search.shareRatingFooter');

    const cardHeight = getNewcomersShareCardHeight(players.length);
    const cellWidth = (NEWCOMERS_SHARE_CARD_WIDTH - s(32) * 2 - GRID_COL_GAP) / 2;

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

          <View style={styles.grid}>
            {players.map((player, index) => {
              const isLeftCol = index % 2 === 0;
              const row = Math.floor(index / 2);
              const totalRows = Math.ceil(players.length / 2);
              return (
                <View
                  key={player.id}
                  style={[
                    styles.cell,
                    {
                      width: cellWidth,
                      marginRight: isLeftCol ? GRID_COL_GAP : 0,
                      marginBottom: row < totalRows - 1 ? GRID_ROW_GAP : 0,
                    },
                  ]}
                >
                  <ShareAvatar
                    player={player}
                    ringSize={GRID_AVATAR_RING}
                    imageSize={GRID_AVATAR_IMAGE}
                    iconSize={Math.round(120 * CARD_SCALE)}
                  />
                  <Text style={styles.name} numberOfLines={2}>
                    {player.name}
                  </Text>
                  {(() => {
                    const meta = getPlayerMeta(player, t);
                    return meta ? (
                      <Text style={styles.meta} numberOfLines={3}>
                        {meta}
                      </Text>
                    ) : null;
                  })()}
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
  grid: {
    marginTop: s(18),
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: s(20),
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.28)',
    paddingVertical: GRID_CELL_PADDING_V,
    paddingHorizontal: s(12),
    minHeight: GRID_CELL_HEIGHT,
  },
  avatarRing: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(250, 47, 64, 0.55)',
    borderWidth: 3,
  },
  name: {
    color: '#fff',
    fontSize: s(26),
    fontFamily: 'Gilroy-Bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: s(12),
    width: '100%',
  },
  meta: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: s(20),
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginTop: s(6),
    width: '100%',
    lineHeight: s(26),
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
