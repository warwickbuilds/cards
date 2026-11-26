/** Add or edit a card: photos first (that's what you'll look at), then name, category and notes. */

import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Camera, Images, RotateCw, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategorySheet } from '@/components/CategorySheet';
import { PhotoSlot } from '@/components/PhotoSlot';
import { Button, Chip, Field, Group, IconButton, Sheet, SheetAction, SwitchRow, T } from '@/components/ui';
import { useCard, useCardImages, useCategories, useDb, useSettings } from '@/db/DataProvider';
import { createCategory, deleteCard, saveCard, type ImageChanges } from '@/db/repo';
import { PermissionDeniedError, pickPhoto, rotateImage, type PhotoSource, type PreparedImage } from '@/lib/photos';
import { NOTES_MAX, TITLE_MAX } from '@/lib/text';
import { jpegUri, type Side } from '@/lib/types';
import { sortCategories } from '@/lib/wallet';
import { useSecurity } from '@/security/SecurityProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { categoryColor, layout, space } from '@/theme/tokens';

export default function EditCard() {
  const { id, categoryId: presetCategory } = useLocalSearchParams<{ id?: string; categoryId?: string }>();
  const { colors } = useTheme();
  const { data: card, loaded } = useCard(id);
  const { data: storedImages, loaded: imagesLoaded } = useCardImages(id);
  const { data: categories, loaded: categoriesLoaded } = useCategories();

  // Wait for everything, then start the form from it once.
  const ready = categoriesLoaded && (!id || (loaded && imagesLoaded));
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const firstActive = sortCategories(categories).find((c) => c.active)?.id ?? null;
  return (
    <EditForm
      id={card ? id : undefined}
      initial={{
        title: card?.title ?? '',
        notes: card?.notes ?? '',
        categoryId: card ? card.categoryId : (presetCategory ?? firstActive),
        pinned: card?.pinned ?? false,
        images: { front: storedImages.front ?? null, back: storedImages.back ?? null },
      }}
    />
  );
}

interface FormStart {
  title: string;
  notes: string;
  categoryId: string | null;
  pinned: boolean;
  images: Partial<Record<Side, PreparedImage | null>>;
}

function EditForm({ id, initial }: { id?: string; initial: FormStart }) {
  const isNew = !id;
  const db = useDb();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const { expectExternal, clearExternal } = useSecurity();
  const { data: categories } = useCategories();

  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes);
  const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId);
  const [pinned, setPinnedState] = useState(initial.pinned);
  const [images, setImages] = useState<Partial<Record<Side, PreparedImage | null>>>(initial.images);
  const [changes, setChanges] = useState<ImageChanges>({});
  const [photoMenu, setPhotoMenu] = useState<Side | null>(null);
  const [busySide, setBusySide] = useState<Side | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Ask before throwing away changes.
  const disablePrevention = usePreventRemove(dirty && !saving, ({ repeat }) => {
    Alert.alert('Discard changes?', 'What you’ve added to this card won’t be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setDirty(false);
          repeat();
        },
      },
    ]);
  });

  const touch = () => setDirty(true);

  const setImage = (side: Side, img: PreparedImage | null) => {
    touch();
    setImages((m) => ({ ...m, [side]: img }));
    setChanges((m) => ({ ...m, [side]: img }));
  };

  const takePhoto = async (side: Side, source: PhotoSource) => {
    setPhotoMenu(null);
    setBusySide(side);
    try {
      const img = await pickPhoto(source, settings.cropToCard, expectExternal, clearExternal);
      if (img) setImage(side, img);
    } catch (e) {
      Alert.alert(
        e instanceof PermissionDeniedError ? 'Camera is off' : 'Couldn’t use that photo',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setBusySide(null);
    }
  };

  const rotate = async (side: Side) => {
    const img = images[side];
    setPhotoMenu(null);
    if (!img) return;
    setBusySide(side);
    try {
      setImage(side, await rotateImage(img));
    } catch {
      Alert.alert('Couldn’t rotate the photo', 'Please try again.');
    } finally {
      setBusySide(null);
    }
  };

  const canSave = title.trim().length > 0 && !busySide && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const savedId = await saveCard(db, id ?? null, { title, notes, categoryId, pinned }, changes);
      disablePrevention();
      if (isNew) router.replace({ pathname: '/card/[id]', params: { id: savedId } });
      else router.back();
    } catch {
      setSaving(false);
      Alert.alert('Couldn’t save the card', 'Please try again.');
    }
  };

  const remove = () => {
    if (!id) return;
    Alert.alert(
      `Delete “${initial.title || 'this card'}”?`,
      'The card and its photos are removed from this phone. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              disablePrevention();
              await deleteCard(db, id);
              router.dismissTo('/');
            } catch {
              Alert.alert('Couldn’t delete the card', 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const cats = sortCategories(categories);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.topBar, { paddingTop: insets.top + space[1], borderBottomColor: colors.border }]}>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
        <T variant="headline" style={{ flex: 1 }}>
          {isNew ? 'New card' : 'Edit card'}
        </T>
        <Button
          label="Save"
          onPress={save}
          disabled={!canSave}
          busy={saving}
          style={{ minHeight: 40, paddingHorizontal: space[4] }}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: layout.screenPadding, gap: space[6], paddingBottom: insets.bottom + space[8] }}
      >
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          {(['front', 'back'] as const).map((side) => (
            <PhotoSlot
              key={side}
              label={side === 'front' ? 'Front' : 'Back'}
              uri={jpegUri(images[side]?.thumb)}
              busy={busySide === side}
              onPress={() => setPhotoMenu(side)}
            />
          ))}
        </View>

        <Field
          label="Name"
          value={title}
          onChangeText={(t) => {
            touch();
            setTitle(t);
          }}
          placeholder="e.g. Library card, Woolworths Rewards"
          maxLength={TITLE_MAX}
          autoCapitalize="words"
          returnKeyType="done"
        />

        <View style={{ gap: space[2] }}>
          <T variant="label" color={colors.textMuted}>
            Category
          </T>
          <View style={styles.chips}>
            {cats.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                dot={categoryColor(c.color)}
                muted={!c.active}
                selected={categoryId === c.id}
                onPress={() => {
                  touch();
                  setCategoryId(categoryId === c.id ? null : c.id);
                }}
              />
            ))}
            <Chip label="New…" onPress={() => setNewCategory(true)} />
          </View>
          {categoryId && categories.find((c) => c.id === categoryId && !c.active) ? (
            <T variant="caption" color={colors.textFaint}>
              This category is switched off, so the card won’t show on the home screen until you turn it back on.
            </T>
          ) : null}
        </View>

        <Field
          label="Notes"
          value={notes}
          onChangeText={(t) => {
            touch();
            setNotes(t);
          }}
          placeholder="Member number, expiry, where it’s accepted…"
          multiline
          maxLength={NOTES_MAX}
        />

        <Group>
          <SwitchRow
            first
            title="Pin to top"
            subtitle="Always first on the home screen"
            value={pinned}
            onChange={(v) => {
              touch();
              setPinnedState(v);
            }}
          />
        </Group>

        {!isNew ? <Button label="Delete card" kind="danger" icon={Trash2} onPress={remove} /> : null}
      </ScrollView>

      <Sheet
        visible={photoMenu !== null}
        onClose={() => setPhotoMenu(null)}
        title={photoMenu === 'back' ? 'Back of card' : 'Front of card'}
      >
        {photoMenu ? (
          <View>
            <SheetAction icon={Camera} label="Take photo" onPress={() => takePhoto(photoMenu, 'camera')} />
            <SheetAction icon={Images} label="Choose from gallery" onPress={() => takePhoto(photoMenu, 'library')} />
            {images[photoMenu] ? (
              <>
                <SheetAction icon={RotateCw} label="Rotate" onPress={() => rotate(photoMenu)} />
                <SheetAction
                  icon={Trash2}
                  label="Remove photo"
                  danger
                  onPress={() => {
                    setImage(photoMenu, null);
                    setPhotoMenu(null);
                  }}
                />
              </>
            ) : null}
          </View>
        ) : null}
      </Sheet>

      <CategorySheet
        visible={newCategory}
        onClose={() => setNewCategory(false)}
        existingNames={categories.map((c) => c.name)}
        onSave={async (name, color) => {
          const newId = await createCategory(db, name, color);
          touch();
          setCategoryId(newId);
          setNewCategory(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[2],
    paddingRight: layout.screenPadding,
    paddingBottom: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
