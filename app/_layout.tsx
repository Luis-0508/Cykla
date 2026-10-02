import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BRAND } from '@/config/branding';
import { initializeDatabase } from '@/database/schema';
import { createLockController } from '@/services/lockLifecycle';
import { cleanupTemporaryExports } from '@/services/export';
import { authenticateApp, isAppLockEnabled } from '@/services/appLock';
import { refreshDailyReminderText } from '@/services/notifications';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
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

// Scheduled notifications keep the text they were created with; reword an active
// reminder whenever the resolved UI language changes. Best effort: a failure keeps
// the previous wording and is retried on the next launch.
function ReminderLanguageSync() {
  const settings = useSettings();
  const { t } = useI18n();
  const reminderEnabled = settings.data?.dailyReminderEnabled ?? false;
  useEffect(() => {
    if (!reminderEnabled) return;
    void refreshDailyReminderText(t.notifications).catch(() => undefined);
  }, [reminderEnabled, t]);
  return null;
}

function LockGate({ children }: { children: React.ReactNode }) {
  const theme = useCyklaTheme();
  const { t } = useI18n();
  const locked = useUiStore((state) => state.locked);
  const setLocked = useUiStore((state) => state.setLocked);
  const [checking, setChecking] = useState(Platform.OS !== 'web');

  const controller = useRef<ReturnType<typeof createLockController> | null>(null);
  // The lock controller lives across renders; read the current language at prompt time.
  const lockText = useRef(t.lock);
  useEffect(() => {
    lockText.current = t.lock;
  }, [t]);
  const unlock = () => controller.current?.unlock();
  useEffect(() => {
    if (Platform.OS === 'web') {
      setLocked(false);
      return;
    }
    let mounted = true;
    const lifecycle = createLockController(
      {
        readEnabled: isAppLockEnabled,
        authenticate: () => authenticateApp(lockText.current),
        onChange: setLocked,
      },
      AppState.currentState ?? 'unknown',
    );
    controller.current = lifecycle;
    void lifecycle.start().finally(() => {
      if (mounted) setChecking(false);
    });
    const subscription = AppState.addEventListener('change', (next) => lifecycle.change(next));
    return () => {
      mounted = false;
      lifecycle.dispose();
      controller.current = null;
      subscription.remove();
    };
  }, [setLocked]);

  if (checking) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1, display: locked ? 'none' : 'flex' }}
        accessibilityElementsHidden={locked}
        importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {locked ? (
        <View style={[styles.lockScreen, { backgroundColor: theme.colors.background }]}>
          <CyklaMark size={72} />
          <Typography variant="title">{t.lock.title}</Typography>
          <Typography muted style={styles.lockCopy}>
            {t.lock.body}
          </Typography>
          <View style={styles.lockButton}>
            <Button label={t.lock.unlock} icon="lock-open-outline" onPress={() => void unlock()} />
          </View>
        </View>
      ) : null}
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
        <Stack.Screen name="roadmap" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SQLiteProvider
          databaseName={BRAND.databaseName}
          onInit={async (db) => {
            // Cache cleanup is best effort; retry on the next launch if the OS refuses it.
            await cleanupTemporaryExports().catch(() => undefined);
            await initializeDatabase(db);
          }}
        >
          <ThemeBootstrap />
          <I18nProvider>
            <ReminderLanguageSync />
            <LockGate>
              <RootNavigator />
            </LockGate>
          </I18nProvider>
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
