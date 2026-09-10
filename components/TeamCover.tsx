import React, { useEffect, useMemo, useState } from 'react';
import { ImageBackground, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlayerCoverUrl, useTeamLogoUrl } from '../hooks/useTeamAssetUrl';
import { resolveAssetUrl } from '../utils/teamAssets';

export type CoverTeam = { teamId: string; teamName: string };

type AssetLayer = 'pending' | 'present' | 'missing';

type Props = {
  playerId: string;
  team: CoverTeam | null;
  /** Teams list finished loading — avoids stars → logo flash while teams are still fetching. */
  teamsReady?: boolean;
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
 * Fallback layers stay hidden until the higher-priority asset probe finishes.
 */
const TeamCover: React.FC<Props> = ({
  playerId,
  team,
  teamsReady = true,
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
  const coverUrl = usePlayerCoverUrl(playerId, refreshKey);
  const logoUrl = useTeamLogoUrl(team?.teamId, refreshKey);

  const [coverLayer, setCoverLayer] = useState<AssetLayer>('pending');
  const [logoLayer, setLogoLayer] = useState<AssetLayer>('pending');

  useEffect(() => {
    if (!coverUrl) return;
    let cancelled = false;
    setCoverLayer('pending');
    void resolveAssetUrl(coverUrl).then((result) => {
      if (!cancelled) setCoverLayer(result);
    });
    return () => {
      cancelled = true;
    };
  }, [coverUrl, refreshKey]);

  useEffect(() => {
    if (coverLayer !== 'missing') {
      setLogoLayer('pending');
      return;
    }
    if (!logoUrl) {
      setLogoLayer('missing');
      return;
    }
    let cancelled = false;
    setLogoLayer('pending');
    void resolveAssetUrl(logoUrl).then((result) => {
      if (!cancelled) setLogoLayer(result);
    });
    return () => {
      cancelled = true;
    };
  }, [coverLayer, logoUrl, refreshKey]);

  const showCoverImage = !!coverUrl && coverLayer !== 'missing';
  const showLogoPattern = coverLayer === 'missing' && logoLayer === 'present' && !!logoUrl;
  const showTeamName = coverLayer === 'missing' && logoLayer === 'missing' && !!team && teamsReady;
  const showStars = coverLayer === 'missing' && logoLayer === 'missing' && !team && teamsReady;

  const starTiles = useMemo(
    () => (showStars ? staggeredGrid(width, height, STAR, STAR_PITCH_X, STAR_PITCH_Y) : []),
    [showStars, width, height]
  );

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

  const hasCustomCover = coverLayer === 'present';

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
        <ImageBackground
          source={{ uri: logoUrl! }}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.logoRepeatImage}
          resizeMode="repeat"
        />
      )}

      {showTeamName && (
        <>
          <View style={[StyleSheet.absoluteFill, { top: -NAME_LINE * 0.35 }]} pointerEvents="none">
            {nameRows.map((row, i) => (
              <Text
                key={row.key}
                style={[
                  styles.nameRow,
                  { marginLeft: row.shift, color: i % 2 ? NAME_COLOR_ALT : NAME_COLOR },
                ]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {row.text}
              </Text>
            ))}
          </View>
          <LinearGradient
            colors={['rgba(250,47,64,0.10)', 'rgba(20,19,25,0)', 'rgba(15,14,18,0.55)']}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </>
      )}

      {showCoverImage && (
        <Image
          source={{ uri: coverUrl! }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          recyclingKey={`cover-${playerId}`}
          transition={0}
          onError={() => setCoverLayer('missing')}
        />
      )}

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
                {hasCustomCover ? t('profile.changeCover') : t('profile.cover')}
              </Text>
            </TouchableOpacity>
          )}
          {canEditCover && hasCustomCover && onRemoveCover && (
            <TouchableOpacity style={[styles.chip, styles.chipIcon]} onPress={onRemoveCover} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={13} color="#fff" />
            </TouchableOpacity>
          )}
          {canEditTeamLogo && team && (
            <TouchableOpacity style={styles.chip} onPress={onPickTeamLogo} activeOpacity={0.8}>
              <Ionicons name="shield-outline" size={13} color="#fff" />
              <Text style={styles.chipText}>
                {logoLayer === 'present' ? t('profile.teamLogo') : t('profile.uploadTeamLogo')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const NAME_FONT = 30;
const NAME_COLOR = 'rgba(250,47,64,0.30)';
const NAME_COLOR_ALT = 'rgba(190,30,48,0.26)';
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
  logoRepeatImage: {
    opacity: 0.26,
  },
  nameRow: {
    height: NAME_LINE,
    lineHeight: NAME_LINE,
    fontFamily: 'Gilroy-Bold',
    fontSize: NAME_FONT,
    letterSpacing: 2.5,
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
