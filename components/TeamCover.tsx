import React, { useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
  /** Fixed height; omit when the parent stretches the band with absolute top/bottom. */
  height?: number;
  /** Absolute placement is decided by the parent (bleeds to screen edges on phones). */
  style?: StyleProp<ViewStyle>;
  /** Reports the rendered band size (used for the crop frame aspect). */
  onMeasure?: (size: { width: number; height: number }) => void;
};

const LOGO_STAR = require('../assets/images/star.png');

/** Brand star wallpaper: star ≈ 2× the share-card size, gap equal to the star, staggered rows. */
const STAR = 52;
const STAR_PITCH_X = STAR * 2;
const STAR_PITCH_Y = STAR * 1.15;

/** Team emblem wallpaper: same rhythm, slightly denser. */
const LOGO = 48;
const LOGO_PITCH_X = LOGO * 1.9;
const LOGO_PITCH_Y = LOGO * 1.1;

type Tile = { x: number; y: number; key: string };

/** Checkerboard grid: every other row shifted by half a pitch. */
const staggeredGrid = (width: number, height: number, size: number, pitchX: number, pitchY: number): Tile[] => {
  if (!width) return [];
  const cols = Math.ceil(width / pitchX) + 2;
  const rows = Math.ceil(height / pitchY) + 1;
  const out: Tile[] = [];
  for (let row = 0; row < rows; row++) {
    const shift = row % 2 ? pitchX / 2 : 0;
    for (let col = 0; col < cols; col++) {
      out.push({ key: `${row}-${col}`, x: col * pitchX + shift - size, y: row * pitchY - size * 0.3 });
    }
  }
  return out;
};

/**
 * Header band behind the avatar (no text). Priority: the player's own cover →
 * team emblem wallpaper → repeated team name → brand star wallpaper.
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
  height: fixedHeight,
  style,
  onMeasure,
}) => {
  const { t } = useLanguage();
  const [width, setWidth] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState(fixedHeight ?? 0);
  const height = fixedHeight ?? measuredHeight;
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
  const showTeamName = !!team && logoOk === false;
  const showStars = !team;

  const starTiles = useMemo(
    () => (showStars ? staggeredGrid(width, height, STAR, STAR_PITCH_X, STAR_PITCH_Y) : []),
    [showStars, width, height]
  );
  const logoTiles = useMemo(
    () => (showLogoPattern ? staggeredGrid(width, height, LOGO, LOGO_PITCH_X, LOGO_PITCH_Y) : []),
    [showLogoPattern, width, height]
  );

  // Repeated club name: enough rows to fill the band, alternate rows offset by half a word.
  const nameRows = useMemo(() => {
    if (!showTeamName || !width) return [];
    const label = team!.teamName.toUpperCase();
    const approxWordWidth = label.length * NAME_FONT * 0.62 + NAME_GAP;
    const repeats = Math.ceil(width / approxWordWidth) + 2;
    const rows = Math.ceil(height / NAME_LINE) + 1;
    return Array.from({ length: rows }, (_, row) => ({
      key: `r${row}`,
      shift: row % 2 ? -approxWordWidth / 2 : 0,
      text: Array.from({ length: repeats }, () => label).join('   '),
    }));
  }, [showTeamName, team, width, height]);

  return (
    <View
      style={[styles.wrap, fixedHeight != null ? { height: fixedHeight } : null, style]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setWidth(w);
        setMeasuredHeight(h);
        onMeasure?.({ width: w, height: h });
      }}
    >
      <LinearGradient
        colors={['#1c1a22', '#141319', '#0f0e12']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {showStars && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {starTiles.map((tile) => (
            <Image
              key={tile.key}
              source={LOGO_STAR}
              style={[styles.starTile, { left: tile.x, top: tile.y }]}
              contentFit="contain"
              transition={0}
            />
          ))}
        </View>
      )}

      {showLogoPattern && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {logoTiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: logoUrl! }}
              style={[styles.logoTile, { left: tile.x, top: tile.y }]}
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
        </View>
      )}

      {showTeamName && (
        <View style={[StyleSheet.absoluteFill, { top: -NAME_LINE * 0.35 }]} pointerEvents="none">
          {nameRows.map((row) => (
            <Text
              key={row.key}
              style={[styles.nameRow, { marginLeft: row.shift }]}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {row.text}
            </Text>
          ))}
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

      {/* keeps name / status / teams readable over a photo; wallpapers are subtle anyway */}
      <LinearGradient
        colors={['rgba(10,10,14,0.3)', 'rgba(10,10,14,0.12)', 'rgba(10,10,14,0.72)']}
        locations={[0, 0.4, 1]}
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

const NAME_FONT = 30;
const NAME_LINE = 38;
const NAME_GAP = 3 * NAME_FONT * 0.3;

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#141319',
  },
  starTile: {
    position: 'absolute',
    width: STAR,
    height: STAR,
    opacity: 0.28,
  },
  logoTile: {
    position: 'absolute',
    width: LOGO,
    height: LOGO,
    opacity: 0.16,
  },
  nameRow: {
    height: NAME_LINE,
    lineHeight: NAME_LINE,
    fontFamily: 'Gilroy-Bold',
    fontSize: NAME_FONT,
    letterSpacing: 1.5,
    color: '#ffffff',
    opacity: 0.11,
  },
  actions: {
    position: 'absolute',
    top: 10,
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
