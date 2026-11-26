import { Camera, ImagePlus } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '@/theme/ThemeProvider';
import { CARD_ASPECT, radius, space } from '@/theme/tokens';

import { T } from './ui';

/** A card-shaped space for the front or back photo. Tapping it offers camera, gallery, rotate or remove. */
export function PhotoSlot({
  label,
  uri,
  busy,
  onPress,
}: {
  label: string;
  uri: string | null;
  busy?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: space[2] }}>
      <T variant="label" color={colors.textMuted}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uri ? `Change ${label.toLowerCase()} photo` : `Add ${label.toLowerCase()} photo`}
        onPress={onPress}
        disabled={busy}
        style={({ pressed }) => [
          styles.slot,
          {
            aspectRatio: CARD_ASPECT,
            borderColor: uri ? 'transparent' : colors.border,
            backgroundColor: uri ? '#1B1D22' : colors.surface,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" transition={0} />
        ) : (
          <View style={styles.empty}>
            {label === 'Front' ? <Camera size={26} color={colors.accent} /> : <ImagePlus size={26} color={colors.textMuted} />}
            <T variant="caption" color={label === 'Front' ? colors.accent : colors.textMuted}>
              {label === 'Front' ? 'Add front' : 'Add back'}
            </T>
          </View>
        )}
        {busy ? (
          <View style={[StyleSheet.absoluteFill, styles.busy]}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: '100%', borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  busy: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
