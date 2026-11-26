/**
 * A picture you can pinch to zoom, drag when zoomed, and double-tap to
 * zoom in or back out. A single tap calls onTap.
 */

import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const MAX_SCALE = 5;
const SNAP = { duration: 180 };

export function ZoomableImage({
  uri,
  width,
  height,
  rotation = 0,
  onTap,
  resetKey,
}: {
  uri: string;
  width: number;
  height: number;
  rotation?: number;
  onTap?: () => void;
  /** Change it to snap back to 1×. */
  resetKey?: unknown;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  useEffect(() => {
    scale.set(withTiming(1, SNAP));
    savedScale.set(1);
    tx.set(withTiming(0, SNAP));
    ty.set(withTiming(0, SNAP));
    savedTx.set(0);
    savedTy.set(0);
  }, [resetKey, scale, savedScale, tx, ty, savedTx, savedTy]);

  // translateX/translateY act in screen space (before rotate), so swap bounds when rotated 90°/270°.
  const rotatedQuarter = Math.abs(rotation) % 180 !== 0;
  const boundW = rotatedQuarter ? height : width;
  const boundH = rotatedQuarter ? width : height;

  const clampPan = (s: number) => {
    'worklet';
    const maxX = ((s - 1) * boundW) / 2;
    const maxY = ((s - 1) * boundH) / 2;
    tx.set(Math.min(maxX, Math.max(-maxX, tx.get())));
    ty.set(Math.min(maxY, Math.max(-maxY, ty.get())));
  };

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      scale.set(Math.min(MAX_SCALE * 1.2, Math.max(0.8, savedScale.get() * e.scale)));
    },
    onDeactivate: () => {
      'worklet';
      const s = Math.min(MAX_SCALE, Math.max(1, scale.get()));
      scale.set(withTiming(s, SNAP));
      savedScale.set(s);
      clampPan(s);
      savedTx.set(tx.get());
      savedTy.set(ty.get());
    },
  });

  const pan = usePanGesture({
    minPointers: 1,
    maxPointers: 2,
    onUpdate: (e) => {
      'worklet';
      if (savedScale.get() <= 1 && scale.get() <= 1) return;
      tx.set(savedTx.get() + e.translationX);
      ty.set(savedTy.get() + e.translationY);
    },
    onDeactivate: () => {
      'worklet';
      clampPan(savedScale.get());
      tx.set(withTiming(tx.get(), SNAP));
      ty.set(withTiming(ty.get(), SNAP));
      savedTx.set(tx.get());
      savedTy.set(ty.get());
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      const next = savedScale.get() > 1 ? 1 : 2.5;
      scale.set(withTiming(next, SNAP));
      savedScale.set(next);
      tx.set(withTiming(0, SNAP));
      ty.set(withTiming(0, SNAP));
      savedTx.set(0);
      savedTy.set(0);
    },
  });

  const singleTap = useTapGesture({
    numberOfTaps: 1,
    onActivate: () => {
      'worklet';
      if (onTap) scheduleOnRN(onTap);
    },
  });

  const taps = useExclusiveGestures(doubleTap, singleTap);
  const gesture = useSimultaneousGestures(pinch, pan, taps);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }, { rotate: `${rotation}deg` }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, style]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          cachePolicy="memory"
          transition={0}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </GestureDetector>
  );
}
