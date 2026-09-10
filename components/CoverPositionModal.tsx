import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

export type CoverSource = { uri: string; width: number; height: number };

type Props = {
  visible: boolean;
  source: CoverSource | null;
  /** Aspect of the real cover band (width / height). */
  aspect: number;
  onCancel: () => void;
  /** Receives a cropped, already framed image file. */
  onConfirm: (croppedUri: string) => Promise<void> | void;
};

const OUTPUT_WIDTH = 1200;
const MAX_ZOOM = 3;

/**
 * Lets the user drag / pinch a photo inside a frame with the cover's exact
 * proportions, then bakes the framing into the file (crop + resize) so nothing
 * has to be stored besides the image itself.
 */
const CoverPositionModal: React.FC<Props> = ({ visible, source, aspect, onCancel, onConfirm }) => {
  const { t } = useLanguage();
  const { width: winW, height: winH } = useWindowDimensions();
  const frameW = winW - 32;
  const frameH = Math.round(frameW / aspect);
  const [saving, setSaving] = useState(false);

  // Base scale = "cover" fit; zoom multiplies it.
  const base = useMemo(() => {
    if (!source) return 1;
    return Math.max(frameW / source.width, frameH / source.height);
  }, [source, frameW, frameH]);

  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startZoom = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  useEffect(() => {
    zoom.value = 1;
    tx.value = 0;
    ty.value = 0;
  }, [source, zoom, tx, ty]);

  const imgW = source ? source.width * base : 0;
  const imgH = source ? source.height * base : 0;

  // Keep the frame fully covered: translation bounded by the overflow on each axis.
  const clamp = (v: number, z: number, img: number, frame: number) => {
    'worklet';
    const maxShift = Math.max(0, (img * z - frame) / 2);
    return Math.min(maxShift, Math.max(-maxShift, v));
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = clamp(startTx.value + e.translationX, zoom.value, imgW, frameW);
      ty.value = clamp(startTy.value + e.translationY, zoom.value, imgH, frameH);
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, startZoom.value * e.scale));
      zoom.value = z;
      tx.value = clamp(tx.value, z, imgW, frameW);
      ty.value = clamp(ty.value, z, imgH, frameH);
    })
    .onEnd(() => {
      zoom.value = withTiming(zoom.value);
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  const commit = async (z: number, x: number, y: number) => {
    if (!source) return;
    setSaving(true);
    try {
      const s = base * z;
      // Visible window in source pixels
      const cropW = frameW / s;
      const cropH = frameH / s;
      const originX = (source.width - cropW) / 2 - x / s;
      const originY = (source.height - cropH) / 2 - y / s;
      const safe = (v: number, max: number) => Math.min(Math.max(0, Math.round(v)), Math.max(0, max));
      const cw = Math.min(Math.round(cropW), source.width);
      const ch = Math.min(Math.round(cropH), source.height);
      const result = await ImageManipulator.manipulateAsync(
        source.uri,
        [
          { crop: { originX: safe(originX, source.width - cw), originY: safe(originY, source.height - ch), width: cw, height: ch } },
          { resize: { width: Math.min(OUTPUT_WIDTH, cw) } },
        ],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );
      await onConfirm(result.uri);
    } catch (e) {
      console.error('cover crop failed', e);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    commit(zoom.value, tx.value, ty.value);
  };

  if (!source) return null;

  const overlayTop = Math.max(0, (winH - frameH) / 2 - 40);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn} disabled={saving}>
            <Text style={styles.headerBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('profile.positionCover')}</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.headerBtn, styles.headerBtnPrimary]} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.headerBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <GestureDetector gesture={gesture}>
          <View style={styles.stage}>
            {/* image is centered on the frame; everything outside the frame is dimmed */}
            <View style={[styles.frameAnchor, { top: overlayTop, left: 16, width: frameW, height: frameH }]}>
              <Animated.View style={[styles.imageWrap, { width: imgW, height: imgH, left: (frameW - imgW) / 2, top: (frameH - imgH) / 2 }, imageStyle]}>
                <Image source={{ uri: source.uri }} style={{ width: imgW, height: imgH }} contentFit="fill" />
              </Animated.View>
            </View>
            <View pointerEvents="none" style={[styles.dim, { top: 0, height: overlayTop }]} />
            <View pointerEvents="none" style={[styles.dim, { top: overlayTop + frameH, bottom: 0 }]} />
            <View pointerEvents="none" style={[styles.dimSide, { top: overlayTop, height: frameH, left: 0, width: 16 }]} />
            <View pointerEvents="none" style={[styles.dimSide, { top: overlayTop, height: frameH, right: 0, width: 16 }]} />
            <View pointerEvents="none" style={[styles.frame, { top: overlayTop, left: 16, width: frameW, height: frameH }]} />
          </View>
        </GestureDetector>

        <View style={styles.hintRow}>
          <Ionicons name="move-outline" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.hint}>{t('profile.positionCoverHint')}</Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0a0f' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontFamily: 'Gilroy-Bold', fontSize: 16 },
  headerBtn: { paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', minWidth: 90, alignItems: 'center' },
  headerBtnPrimary: { backgroundColor: '#fa2f40' },
  headerBtnText: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Gilroy-Bold', fontSize: 14 },
  stage: { flex: 1, overflow: 'hidden' },
  frameAnchor: { position: 'absolute', overflow: 'visible' },
  imageWrap: { position: 'absolute' },
  dim: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(11,10,15,0.78)' },
  dimSide: { position: 'absolute', backgroundColor: 'rgba(11,10,15,0.78)' },
  frame: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24 },
  hint: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Gilroy-Regular', fontSize: 13 },
});

export default CoverPositionModal;
