import React, { useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { roundedStarPath } from './ArenaLayers';
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
  height: number;
  /** Absolute placement is decided by the parent (bleeds to screen edges on phones). */
  style?: StyleProp<ViewStyle>;
};

const TILE = 58;

const initialsOf = (name: string) =>
  name
    .replace(/["«»()]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/**
 * Header band behind the avatar (VK-style, no text). Priority: the player's
 * own cover → team emblem watermark → team initials watermark → brand star.
 * Layers are stacked so a 404 never leaves a hole.
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
  height,
  style,
}) => {
  const { t } = useLanguage();
  const [width, setWidth] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const coverUrl = useMemo(() => getPlayerCoverUrl(playerId), [playerId, refreshKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const showLogoPattern = !!logoUrl && logoOk !== false;
  const showInitials = !!team && logoOk === false;
  const initials = team ? initialsOf(team.teamName) : '';

  // Staggered watermark grid: enough rhythm to read as club wallpaper,
  // never busy enough to fight the avatar sitting on the bottom edge.
  const tiles = useMemo(() => {
    if (!width) return [];
    const stepX = TILE * 1.6;
    const stepY = TILE * 1.05;
    const cols = Math.ceil(width / stepX) + 2;
    const rows = Math.ceil(height / stepY) + 1;
    const out: { x: number; y: number; key: string }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        out.push({
          key: `${row}-${col}`,
          x: col * stepX + (row % 2 ? stepX / 2 : 0) - TILE * 0.6,
          y: row * stepY - TILE * 0.4,
        });
      }
    }
    return out;
  }, [width, height]);

  return (
    <View
      style={[styles.wrap, { height }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <LinearGradient
        colors={['#2a2636', '#1a1821', '#121116']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {!team && width > 0 && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Path
            d={roundedStarPath(width * 0.82, height * 0.35, height * 0.75, -14)}
            fill="#fa2f40"
            fillOpacity={0.07}
            stroke="#fa2f40"
            strokeOpacity={0.22}
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
            style={[styles.heroLogo, { width: height * 1.3, height: height * 1.3, top: -height * 0.15 }]}
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
              style={[styles.tileText, { left: tile.x, top: tile.y + 8 }]}
              numberOfLines={1}
            >
              {initials}
            </Text>
          ))}
          <Text style={[styles.heroInitials, { fontSize: height * 1.1, top: -height * 0.22 }]} numberOfLines={1}>
            {initials}
          </Text>
        </View>
      )}

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

      {/* darkens the bottom so the avatar ring and name below stay crisp */}
      <LinearGradient
        colors={['rgba(10,10,14,0.15)', 'rgba(10,10,14,0)', 'rgba(10,10,14,0.55)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {(canEditCover || canEditTeamLogo) && (
        <View style={styles.actions}>
          {canEditCover && (
            <TouchableOpacity style={styles.chip} onPress={onPickCover} activeOpacity={0.8}>
              <Ionicons name="pencil" size={13} color="#fff" />
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
          {canEditTeamLogo && team && (
            <TouchableOpacity style={styles.chip} onPress={onPickTeamLogo} activeOpacity={0.8}>
              <Ionicons name="shield-outline" size={13} color="#fff" />
              <Text style={styles.chipText}>
                {logoOk ? t('profile.teamLogo') : t('profile.uploadTeamLogo')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#1a1821',
  },
  tile: {
    position: 'absolute',
    width: TILE,
    height: TILE,
    opacity: 0.1,
    transform: [{ rotate: '-12deg' }],
  },
  heroLogo: {
    position: 'absolute',
    right: -28,
    opacity: 0.22,
    transform: [{ rotate: '-8deg' }],
  },
  tileText: {
    position: 'absolute',
    fontFamily: 'Gilroy-Bold',
    fontSize: 30,
    color: '#ffffff',
    opacity: 0.06,
    letterSpacing: 2,
    transform: [{ rotate: '-12deg' }],
  },
  heroInitials: {
    position: 'absolute',
    right: -4,
    fontFamily: 'Gilroy-Bold',
    color: '#ffffff',
    opacity: 0.08,
    letterSpacing: -6,
  },
  actions: {
    position: 'absolute',
    top: 12,
    left: 14,
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipIcon: {
    paddingHorizontal: 9,
  },
  chipText: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 11,
    color: '#fff',
  },
});

export default React.memo(TeamCover);
