import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';
import { starPoints } from './ArenaLayers';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getPlayerCoverUrl,
  getTeamLogoUrl,
  isAssetKnownMissing,
  markAssetMissing,
} from '../utils/teamAssets';

export type CoverTeam = { teamId: string; teamName: string };

type Props = {
  playerId: string;
  team: CoverTeam | null;
  /** Owner or admin: can set / replace the custom cover. */
  canEditCover?: boolean;
  /** Admin: can upload the team emblem right from the profile. */
  canEditTeamLogo?: boolean;
  onPickCover?: () => void;
  onRemoveCover?: () => void;
  onPickTeamLogo?: () => void;
  /** Bumped by the parent after an upload so the images re-resolve. */
  refreshKey?: number;
  width: number;
};

const HEIGHT = 128;
const TILE = 54;

const initialsOf = (name: string) =>
  name
    .replace(/["«»()]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/**
 * Club-branded band under the avatar. Priority: the player's own cover →
 * team emblem watermark pattern → team initials pattern → brand star.
 * Every layer is drawn underneath the next so a 404 never leaves a hole.
 */
const TeamCover: React.FC<Props> = ({
  playerId,
  team,
  canEditCover = false,
  canEditTeamLogo = false,
  onPickCover,
  onRemoveCover,
  onPickTeamLogo,
  refreshKey = 0,
  width,
}) => {
  const { t } = useLanguage();
  const coverUrl = useMemo(() => getPlayerCoverUrl(playerId), [playerId, refreshKey]);
  const logoUrl = useMemo(() => (team ? getTeamLogoUrl(team.teamId) : null), [team, refreshKey]);

  const [coverOk, setCoverOk] = useState<boolean | null>(() =>
    isAssetKnownMissing(coverUrl) ? false : null
  );
  const [logoOk, setLogoOk] = useState<boolean | null>(() =>
    logoUrl && isAssetKnownMissing(logoUrl) ? false : null
  );

  useEffect(() => {
    setCoverOk(isAssetKnownMissing(coverUrl) ? false : null);
  }, [coverUrl]);
  useEffect(() => {
    setLogoOk(logoUrl && isAssetKnownMissing(logoUrl) ? false : null);
  }, [logoUrl]);

  if (!team && coverOk === false && !canEditCover) {
    return null;
  }

  const w = Math.max(width, 200);
  const showLogoPattern = !!logoUrl && logoOk !== false;
  const showInitials = !!team && logoOk === false;
  const initials = team ? initialsOf(team.teamName) : '';

  // Two staggered rows of watermarks — enough rhythm to read as "wallpaper",
  // never busy enough to compete with the avatar above.
  const cols = Math.ceil(w / (TILE * 1.55)) + 1;
  const tiles: { x: number; y: number; key: string }[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({
        key: `${row}-${col}`,
        x: col * TILE * 1.55 + (row % 2 ? TILE * 0.78 : 0) - TILE * 0.4,
        y: row * TILE * 1.0 - TILE * 0.35,
      });
    }
  }

  return (
    <View style={[styles.wrap, { width: w }]}>
      <LinearGradient
        colors={['#25222f', '#17161d', '#100f14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* brand star peeking from the right edge — the only ornament when there is no team */}
      {!team && (
        <Svg width={w} height={HEIGHT} style={StyleSheet.absoluteFill}>
          <Polygon
            points={starPoints(w * 0.9, HEIGHT * 0.15, HEIGHT * 0.9, -14)}
            fill="#fa2f40"
            fillOpacity={0.05}
            stroke="#fa2f40"
            strokeOpacity={0.18}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      )}

      {showLogoPattern && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {tiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: logoUrl! }}
              style={[styles.tile, { left: tile.x, top: tile.y }]}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
              onError={() => {
                markAssetMissing(logoUrl!);
                setLogoOk(false);
              }}
              onLoad={() => setLogoOk(true)}
            />
          ))}
          <Image
            source={{ uri: logoUrl! }}
            style={styles.heroLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />
        </View>
      )}

      {showInitials && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {tiles.map((tile) => (
            <Text
              key={tile.key}
              style={[styles.tileText, { left: tile.x, top: tile.y + 6 }]}
              numberOfLines={1}
            >
              {initials}
            </Text>
          ))}
          <Text style={styles.heroInitials} numberOfLines={1}>
            {initials}
          </Text>
        </View>
      )}

      {/* custom cover sits on top of everything club-branded */}
      {coverOk !== false && (
        <Image
          source={{ uri: coverUrl }}
          style={[StyleSheet.absoluteFill, { opacity: coverOk ? 1 : 0 }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={250}
          onError={() => {
            markAssetMissing(coverUrl);
            setCoverOk(false);
          }}
          onLoad={() => setCoverOk(true)}
        />
      )}

      <LinearGradient
        colors={['rgba(8,8,12,0)', 'rgba(8,8,12,0.55)', 'rgba(8,8,12,0.88)']}
        locations={[0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* club line */}
      {team && (
        <View style={styles.clubRow} pointerEvents="none">
          {showLogoPattern && logoOk && (
            <Image
              source={{ uri: logoUrl! }}
              style={styles.clubBadge}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          )}
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.clubEyebrow}>{t('profile.currentTeam').toUpperCase()}</Text>
            <Text style={styles.clubName} numberOfLines={1}>
              {team.teamName}
            </Text>
          </View>
        </View>
      )}

      {(canEditCover || canEditTeamLogo) && (
        <View style={styles.actions}>
          {canEditTeamLogo && team && (
            <TouchableOpacity style={styles.chip} onPress={onPickTeamLogo} activeOpacity={0.8}>
              <Ionicons name="shield-outline" size={13} color="#fff" />
              <Text style={styles.chipText}>
                {logoOk ? t('profile.teamLogo') : t('profile.uploadTeamLogo')}
              </Text>
            </TouchableOpacity>
          )}
          {canEditCover && (
            <TouchableOpacity style={styles.chip} onPress={onPickCover} activeOpacity={0.8}>
              <Ionicons name="image-outline" size={13} color="#fff" />
              <Text style={styles.chipText}>
                {coverOk ? t('profile.changeCover') : t('profile.cover')}
              </Text>
            </TouchableOpacity>
          )}
          {canEditCover && coverOk && onRemoveCover && (
            <TouchableOpacity style={[styles.chip, styles.chipIcon]} onPress={onRemoveCover} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={13} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: '#17161d',
  },
  tile: {
    position: 'absolute',
    width: TILE,
    height: TILE,
    opacity: 0.09,
    transform: [{ rotate: '-12deg' }],
  },
  heroLogo: {
    position: 'absolute',
    right: -22,
    top: -18,
    width: HEIGHT * 1.25,
    height: HEIGHT * 1.25,
    opacity: 0.2,
    transform: [{ rotate: '-8deg' }],
  },
  tileText: {
    position: 'absolute',
    fontFamily: 'Gilroy-Bold',
    fontSize: 28,
    color: '#ffffff',
    opacity: 0.055,
    letterSpacing: 2,
    transform: [{ rotate: '-12deg' }],
  },
  heroInitials: {
    position: 'absolute',
    right: -6,
    top: -30,
    fontFamily: 'Gilroy-Bold',
    fontSize: 150,
    color: '#ffffff',
    opacity: 0.08,
    letterSpacing: -6,
  },
  clubRow: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clubBadge: {
    width: 34,
    height: 34,
  },
  clubEyebrow: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 2,
  },
  clubName: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.2,
  },
  actions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  chipIcon: {
    paddingHorizontal: 8,
  },
  chipText: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 11,
    color: '#fff',
  },
});

export default React.memo(TeamCover);
