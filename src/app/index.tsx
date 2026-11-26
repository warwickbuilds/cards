import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { EyeOff, FolderCog, Pencil, Pin, PinOff, Plus, Search, Settings2, Trash2, WalletCards, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardTile } from '@/components/CardTile';
import { Button, Chip, Empty, IconButton, Sheet, SheetAction, T } from '@/components/ui';
import { useDb, useSettings, useWallet } from '@/db/DataProvider';
import { deleteCard, setPinned, setSetting } from '@/db/repo';
import { plural } from '@/lib/text';
import { buildSections, hiddenCount, rows, sortCategories, UNCATEGORISED_ID, type Section } from '@/lib/wallet';
import type { CardSummary } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { categoryColor, layout, MAX_FONT_SCALE, radius, space, type } from '@/theme/tokens';

type Item =
  | { kind: 'header'; key: string; section: Section }
  | { kind: 'row'; key: string; cards: CardSummary[]; section: Section };

export default function Home() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const db = useDb();
  const settings = useSettings();
  const { cards, categories, loaded } = useWallet();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const sections = useMemo(
    () =>
      buildSections(cards, categories, {
        sortMode: settings.sortMode,
        showInactive: settings.showInactive,
        categoryFilter: filter,
        query,
      }),
    [cards, categories, settings.sortMode, settings.showInactive, filter, query],
  );
  const hidden = settings.showInactive ? 0 : hiddenCount(cards, categories);
  const chipCats = sortCategories(categories).filter((c) => c.active || settings.showInactive);
  const hasLoose = cards.some((c) => !c.categoryId || !catById.has(c.categoryId));

  const items = useMemo(() => {
    const out: Item[] = [];
    for (const s of sections) {
      out.push({ kind: 'header', key: `h-${s.id}`, section: s });
      rows(s.cards, 2).forEach((r, i) => out.push({ kind: 'row', key: `r-${s.id}-${i}`, cards: r, section: s }));
    }
    return out;
  }, [sections]);

  const open = useCallback((id: string) => router.push({ pathname: '/card/[id]', params: { id } }), []);
  const longPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMenuFor(id);
  }, []);

  const menuCard = menuFor ? cards.find((c) => c.id === menuFor) : undefined;
  const searching = query.trim().length > 0;
  const showCategoryUnderTile = searching || sections.some((s) => s.id === '__pinned');

  const confirmDelete = (card: CardSummary) => {
    setMenuFor(null);
    Alert.alert(`Delete “${card.title}”?`, 'The card and its photos are removed from this phone. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCard(db, card.id) },
    ]);
  };

  const header = (
    <View style={{ gap: space[4], paddingBottom: space[2] }}>
      <View style={styles.titleRow}>
        <T variant="largeTitle">Cards</T>
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon={FolderCog} label="Categories" onPress={() => router.push('/categories')} />
          <IconButton icon={Settings2} label="Settings" onPress={() => router.push('/settings')} />
        </View>
      </View>
      {cards.length > 0 ? (
        <>
          <View style={[styles.search, { backgroundColor: colors.surfaceAlt }]}>
            <Search size={20} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search cards and notes"
              placeholderTextColor={colors.textFaint}
              style={[type.body, { flex: 1, color: colors.text, paddingVertical: 0 }]}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Search cards"
            />
            {query ? (
              <IconButton
                icon={X}
                label="Clear search"
                size={18}
                onPress={() => setQuery('')}
                style={{ width: 32, height: 32 }}
              />
            ) : null}
          </View>
          {!searching ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              style={styles.chipScroll}
            >
              <Chip label="All" selected={filter === null} onPress={() => setFilter(null)} />
              {chipCats.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  dot={categoryColor(c.color)}
                  muted={!c.active}
                  selected={filter === c.id}
                  onPress={() => setFilter(filter === c.id ? null : c.id)}
                />
              ))}
              {hasLoose ? (
                <Chip
                  label="No category"
                  selected={filter === UNCATEGORISED_ID}
                  onPress={() => setFilter(filter === UNCATEGORISED_ID ? null : UNCATEGORISED_ID)}
                />
              ) : null}
            </ScrollView>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ paddingTop: space[4], gap: space[3] }}>
      {hidden > 0 && !searching ? (
        <Pressable
          onPress={() => setSetting(db, 'showInactive', true)}
          accessibilityRole="button"
          style={[styles.hiddenNote, { borderColor: colors.border }]}
        >
          <EyeOff size={18} color={colors.textMuted} />
          <T variant="label" color={colors.textMuted} style={{ flex: 1 }}>
            {plural(hidden, 'card')} in switched-off categories
          </T>
          <T variant="label" color={colors.accent}>
            Show
          </T>
        </Pressable>
      ) : null}
      {searching && sections.length === 0 ? (
        <T color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: space[8] }}>
          No cards match “{query.trim()}”.
        </T>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingTop: insets.top + space[2],
          paddingHorizontal: layout.screenPadding,
          paddingBottom: insets.bottom + 120,
        }}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          loaded && cards.length === 0 ? (
            <Empty
              icon={WalletCards}
              title="Your wallet is empty"
              body="Photograph the front and back of a card and it’s here whenever you need it: offline, encrypted and only on this phone."
              action={
                <Button
                  label="Add your first card"
                  icon={Plus}
                  onPress={() => router.push('/edit')}
                  style={{ marginTop: space[3] }}
                />
              }
            />
          ) : undefined
        }
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <View style={styles.sectionHeader}>
              {item.section.color ? (
                <View style={[styles.sectionDot, { backgroundColor: categoryColor(item.section.color) }]} />
              ) : null}
              {item.section.id === '__pinned' ? <Pin size={14} color={colors.textMuted} /> : null}
              <T variant="eyebrow" color={colors.textMuted} style={{ flex: 1 }}>
                {item.section.title}
                {item.section.inactive ? ' · off' : ''}
              </T>
              <T variant="caption" color={colors.textFaint}>
                {item.section.cards.length}
              </T>
            </View>
          ) : (
            <View style={styles.row}>
              {item.cards.map((c) => {
                const cat = c.categoryId ? catById.get(c.categoryId) : undefined;
                return (
                  <CardTile
                    key={c.id}
                    card={c}
                    color={cat?.color ?? null}
                    categoryName={showCategoryUnderTile && item.section.id !== c.categoryId ? (cat?.name ?? null) : null}
                    onPress={open}
                    onLongPress={longPress}
                  />
                );
              })}
              {item.cards.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          )
        }
      />

      {cards.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add card"
          onPress={() => router.push('/edit')}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.accent,
              bottom: insets.bottom + space[5],
              shadowColor: colors.shadow,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Plus size={22} color={colors.accentText} strokeWidth={2.5} />
          <T variant="bodyStrong" color={colors.accentText}>
            Add card
          </T>
        </Pressable>
      ) : null}

      <Sheet visible={!!menuCard} onClose={() => setMenuFor(null)} title={menuCard?.title}>
        {menuCard ? (
          <View>
            <SheetAction
              icon={Pencil}
              label="Edit"
              onPress={() => {
                setMenuFor(null);
                router.push({ pathname: '/edit', params: { id: menuCard.id } });
              }}
            />
            <SheetAction
              icon={menuCard.pinned ? PinOff : Pin}
              label={menuCard.pinned ? 'Unpin' : 'Pin to top'}
              onPress={() => {
                setPinned(db, menuCard.id, !menuCard.pinned);
                setMenuFor(null);
              }}
            />
            <SheetAction icon={Trash2} label="Delete" danger onPress={() => confirmDelete(menuCard)} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -space[2] },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 48,
    borderRadius: radius.pill,
    paddingHorizontal: space[4],
  },
  chipScroll: { marginHorizontal: -layout.screenPadding },
  chips: { gap: space[2], paddingHorizontal: layout.screenPadding },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingTop: space[5], paddingBottom: space[3] },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', gap: layout.gridGap, marginBottom: space[4] },
  hiddenNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  fab: {
    position: 'absolute',
    right: layout.screenPadding,
    height: 56,
    borderRadius: 18,
    paddingHorizontal: space[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    elevation: 6,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
