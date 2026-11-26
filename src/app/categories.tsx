/** Categories: add, rename, recolour, reorder, switch on/off, delete. */

import { router } from 'expo-router';
import { ArrowDown, ArrowUp, ChevronLeft, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategorySheet } from '@/components/CategorySheet';
import { Button, IconButton, T } from '@/components/ui';
import { useDb, useWallet } from '@/db/DataProvider';
import { createCategory, deleteCategory, reorderCategories, updateCategory } from '@/db/repo';
import { plural } from '@/lib/text';
import type { Category } from '@/lib/types';
import { sortCategories } from '@/lib/wallet';
import { useTheme } from '@/theme/ThemeProvider';
import { categoryColor, layout, radius, space } from '@/theme/tokens';

export default function Categories() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const db = useDb();
  const { cards, categories } = useWallet();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const cats = sortCategories(categories);

  const count = (id: string) => cards.filter((c) => c.categoryId === id).length;

  const move = (index: number, delta: number) => {
    const ids = cats.map((c) => c.id);
    const j = index + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorderCategories(db, ids).catch(() => {});
  };

  const remove = (c: Category) => {
    const n = count(c.id);
    Alert.alert(
      `Delete “${c.name}”?`,
      n ? `Its ${plural(n, 'card')} will be kept and moved to “No category”.` : 'There are no cards in it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCategory(db, c.id).catch(() => Alert.alert('Couldn’t delete the category', 'Please try again.'));
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.topBar, { paddingTop: insets.top + space[1] }]}>
        <IconButton icon={ChevronLeft} label="Back" size={26} onPress={() => router.back()} />
        <T variant="headline" style={{ flex: 1 }}>
          Categories
        </T>
        <IconButton icon={Plus} label="New category" onPress={() => setEditing('new')} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: layout.screenPadding, gap: space[3], paddingBottom: insets.bottom + space[8] }}
      >
        <T variant="caption" color={colors.textMuted} style={{ marginBottom: space[1] }}>
          Switch a category off to hide it and its cards from the home screen (for example cards you only use when travelling).
          Search still finds them.
        </T>
        {cats.map((c, i) => (
          <View
            key={c.id}
            style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border, opacity: c.active ? 1 : 0.7 }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${c.name}`}
              onPress={() => setEditing(c)}
              style={styles.main}
            >
              <View style={[styles.swatch, { backgroundColor: categoryColor(c.color) }]} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong" numberOfLines={1}>
                  {c.name}
                </T>
                <T variant="caption" color={colors.textMuted}>
                  {plural(count(c.id), 'card')}
                  {c.active ? '' : ' · hidden'}
                </T>
              </View>
            </Pressable>
            <View style={styles.actions}>
              <IconButton
                icon={ArrowUp}
                label={`Move ${c.name} up`}
                size={18}
                onPress={() => move(i, -1)}
                style={styles.small}
                color={i === 0 ? colors.border : colors.textMuted}
              />
              <IconButton
                icon={ArrowDown}
                label={`Move ${c.name} down`}
                size={18}
                onPress={() => move(i, 1)}
                style={styles.small}
                color={i === cats.length - 1 ? colors.border : colors.textMuted}
              />
            </View>
            <Switch
              value={c.active}
              onValueChange={(v) => {
                updateCategory(db, c.id, { active: v }).catch(() => {});
              }}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor="#FFFFFF"
              accessibilityLabel={`${c.name} active`}
            />
          </View>
        ))}
        {cats.length === 0 ? (
          <T color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: space[6] }}>
            No categories yet.
          </T>
        ) : null}
        <Button
          label="New category"
          kind="secondary"
          icon={Plus}
          onPress={() => setEditing('new')}
          style={{ marginTop: space[2] }}
        />
      </ScrollView>

      <CategorySheet
        visible={editing !== null}
        initial={editing && editing !== 'new' ? { name: editing.name, color: editing.color } : null}
        existingNames={categories.map((c) => c.name)}
        onClose={() => setEditing(null)}
        onDelete={
          editing && editing !== 'new'
            ? () => {
                const c = editing;
                setEditing(null);
                remove(c);
              }
            : undefined
        }
        onSave={async (name, color) => {
          if (editing === 'new') await createCategory(db, name, color);
          else if (editing) await updateCategory(db, editing.id, { name, color });
          setEditing(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space[1], paddingHorizontal: space[2], paddingBottom: space[2] },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[1] },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    paddingLeft: space[4],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatch: { width: 14, height: 36, borderRadius: 7 },
  actions: { flexDirection: 'row' },
  small: { width: 34, height: 40 },
});
