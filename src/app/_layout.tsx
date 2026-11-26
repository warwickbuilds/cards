import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockScreen } from '@/components/LockScreen';
import { T } from '@/components/ui';
import { DataProvider } from '@/db/DataProvider';
import { sweepTempImages } from '@/lib/photos';
import { SecurityProvider, useSecurity } from '@/security/SecurityProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Loading() {
  const { colors } = useTheme();
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

function OpenError({ error }: { error: Error }) {
  const { colors } = useTheme();
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <View style={[styles.center, { backgroundColor: colors.bg, padding: space[8], gap: space[3] }]}>
      <T variant="title">Cards couldn’t open its data</T>
      <T color={colors.textMuted} style={{ textAlign: 'center' }}>
        Your cards are still on this phone. Close the app fully and open it again. If this keeps happening, please report it with
        this message: {error.message}
      </T>
    </View>
  );
}

function Shell() {
  const { colors, isDark } = useTheme();
  const { locked } = useSecurity();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  useEffect(() => {
    sweepTempImages();
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="card/[id]" options={{ animation: 'fade', contentStyle: { backgroundColor: '#000' } }} />
        <Stack.Screen name="edit" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="categories" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="backup" />
      </Stack>
      {locked ? <LockScreen /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DataProvider fallback={<Loading />} onError={(e) => <OpenError error={e} />}>
            <SecurityProvider>
              <Shell />
            </SecurityProvider>
          </DataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
