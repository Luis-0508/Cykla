import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BRAND } from '@/config/branding';
import { initializeDatabase } from '@/database/schema';
import { authenticateApp, isAppLockEnabled } from '@/services/appLock';
import { useSettings } from '@/hooks/useCyklaData';
import { useUiStore } from '@/store/uiStore';
import { useCyklaTheme } from '@/theme/theme';
import { Button } from '@/components/ui/Button';
import { CyklaMark } from '@/components/ui/CyklaMark';
import { Typography } from '@/components/ui/Typography';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1 },
  },
});

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function ThemeBootstrap() {
  const settings = useSettings();
  const setThemeMode = useUiStore((state) => state.setThemeMode);
  useEffect(() => {
    if (settings.data?.theme) setThemeMode(settings.data.theme);
  }, [setThemeMode, settings.data?.theme]);
  return null;
}

function LockGate({ children }: { children: React.ReactNode }) {
  const theme = useCyklaTheme();
  const locked = useUiStore((state) => state.locked);
  const setLocked = useUiStore((state) => state.setLocked);
  const [checking, setChecking] = useState(true);

  const unlock = async () => {
    if (await authenticateApp()) setLocked(false);
  };

  useEffect(() => {
    let active = true;
    isAppLockEnabled()
      .then((enabled) => {
        if (active) setLocked(enabled);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        void isAppLockEnabled().then((enabled) => {
          if (enabled) setLocked(true);
        });
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [setLocked]);

  if (checking) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  if (!locked) return children;

  return (
    <View style={[styles.lockScreen, { backgroundColor: theme.colors.background }]}>
      <CyklaMark size={72} />
      <Typography variant="title">Cykla ist gesperrt</Typography>
      <Typography muted style={styles.lockCopy}>
        Entsperre die App, um deine lokalen Einträge zu sehen.
      </Typography>
      <View style={styles.lockButton}>
        <Button label="Entsperren" icon="lock-open-outline" onPress={() => void unlock()} />
      </View>
    </View>
  );
}

function RootNavigator() {
  const theme = useCyklaTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="day/[date]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="prediction" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SQLiteProvider databaseName={BRAND.databaseName} onInit={initializeDatabase}>
          <ThemeBootstrap />
          <LockGate>
            <RootNavigator />
          </LockGate>
        </SQLiteProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  lockCopy: {
    textAlign: 'center',
    maxWidth: 360,
  },
  lockButton: {
    width: '100%',
    maxWidth: 360,
    marginTop: 8,
  },
});
