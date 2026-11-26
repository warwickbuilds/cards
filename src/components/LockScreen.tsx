import { Fingerprint, Lock } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { useSecurity } from '@/security/SecurityProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { Button, T } from './ui';

/** Covers everything while the app is locked, and asks to unlock straight away. */
export function LockScreen() {
  const { colors } = useTheme();
  const { unlock } = useSecurity();
  const asked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    const ask = () => {
      if (!active || asked.current || AppState.currentState !== 'active') return;
      asked.current = true;
      unlock().finally(() => {
        asked.current = false;
      });
    };
    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(ask, 50);
    };
    schedule();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') schedule();
    });
    return () => {
      active = false;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      sub.remove();
    };
  }, [unlock]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
        <Lock size={34} color={colors.accent} />
      </View>
      <T variant="title">Cards is locked</T>
      <T color={colors.textMuted} style={{ textAlign: 'center', maxWidth: 280 }}>
        Use your fingerprint, face or screen lock to see your cards.
      </T>
      <Button label="Unlock" icon={Fingerprint} onPress={() => unlock()} style={{ alignSelf: 'stretch', marginTop: space[4] }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[8], zIndex: 100 },
  badge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
});
