import { Pin } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { jpegUri, type CardSummary } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { CardArt } from './CardArt';
import { T } from './ui';

/**
 * One card in the home grid: the photo is the hero, the name sits underneath
 * (never on top of the photo, so it is always readable).
 */
export const CardTile = memo(function CardTile({
  card,
  color,
  categoryName,
  onPress,
  onLongPress,
}: {
  card: CardSummary;
  color: string | null;
  categoryName?: string | null;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}${categoryName ? `, ${categoryName}` : ''}`}
      accessibilityHint="Opens the card full screen. Long press for more."
      onPress={() => onPress(card.id)}
      onLongPress={() => onLongPress(card.id)}
      delayLongPress={350}
      style={({ pressed }) => [styles.tile, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View
        style={[styles.shadow, { shadowColor: colors.shadow, shadowOpacity: isDark ? 0.5 : 0.18, elevation: isDark ? 0 : 4 }]}
      >
        <CardArt uri={jpegUri(card.thumb)} title={card.title} color={color} />
      </View>
      <View style={styles.caption}>
        {card.pinned ? <Pin size={13} color={colors.textMuted} fill={colors.textMuted} /> : null}
        <T variant="label" numberOfLines={1} style={{ flex: 1 }}>
          {card.title}
        </T>
      </View>
      {categoryName ? (
        <T variant="caption" color={colors.textMuted} numberOfLines={1} style={{ marginTop: -2 }}>
          {categoryName}
        </T>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { flex: 1, gap: space[2] },
  shadow: { borderRadius: 14, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, backgroundColor: 'transparent' },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
});
