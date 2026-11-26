/** Small shared building blocks so every screen looks and behaves the same. */

import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSecurity } from '@/security/SecurityProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, MAX_FONT_SCALE, radius, space, type } from '@/theme/tokens';

export function T({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
  selectable,
}: {
  variant?: keyof typeof type;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[type[variant], { color: color ?? colors.text }, style]}
    >
      {children}
    </Text>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon: Icon,
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: LucideIcon;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bg = { primary: colors.accent, secondary: colors.surfaceAlt, ghost: 'transparent', danger: colors.dangerSoft }[kind];
  const fg = { primary: colors.accentText, secondary: colors.text, ghost: colors.accent, danger: colors.danger }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {Icon ? <Icon size={20} color={fg} strokeWidth={2.2} /> : null}
          <T variant="bodyStrong" color={fg}>
            {label}
          </T>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  color,
  background,
  size = 22,
  style,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  color?: string;
  background?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: background ?? 'transparent', opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Icon size={size} color={color ?? colors.text} strokeWidth={2} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  dot,
  muted,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  dot?: string | null;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.text : colors.surface,
          borderColor: selected ? colors.text : colors.border,
          opacity: pressed ? 0.75 : muted ? 0.6 : 1,
        },
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <T variant="label" color={selected ? colors.bg : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      <T variant="label" color={colors.textMuted}>
        {label}
      </T>
      <TextInput
        placeholderTextColor={colors.textFaint}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        {...props}
        style={[
          styles.input,
          type.body,
          { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
          props.multiline && { minHeight: 120, textAlignVertical: 'top', paddingTop: 14 },
          props.style,
        ]}
      />
      {hint ? (
        <T variant="caption" color={colors.textFaint}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function Group({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      {title ? (
        <T variant="eyebrow" color={colors.textMuted} style={{ paddingHorizontal: space[1] }}>
          {title}
        </T>
      ) : null}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
      {footer ? (
        <T variant="caption" color={colors.textFaint} style={{ paddingHorizontal: space[1] }}>
          {footer}
        </T>
      ) : null}
    </View>
  );
}

export function Row({
  icon: Icon,
  title,
  subtitle,
  onPress,
  right,
  danger,
  first,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  first?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      {Icon ? <Icon size={22} color={danger ? colors.danger : colors.textMuted} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="body" color={danger ? colors.danger : colors.text}>
          {title}
        </T>
        {subtitle ? (
          <T variant="caption" color={colors.textMuted}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function SwitchRow(props: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  first?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Row
      icon={props.icon}
      title={props.title}
      subtitle={props.subtitle}
      first={props.first}
      onPress={props.disabled ? undefined : () => props.onChange(!props.value)}
      right={
        <Switch
          value={props.value}
          disabled={props.disabled}
          onValueChange={props.onChange}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor="#FFFFFF"
          accessibilityLabel={props.title}
        />
      }
    />
  );
}

/** A bottom sheet with a grab handle; closes on back or tapping outside. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const { locked } = useSecurity();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible && !locked}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <KeyboardAvoidingView style={styles.sheetWrap} behavior="padding" pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space[4] }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {title ? (
            <T variant="title" style={{ marginBottom: space[3] }}>
              {title}
            </T>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetAction({
  icon: Icon,
  label,
  onPress,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.sheetAction, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <View style={[styles.sheetIcon, { backgroundColor: danger ? colors.dangerSoft : colors.surfaceAlt }]}>
        <Icon size={22} color={danger ? colors.danger : colors.text} />
      </View>
      <T variant="bodyStrong" color={danger ? colors.danger : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
        <Icon size={32} color={colors.accent} />
      </View>
      <T variant="title" style={{ textAlign: 'center' }}>
        {title}
      </T>
      <T color={colors.textMuted} style={{ textAlign: 'center', maxWidth: 300 }}>
        {body}
      </T>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  iconButton: {
    width: layout.minTap,
    height: layout.minTap,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    minHeight: 56,
    paddingVertical: space[3],
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space[5],
    paddingTop: space[2],
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: space[4] },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    paddingVertical: space[3],
    borderRadius: radius.md,
    paddingHorizontal: space[1],
  },
  sheetIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space[3], paddingVertical: space[8], paddingHorizontal: space[6] },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
});
