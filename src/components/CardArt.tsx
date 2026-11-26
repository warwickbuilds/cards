/**
 * A card-shaped picture. Shows the photo, or a coloured placeholder with the
 * card's initials when there isn't one yet, so the wallet never has blank holes.
 */

import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { categoryColor, CARD_ASPECT, radius } from '@/theme/tokens';

import { T } from './ui';

export function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function CardArt({
  uri,
  title,
  color,
  style,
  big,
  contentFit = 'cover',
}: {
  uri: string | null;
  title: string;
  color?: string | null;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
  contentFit?: 'cover' | 'contain';
}) {
  const bg = categoryColor(color);
  return (
    <View style={[styles.card, { aspectRatio: CARD_ASPECT, backgroundColor: uri ? '#1B1D22' : bg }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          // Card photos are never written to the image cache on disk.
          cachePolicy="memory"
          transition={0}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.placeholder}>
          <View style={[styles.shine]} />
          <T variant={big ? 'largeTitle' : 'title'} color="#FFFFFF" style={{ opacity: 0.95 }}>
            {initials(title)}
          </T>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: radius.card, overflow: 'hidden' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shine: {
    position: 'absolute',
    width: '140%',
    height: '120%',
    top: '-70%',
    left: '-20%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
