import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlayerCoverUrl, useTeamLogoUrl } from '../hooks/useTeamAssetUrl';
import {
  CachedCoverState,
  CoverLayerKind,
  getCachedCoverState,
  isAssetKnownMissing,
  markAssetMissing,
  prefetchPlayerCover,
  prefetchTeamLogo,
  resolveAssetUrl,
  setCachedCoverState,
  teamAssetsReady,
} from '../utils/teamAssets';

export type CoverTeam = { teamId: string; teamName: string };

type Props = {
  playerId: string;
  team: CoverTeam | null;
  /** Teams list finished loading — do not persist wallpaper until this is true. */
  teamsReady?: boolean;
  canEditCover?: boolean;
  canEditTeamLogo?: boolean;
  onPickCover?: () => void;
  onRemoveCover?: () => void;
  onPickTeamLogo?: () => void;
  refreshKey?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  onMeasure?: (size: { width: number; height: number }) => void;
};

const LOGO_STAR = require('../assets/images/star.png');

const STAR = 52;
const STAR_PITCH_X = STAR * 2;
const STAR_PITCH_Y = STAR * 1.15;

type Tile = { x: number; y: number; key: string };

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

function rememberCoverState(playerId: string, kind: CoverLayerKind, team: CoverTeam | null) {
  setCachedCoverState(playerId, {
    kind,
    teamId: team?.teamId,
  });
}

/** Live wallpaper pick — team info overrides stale cached "stars". */
function resolveUnderlayKind(
  team: CoverTeam | null,
  teamsReady: boolean,
  cached: CachedCoverState | null,
  hasCustomCover: boolean,
  logoMissing: boolean,
  effectiveTeamId: string | null,
): CoverLayerKind {
  if (hasCustomCover) return 'stars';

  if (team) {
    return logoMissing ? 'teamname' : 'logo';
  }

  if (teamsReady && !team) {
    return 'stars';
  }

  if (!teamsReady && effectiveTeamId) {
    if (cached?.kind === 'logo' && cached.teamId === effectiveTeamId) return 'logo';
    if (cached?.kind === 'teamname' && cached.teamId === effectiveTeamId) return 'teamname';
  }

  return 'stars';
}

/**
 * Header band behind the avatar. Custom photo loads on top; wallpaper updates
 * when team data arrives (never lock early "stars" from slow team fetch).
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

  const [cachedCover, setCachedCover] = useState<CachedCoverState | null>(() =>
    getCachedCoverState(playerId)
  );
  const [hasCustomCover, setHasCustomCover] = useState(
    () => getCachedCoverState(playerId)?.kind === 'photo'
  );

  const effectiveTeamId = team?.teamId ?? cachedCover?.teamId ?? null;
  const coverUrl = usePlayerCoverUrl(playerId, refreshKey);
  const logoUrl = useTeamLogoUrl(effectiveTeamId, refreshKey);

  useEffect(() => {
    let cancelled = false;
    void teamAssetsReady().then(() => {
      if (!cancelled) {
        const next = getCachedCoverState(playerId);
        setCachedCover(next);
        setHasCustomCover(next?.kind === 'photo');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [playerId, refreshKey]);

  useEffect(() => {
    if (!coverUrl || isAssetKnownMissing(coverUrl)) return;
    void prefetchPlayerCover(playerId);
  }, [coverUrl, playerId, refreshKey]);

  useEffect(() => {
    if (!logoUrl || !effectiveTeamId) return;
    if (isAssetKnownMissing(logoUrl)) return;
    void prefetchTeamLogo(effectiveTeamId);
  }, [logoUrl, effectiveTeamId, refreshKey]);

  useEffect(() => {
    if (!teamsReady) return;

    let cancelled = false;
    void (async () => {
      await teamAssetsReady();
      if (cancelled || !coverUrl) return;

      if (!isAssetKnownMissing(coverUrl)) {
        const photo = await resolveAssetUrl(coverUrl);
        if (cancelled) return;
        if (photo === 'present') {
          rememberCoverState(playerId, 'photo', team);
          setCachedCover(getCachedCoverState(playerId));
          return;
        }
      }

      if (!team) {
        rememberCoverState(playerId, 'stars', null);
        setCachedCover(getCachedCoverState(playerId));
        return;
      }

      if (!logoUrl || isAssetKnownMissing(logoUrl)) {
        rememberCoverState(playerId, 'teamname', team);
        setCachedCover(getCachedCoverState(playerId));
        return;
      }

      const logo = await resolveAssetUrl(logoUrl);
      if (cancelled) return;
      rememberCoverState(playerId, logo === 'present' ? 'logo' : 'teamname', team);
      setCachedCover(getCachedCoverState(playerId));
    })();

    return () => {
      cancelled = true;
    };
  }, [coverUrl, logoUrl, team, playerId, refreshKey, teamsReady]);

  const coverKnownMissing = !!coverUrl && isAssetKnownMissing(coverUrl);
  /** Skip custom-cover fetch while team wallpaper is expected — weak networks stay on logo. */
  const showCoverPhoto =
    !!coverUrl &&
    !coverKnownMissing &&
    (hasCustomCover || cachedCover?.kind === 'photo' || !team);
  const logoMissing = !!logoUrl && isAssetKnownMissing(logoUrl);

  const underlayKind = resolveUnderlayKind(
    team,
    teamsReady,
    cachedCover,
    hasCustomCover,
    logoMissing,
    effectiveTeamId,
  );

  const showStars = underlayKind === 'stars';
  const showLogoPattern = underlayKind === 'logo' && !!logoUrl && !logoMissing;
  const showTeamName = underlayKind === 'teamname' && !!team;

  const layoutWidth = width > 0 ? width : Dimensions.get('window').width + 40;
  const layoutHeight = height > 0 ? height : 160;

  const starTiles = useMemo(
    () => (showStars ? staggeredGrid(layoutWidth, layoutHeight, STAR, STAR_PITCH_X, STAR_PITCH_Y) : []),
    [showStars, layoutWidth, layoutHeight]
  );

  const nameRows = useMemo(() => {
    if (!showTeamName || !team) return [];
    const label = team.teamName.toUpperCase();
    const approxWordWidth = label.length * NAME_FONT * 0.62 + NAME_GAP;
    const repeats = Math.ceil(layoutWidth / approxWordWidth) + 2;
    const rows = Math.ceil(layoutHeight / NAME_LINE) + 1;
    return Array.from({ length: rows }, (_, row) => ({
      key: `r${row}`,
      shift: row % 2 ? -approxWordWidth / 2 : 0,
      text: Array.from({ length: repeats }, () => label).join('   '),
    }));
  }, [showTeamName, team, layoutWidth, layoutHeight]);

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
          key={logoUrl}
          source={{ uri: logoUrl! }}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.logoRepeatImage}
          resizeMode="repeat"
        />
      )}

      {showTeamName && team && (
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

      {showCoverPhoto && (
        <Image
          source={{ uri: coverUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          recyclingKey={`cover-${playerId}`}
          transition={0}
          onLoad={() => {
            setHasCustomCover(true);
            rememberCoverState(playerId, 'photo', team);
            setCachedCover(getCachedCoverState(playerId));
          }}
          onError={() => {
            markAssetMissing(coverUrl);
            setHasCustomCover(false);
            const kind: CoverLayerKind = team ? (logoMissing ? 'teamname' : 'logo') : 'stars';
            rememberCoverState(playerId, kind, team);
            setCachedCover(getCachedCoverState(playerId));
          }}
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
                {showLogoPattern ? t('profile.teamLogo') : t('profile.uploadTeamLogo')}
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
