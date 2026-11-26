import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Crop,
  Download,
  EyeOff,
  Fingerprint,
  FolderCog,
  ScreenShareOff,
  Sun,
  Timer,
  Trash2,
  Upload,
  WifiOff,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Group, IconButton, Row, Sheet, SheetAction, SwitchRow, T } from '@/components/ui';
import { useDb, useSettings } from '@/db/DataProvider';
import { eraseEverything, setSetting } from '@/db/repo';
import { lockAfterLabel } from '@/lib/lockPolicy';
import { LOCK_AFTER_CHOICES, type SortMode } from '@/lib/types';
import { useSecurity } from '@/security/SecurityProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

const SORT_LABELS: Record<SortMode, string> = { used: 'Most used first', az: 'A to Z', recent: 'Newest first' };

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const db = useDb();
  const s = useSettings();
  const { deviceSecure, confirmIdentity } = useSecurity();
  const [picker, setPicker] = useState<'lock' | 'sort' | null>(null);
  const chevron = <ChevronRight size={20} color={colors.textFaint} />;

  const toggleLock = async (on: boolean) => {
    // Prove the fingerprint/PIN works before relying on it, and before turning protection off.
    const ok = await confirmIdentity(on ? 'Turn on app lock' : 'Turn off app lock');
    if (ok) setSetting(db, 'lockEnabled', on).catch(() => {});
  };

  const eraseAll = async () => {
    const ok = !deviceSecure || (await confirmIdentity('Delete all cards'));
    if (!ok) return;
    Alert.alert(
      'Delete everything?',
      'Every card and photo is removed from this phone and categories are reset to defaults. Make a backup first if you might want them back.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await eraseEverything(db);
              router.dismissTo('/');
            } catch {
              Alert.alert('Couldn’t delete everything', 'Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.topBar, { paddingTop: insets.top + space[1] }]}>
        <IconButton icon={ChevronLeft} label="Back" size={26} onPress={() => router.back()} />
        <T variant="headline">Settings</T>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: layout.screenPadding, gap: space[6], paddingBottom: insets.bottom + space[8] }}
      >
        <Group
          title="Privacy"
          footer={
            deviceSecure
              ? undefined
              : 'App lock needs a screen lock (PIN, pattern, password or fingerprint) set up in your phone’s settings.'
          }
        >
          <SwitchRow
            first
            icon={Fingerprint}
            title="App lock"
            subtitle="Fingerprint, face or screen lock to open"
            value={s.lockEnabled && deviceSecure}
            disabled={!deviceSecure}
            onChange={toggleLock}
          />
          <Row
            icon={Timer}
            title="Lock again"
            subtitle={lockAfterLabel(s.lockAfterSeconds) + ' in the background'}
            onPress={s.lockEnabled && deviceSecure ? () => setPicker('lock') : undefined}
            right={chevron}
          />
          <SwitchRow
            icon={ScreenShareOff}
            title="Block screenshots"
            subtitle="Also hides cards in the recent-apps view"
            value={s.blockScreenshots}
            onChange={(v) => {
              setSetting(db, 'blockScreenshots', v).catch(() => {});
            }}
          />
        </Group>

        <Group title="Showing cards">
          <SwitchRow
            first
            icon={Sun}
            title="Full brightness"
            subtitle="Turn the screen up when a card is open, for scanners"
            value={s.maxBrightness}
            onChange={(v) => {
              setSetting(db, 'maxBrightness', v).catch(() => {});
            }}
          />
          <Row
            icon={ArrowDownUp}
            title="Order"
            subtitle={SORT_LABELS[s.sortMode]}
            onPress={() => setPicker('sort')}
            right={chevron}
          />
          <SwitchRow
            icon={EyeOff}
            title="Show switched-off categories"
            value={s.showInactive}
            onChange={(v) => {
              setSetting(db, 'showInactive', v).catch(() => {});
            }}
          />
          <SwitchRow
            icon={Crop}
            title="Crop photos to card shape"
            subtitle="Turn off for tall or odd-shaped cards"
            value={s.cropToCard}
            onChange={(v) => {
              setSetting(db, 'cropToCard', v).catch(() => {});
            }}
          />
          <Row icon={FolderCog} title="Categories" onPress={() => router.push('/categories')} right={chevron} />
        </Group>

        <Group
          title="Your data"
          footer="Backups are encrypted with a passphrase you choose and saved only where you pick. Keep a recent one somewhere safe: uninstalling the app deletes your cards."
        >
          <Row
            first
            icon={Upload}
            title="Back up"
            subtitle="Save an encrypted backup file"
            onPress={() => router.push({ pathname: '/backup', params: { mode: 'export' } })}
            right={chevron}
          />
          <Row
            icon={Download}
            title="Restore"
            subtitle="Bring cards in from a backup file"
            onPress={() => router.push({ pathname: '/backup', params: { mode: 'import' } })}
            right={chevron}
          />
          <Row icon={Trash2} title="Delete everything" danger onPress={eraseAll} />
        </Group>

        <View style={[styles.about, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <WifiOff size={22} color={colors.textMuted} />
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="bodyStrong">Offline by design</T>
            <T variant="caption" color={colors.textMuted}>
              Cards has no internet access at all, no account and no tracking. Your cards are encrypted on this phone and never
              leave it unless you make a backup.
            </T>
            <T variant="caption" color={colors.textFaint} style={{ marginTop: space[1] }}>
              Version {Constants.expoConfig?.version ?? '?'}
            </T>
          </View>
        </View>
      </ScrollView>

      <Sheet visible={picker === 'lock'} onClose={() => setPicker(null)} title="Lock again">
        {LOCK_AFTER_CHOICES.map((sec) => (
          <SheetAction
            key={sec}
            icon={sec === s.lockAfterSeconds ? Check : Timer}
            label={lockAfterLabel(sec)}
            onPress={() => {
              setSetting(db, 'lockAfterSeconds', sec).catch(() => {});
              setPicker(null);
            }}
          />
        ))}
      </Sheet>
      <Sheet visible={picker === 'sort'} onClose={() => setPicker(null)} title="Order cards">
        {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
          <SheetAction
            key={m}
            icon={m === s.sortMode ? Check : ArrowDownUp}
            label={SORT_LABELS[m]}
            onPress={() => {
              setSetting(db, 'sortMode', m).catch(() => {});
              setPicker(null);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space[1], paddingHorizontal: space[2], paddingBottom: space[2] },
  about: { flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
});
