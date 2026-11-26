/** Encrypted backup and restore. */

import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, ChevronLeft, FileLock2, FolderOpen, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, IconButton, T } from '@/components/ui';
import { useDb } from '@/db/DataProvider';
import { importAll, type ImportMode } from '@/db/repo';
import { BackupCryptoError } from '@/lib/backupCrypto';
import { BackupDataError, type BackupPayload } from '@/lib/backupData';
import { exportBackup, openBackup, pickBackupFile, type PickedBackup } from '@/lib/backupIO';
import { passphraseStrength, strengthLabel } from '@/lib/passphrase';
import { plural } from '@/lib/text';
import { useSecurity } from '@/security/SecurityProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

function message(e: unknown): string {
  if (e instanceof BackupCryptoError || e instanceof BackupDataError) return e.message;
  return 'Something went wrong. Please try again.';
}

export default function Backup() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isExport = mode !== 'import';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + space[1] }]}>
        <IconButton icon={ChevronLeft} label="Back" size={26} onPress={() => router.back()} />
        <T variant="headline">{isExport ? 'Back up' : 'Restore'}</T>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: layout.screenPadding, gap: space[5], paddingBottom: insets.bottom + space[8] }}
      >
        {isExport ? <ExportFlow /> : <ImportFlow />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Strength({ value }: { value: string }) {
  const { colors } = useTheme();
  const s = passphraseStrength(value);
  const level = { 'too-short': 0, weak: 1, ok: 2, strong: 3 }[s];
  const tint = [colors.border, colors.danger, '#F79009', colors.success][level];
  return (
    <View style={{ gap: space[2] }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i <= level ? tint : colors.border }]} />
        ))}
      </View>
      <T variant="caption" color={colors.textMuted}>
        {strengthLabel(s)}
      </T>
    </View>
  );
}

function ExportFlow() {
  const { colors } = useTheme();
  const db = useDb();
  const { expectExternal } = useSecurity();
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const strength = passphraseStrength(pass);
  const mismatch = confirm.length > 0 && confirm !== pass;
  const ready = strength !== 'too-short' && confirm === pass;

  const run = async () => {
    setBusy(true);
    try {
      const res = await exportBackup(db, pass, expectExternal);
      if (res) {
        setDone(
          `Saved ${res.fileName} with ${plural(res.cards, 'card')} and ${plural(res.categories, 'category', 'categories')}.`,
        );
        setPass('');
        setConfirm('');
      }
    } catch (e) {
      Alert.alert('Backup not saved', message(e));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={styles.doneBox}>
        <CheckCircle2 size={48} color={colors.success} />
        <T variant="title">Backup saved</T>
        <T color={colors.textMuted} style={{ textAlign: 'center' }}>
          {done} You’ll need your passphrase to restore it. There’s no way to recover it if it’s forgotten.
        </T>
        <Button label="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: space[4] }} />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.info, { backgroundColor: colors.accentSoft }]}>
        <ShieldCheck size={22} color={colors.accent} />
        <T variant="label" style={{ flex: 1 }}>
          Your backup holds every card, photo and note, locked with AES-256 and a passphrase only you know. You choose the folder;
          nothing is uploaded.
        </T>
      </View>
      <Field
        label="Passphrase"
        value={pass}
        onChangeText={setPass}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="new-password"
        placeholder="A few words you’ll remember"
      />
      {pass ? <Strength value={pass} /> : null}
      <Field
        label="Type it again"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        hint={mismatch ? 'The two passphrases don’t match.' : undefined}
      />
      <Button
        label={busy ? 'Encrypting…' : 'Choose folder and save'}
        icon={FolderOpen}
        disabled={!ready}
        busy={busy}
        onPress={run}
      />
      <T variant="caption" color={colors.textFaint}>
        Tip: a phrase of three or four unrelated words is strong and easy to remember. Encrypting takes a few seconds.
      </T>
    </>
  );
}

function ImportFlow() {
  const { colors } = useTheme();
  const db = useDb();
  const { expectExternal } = useSecurity();
  const [file, setFile] = useState<PickedBackup | null>(null);
  const [pass, setPass] = useState('');
  const [payload, setPayload] = useState<BackupPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const choose = async () => {
    try {
      const picked = await pickBackupFile(expectExternal);
      if (picked) {
        setFile(picked);
        setPayload(null);
        setPass('');
      }
    } catch (e) {
      Alert.alert('Can’t use that file', message(e));
    }
  };

  const unlock = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setPayload(await openBackup(file.bytes, pass));
    } catch (e) {
      Alert.alert('Can’t open the backup', message(e));
    } finally {
      setBusy(false);
    }
  };

  const apply = (mode: ImportMode) => {
    if (!payload) return;
    const go = async () => {
      setBusy(true);
      try {
        await importAll(db, payload, mode);
        setDone(
          `${plural(payload.cards.length, 'card')} and ${plural(payload.categories.length, 'category', 'categories')} restored.`,
        );
      } catch {
        Alert.alert('Restore failed', 'Nothing was changed. Please try again.');
      } finally {
        setBusy(false);
      }
    };
    if (mode === 'replace') {
      Alert.alert('Replace everything?', 'All cards on this phone are deleted and replaced by the ones in the backup.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: go },
      ]);
    } else go();
  };

  if (done) {
    return (
      <View style={styles.doneBox}>
        <CheckCircle2 size={48} color={colors.success} />
        <T variant="title">Restored</T>
        <T color={colors.textMuted} style={{ textAlign: 'center' }}>
          {done}
        </T>
        <Button
          label="See my cards"
          onPress={() => router.dismissTo('/')}
          style={{ alignSelf: 'stretch', marginTop: space[4] }}
        />
      </View>
    );
  }

  return (
    <>
      <T color={colors.textMuted}>Pick a Cards backup file (.cardsbackup), then enter the passphrase it was saved with.</T>
      <Button
        label={file ? 'Choose a different file' : 'Choose backup file'}
        kind={file ? 'secondary' : 'primary'}
        icon={FileLock2}
        onPress={choose}
      />
      {file ? (
        <View style={[styles.fileBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FileLock2 size={20} color={colors.textMuted} />
          <T variant="label" numberOfLines={1} style={{ flex: 1 }}>
            {file.name}
          </T>
        </View>
      ) : null}
      {file && !payload ? (
        <>
          <Field
            label="Passphrase"
            value={pass}
            onChangeText={setPass}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={unlock}
          />
          <Button label={busy ? 'Decrypting…' : 'Open backup'} disabled={!pass} busy={busy} onPress={unlock} />
        </>
      ) : null}
      {payload ? (
        <View style={{ gap: space[3] }}>
          <View style={[styles.info, { backgroundColor: colors.accentSoft }]}>
            <ShieldCheck size={22} color={colors.accent} />
            <T variant="label" style={{ flex: 1 }}>
              {plural(payload.cards.length, 'card')}, {plural(payload.categories.length, 'category', 'categories')}
              {payload.exportedAt ? `, saved ${new Date(payload.exportedAt).toLocaleDateString()}` : ''}.
            </T>
          </View>
          <Button label="Add to my cards" busy={busy} onPress={() => apply('merge')} />
          <T variant="caption" color={colors.textFaint}>
            Keeps the cards on this phone. Cards that are in both are updated from the backup.
          </T>
          <Button label="Replace all my cards" kind="danger" disabled={busy} onPress={() => apply('replace')} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space[1], paddingHorizontal: space[2], paddingBottom: space[2] },
  info: { flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: radius.lg, alignItems: 'flex-start' },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  doneBox: { alignItems: 'center', gap: space[3], paddingTop: space[8] },
  fileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
