import { Check, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORY_NAME_MAX, cleanName } from '@/lib/text';
import { useTheme } from '@/theme/ThemeProvider';
import { CATEGORY_COLOR_KEYS, CATEGORY_COLORS, space } from '@/theme/tokens';

import { Button, Field, Sheet } from './ui';

/** Name and colour for a new or existing category. */
export function CategorySheet({
  visible,
  initial,
  onClose,
  onSave,
  onDelete,
  existingNames,
}: {
  visible: boolean;
  initial?: { name: string; color: string } | null;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  onDelete?: () => void;
  existingNames: string[];
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={initial ? 'Edit category' : 'New category'}>
      {visible ? <CategoryForm initial={initial} onSave={onSave} onDelete={onDelete} existingNames={existingNames} /> : null}
    </Sheet>
  );
}

function CategoryForm({
  initial,
  onSave,
  onDelete,
  existingNames,
}: {
  initial?: { name: string; color: string } | null;
  onSave: (name: string, color: string) => void;
  onDelete?: () => void;
  existingNames: string[];
}) {
  const { colors } = useTheme();
  // Mounted fresh each time the sheet opens, so these start from the props.
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState<string>(
    initial?.color ?? CATEGORY_COLOR_KEYS[existingNames.length % CATEGORY_COLOR_KEYS.length],
  );

  const clean = cleanName(name);
  const duplicate =
    clean.length > 0 &&
    existingNames.some((n) => n.toLowerCase() === clean.toLowerCase() && n.toLowerCase() !== initial?.name.toLowerCase());

  return (
    <View style={{ gap: space[5] }}>
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Gym, Library, Travel"
        maxLength={CATEGORY_NAME_MAX}
        autoFocus
        returnKeyType="done"
        hint={duplicate ? 'You already have a category with this name.' : undefined}
      />
      <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Colour">
        {CATEGORY_COLOR_KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={key}
            accessibilityState={{ checked: key === color }}
            onPress={() => setColor(key)}
            style={[
              styles.swatch,
              { backgroundColor: CATEGORY_COLORS[key], borderColor: key === color ? colors.text : 'transparent' },
            ]}
          >
            {key === color ? <Check size={18} color="#FFFFFF" strokeWidth={3} /> : null}
          </Pressable>
        ))}
      </View>
      <Button label="Save" disabled={!clean || duplicate} onPress={() => onSave(clean, color)} />
      {onDelete ? <Button label="Delete category" kind="ghost" icon={Trash2} onPress={onDelete} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
