/**
 * The card, ready to show at a counter: black background, screen at full
 * brightness and kept awake, pinch to zoom, front/back switch, and a
 * rotate button that turns a card sideways to fill the screen. Tap the card
 * to hide everything else. Notes sit underneath.
 */

import * as Brightness from 'expo-brightness';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Pencil, Pin, PinOff, RotateCw, Sun, SunDim } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardArt } from '@/components/CardArt';
import { IconButton, T } from '@/components/ui';
import { ZoomableImage } from '@/components/ZoomableImage';
import { useCard, useCardImages, useCategories, useDb, useSettings } from '@/db/DataProvider';
import { markUsed, setPinned } from '@/db/repo';
import { jpegUri, type Side } from '@/lib/types';
import { categoryColor, CARD_ASPECT, radius, space } from '@/theme/tokens';

const FG = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.62)';
const PANEL = 'rgba(255,255,255,0.08)';

async function brighten() {
  try {
    await Brightness.setBrightnessAsync(1);
  } catch {
    // Not available; carry on.
  }
}
async function restoreBrightness() {
  try {
    if (Platform.OS === 'android') await Brightness.restoreSystemBrightnessAsync();
  } catch {
    // Leaving the screen restores it anyway on Android.
  }
}

export default function CardView() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const settings = useSettings();
  const { data: card, loaded } = useCard(id);
  const { data: images } = useCardImages(id);
  const { data: categories } = useCategories();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const [side, setSide] = useState<Side>('front');
  const [immersive, setImmersive] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [brightChoice, setBright] = useState<boolean | null>(null);
  const bright = brightChoice ?? settings.maxBrightness;
  const counted = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (bright) brighten();
      else restoreBrightness();
      return () => {
        restoreBrightness();
      };
    }, [bright]),
  );

  useEffect(() => {
    if (id && card && !counted.current) {
      counted.current = true;
      markUsed(db, id);
    }
  }, [db, id, card]);

  useEffect(() => {
    if (loaded && !card) router.back();
  }, [loaded, card]);

  const image = images[side] ?? (side === 'back' ? undefined : images.back);
  const hasBack = !!images.back;
  const category = card?.categoryId ? categories.find((c) => c.id === card.categoryId) : undefined;
  const uri = jpegUri(image?.full);

  // Size the picture to fit the space it has, keeping its own shape.
  const ratio = image ? image.width / image.height : CARD_ASPECT;
  const availW = winW - (immersive ? 0 : space[4] * 2);
  const availH = immersive ? winH - insets.top - insets.bottom : winH * 0.46;
  // When rotated, the picture's width runs along the screen's height.
  const [boxW, boxH] = rotated ? [availH, availW] : [availW, availH];
  let w = boxW;
  let h = w / ratio;
  if (h > boxH) {
    h = boxH;
    w = h * ratio;
  }
  const frameW = rotated ? h : w;
  const frameH = rotated ? w : h;

  if (!card) return <View style={styles.root} />;

  const cardView = uri ? (
    <View style={{ width: frameW, height: frameH, alignItems: 'center', justifyContent: 'center' }}>
      <ZoomableImage
        uri={uri}
        width={w}
        height={h}
        rotation={rotated ? 90 : 0}
        onTap={() => setImmersive((v) => !v)}
        resetKey={`${side}-${rotated}-${immersive}`}
      />
    </View>
  ) : (
    <Pressable onPress={() => setImmersive((v) => !v)} style={{ width: availW }}>
      <CardArt uri={null} title={card.title} color={category?.color} big />
    </Pressable>
  );

  if (immersive) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar hidden />
        {cardView}
        <View style={[styles.immersiveBar, { bottom: insets.bottom + space[4] }]}>
          {hasBack ? <SideSwitch side={side} onChange={setSide} /> : null}
          <IconButton icon={RotateCw} label="Rotate" color={FG} background={PANEL} onPress={() => setRotated((r) => !r)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.topBar, { paddingTop: insets.top + space[1] }]}>
        <IconButton icon={ChevronLeft} label="Back" color={FG} size={26} onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <IconButton
          icon={bright ? Sun : SunDim}
          label={bright ? 'Normal brightness' : 'Full brightness'}
          color={bright ? '#FFD84D' : FG}
          onPress={() => setBright(!bright)}
        />
        <IconButton
          icon={card.pinned ? PinOff : Pin}
          label={card.pinned ? 'Unpin' : 'Pin to top'}
          color={FG}
          onPress={() => setPinned(db, card.id, !card.pinned)}
        />
        <IconButton
          icon={Pencil}
          label="Edit card"
          color={FG}
          onPress={() => router.push({ pathname: '/edit', params: { id: card.id } })}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }} bounces={false}>
        <View style={[styles.stage, { minHeight: rotated ? frameH + space[6] : undefined }]}>{cardView}</View>

        <View style={styles.controls}>
          {hasBack ? <SideSwitch side={side} onChange={setSide} /> : <View />}
          <IconButton icon={RotateCw} label="Rotate" color={FG} background={PANEL} onPress={() => setRotated((r) => !r)} />
        </View>
        <T variant="caption" color={MUTED} style={{ textAlign: 'center', marginTop: space[2] }}>
          Tap the card for full screen · pinch to zoom
        </T>

        <View style={styles.details}>
          <T variant="title" color={FG} selectable>
            {card.title}
          </T>
          {category ? (
            <View style={styles.catRow}>
              <View style={[styles.dot, { backgroundColor: categoryColor(category.color) }]} />
              <T variant="label" color={MUTED}>
                {category.name}
                {category.active ? '' : ' (switched off)'}
              </T>
            </View>
          ) : null}
          <View style={[styles.notes, { backgroundColor: PANEL }]}>
            <T variant="eyebrow" color={MUTED}>
              Notes
            </T>
            {card.notes ? (
              <T color={FG} selectable>
                {card.notes}
              </T>
            ) : (
              <Pressable onPress={() => router.push({ pathname: '/edit', params: { id: card.id } })}>
                <T color={MUTED}>
                  No notes yet. Tap to add membership numbers, PINs to remember where they’re kept, expiry dates…
                </T>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SideSwitch({ side, onChange }: { side: Side; onChange: (s: Side) => void }) {
  return (
    <View style={styles.switch} accessibilityRole="tablist">
      {(['front', 'back'] as const).map((s) => (
        <Pressable
          key={s}
          accessibilityRole="tab"
          accessibilityState={{ selected: side === s }}
          onPress={() => onChange(s)}
          style={[styles.switchItem, side === s && { backgroundColor: FG }]}
        >
          <T variant="label" color={side === s ? '#000' : FG}>
            {s === 'front' ? 'Front' : 'Back'}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2] },
  stage: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[4], paddingTop: space[3] },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    marginTop: space[4],
  },
  switch: { flexDirection: 'row', backgroundColor: PANEL, borderRadius: radius.pill, padding: 4 },
  switchItem: {
    paddingHorizontal: space[5],
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { paddingHorizontal: space[4], paddingTop: space[6], gap: space[3] },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  notes: { borderRadius: radius.lg, padding: space[4], gap: space[2], marginTop: space[2] },
  immersiveBar: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
