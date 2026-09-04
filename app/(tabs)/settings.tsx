import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { BRAND } from '@/config/branding';
import { useEntries, useResetData, useSettings, useUpdateSetting } from '@/hooks/useCyklaData';
import {
  authenticateApp,
  canUseAppLock,
  isAppLockEnabled,
  setAppLockEnabled,
} from '@/services/appLock';
import { exportCsv, exportJson } from '@/services/export';
import { disableDailyReminder, enableDailyReminder } from '@/services/notifications';
import { type ThemeMode, useUiStore } from '@/store/uiStore';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

const goalOptions = [
  ['track', 'Zyklus beobachten'],
  ['conceive', 'Fruchtbare Zeit verstehen'],
  ['unsure', 'Noch nicht sicher'],
] as const;

export default function SettingsScreen() {
  const theme = useCyklaTheme();
  const settingsQuery = useSettings();
  const entriesQuery = useEntries();
  const updateSetting = useUpdateSetting();
  const resetData = useResetData();
  const themeMode = useUiStore((state) => state.themeMode);
  const setThemeMode = useUiStore((state) => state.setThemeMode);
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const settings = settingsQuery.data;

  useEffect(() => {
    void isAppLockEnabled().then(setLockEnabledState);
  }, []);

  const changeTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    updateSetting.mutate({ key: 'theme', value: mode });
  };

  const changeLock = async (enabled: boolean) => {
    if (enabled && !(await canUseAppLock())) {
      Alert.alert(
        'App-Sperre nicht verfügbar',
        Platform.OS === 'web'
          ? 'Die App-Sperre ist nur auf einem unterstützten Mobilgerät verfügbar.'
          : 'Richte zuerst Face ID, Touch ID oder eine Gerätesperre ein.',
      );
      return;
    }
    if (enabled && !(await authenticateApp())) {
      return;
    }
    await setAppLockEnabled(enabled);
    setLockEnabledState(enabled);
  };

  const changeReminder = async (enabled: boolean) => {
    setBusy('reminder');
    try {
      if (enabled) await enableDailyReminder();
      else await disableDailyReminder();
      await updateSetting.mutateAsync({ key: 'dailyReminderEnabled', value: enabled });
    } catch (error) {
      Alert.alert(
        'Erinnerung nicht aktiviert',
        error instanceof Error ? error.message : 'Bitte prüfe die Systemeinstellungen.',
      );
    } finally {
      setBusy(null);
    }
  };

  const runExport = async (format: 'json' | 'csv') => {
    if (!settings) return;
    setBusy(format);
    try {
      if (format === 'json') await exportJson(entriesQuery.data ?? [], settings);
      else await exportCsv(entriesQuery.data ?? []);
    } catch {
      Alert.alert('Export fehlgeschlagen', 'Die Exportdatei konnte nicht erstellt werden.');
    } finally {
      setBusy(null);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Alle lokalen Daten löschen?',
      'Perioden, Symptome, Notizen, Einstellungen und Erinnerungen werden dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: () => {
            void disableDailyReminder()
              .then(() => setAppLockEnabled(false))
              .then(() => resetData.mutateAsync())
              .then(() => router.replace('/onboarding'));
          },
        },
      ],
    );
  };

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Typography variant="title">Ich & Datenschutz</Typography>
          <Typography muted>Deine Einstellungen gelten nur auf diesem Gerät.</Typography>
        </View>
        <View style={[styles.localBadge, { backgroundColor: theme.colors.primarySoft }]}>
          <Ionicons name="phone-portrait-outline" size={18} color={theme.colors.primary} />
          <Typography variant="caption">Lokal</Typography>
        </View>
      </View>

      <SectionHeader title="Dein Ziel" />
      <Card>
        <View style={styles.chips}>
          {goalOptions.map(([value, label]) => (
            <ChoiceChip
              key={value}
              label={label}
              compact
              selected={settings?.goal === value}
              onPress={() => updateSetting.mutate({ key: 'goal', value })}
            />
          ))}
        </View>
      </Card>

      <SectionHeader title="Darstellung" />
      <Card>
        <View style={styles.chips}>
          {[
            ['system', 'System'],
            ['light', 'Hell'],
            ['dark', 'Dunkel'],
          ].map(([mode, label]) => (
            <ChoiceChip
              key={mode}
              label={label!}
              compact
              selected={themeMode === mode}
              onPress={() => changeTheme(mode as ThemeMode)}
            />
          ))}
        </View>
      </Card>

      <SectionHeader title="Erinnerungen & Schutz" />
      <Card style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="notifications-outline" size={23} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Typography variant="label">Täglicher Check-in um 20:00 Uhr</Typography>
            <Typography variant="caption" muted>
              Neutraler Text ohne Gesundheitsdetails
            </Typography>
          </View>
          <Switch
            accessibilityLabel="Tägliche Erinnerung"
            value={settings?.dailyReminderEnabled ?? false}
            disabled={busy === 'reminder'}
            onValueChange={(value) => void changeReminder(value)}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
          />
        </View>
        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="lock-closed-outline" size={23} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Typography variant="label">App-Sperre</Typography>
            <Typography variant="caption" muted>
              Mit der Gerätesicherheit entsperren
            </Typography>
          </View>
          <Switch
            accessibilityLabel="App-Sperre"
            value={lockEnabled}
            onValueChange={(value) => void changeLock(value)}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
          />
        </View>
      </Card>

      <SectionHeader
        title="Deine Daten"
        subtitle={`${entriesQuery.data?.length ?? 0} dokumentierte Tage auf diesem Gerät`}
      />
      <View style={styles.exportGrid}>
        <View style={styles.exportButton}>
          <Button
            label="JSON exportieren"
            variant="secondary"
            icon="document-text-outline"
            loading={busy === 'json'}
            onPress={() => void runExport('json')}
          />
        </View>
        <View style={styles.exportButton}>
          <Button
            label="CSV exportieren"
            variant="secondary"
            icon="grid-outline"
            loading={busy === 'csv'}
            onPress={() => void runExport('csv')}
          />
        </View>
      </View>
      <Card tone="primary" style={styles.privacyCard}>
        <View style={styles.privacyHead}>
          <Ionicons name="shield-checkmark-outline" size={27} color={theme.colors.primary} />
          <Typography variant="heading">Privat im MVP</Typography>
        </View>
        <Typography muted>
          Cykla nutzt kein Konto, kein Werbe-SDK und kein externes Analytics-SDK. Gesundheitsdaten
          werden nicht übertragen. Exportdateien enthalten sensible Angaben; bewahre sie geschützt
          auf.
        </Typography>
      </Card>

      <Button
        label="Alle lokalen Daten löschen"
        variant="danger"
        loading={resetData.isPending}
        onPress={confirmReset}
      />

      <View style={styles.about}>
        <Typography variant="label">{BRAND.appTitle}</Typography>
        <Typography variant="caption" muted>
          Version 0.1.0 · Open Source · AGPL-3.0
        </Typography>
        <Typography variant="caption" muted style={styles.aboutText}>
          Cykla ist keine medizinische Anwendung zur Diagnose und keine sichere Verhütungsmethode.
        </Typography>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  settingCard: {
    gap: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIcon: {
    width: 42,
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  exportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exportButton: {
    flex: 1,
    minWidth: 170,
  },
  privacyCard: {
    gap: spacing.md,
  },
  privacyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  about: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  aboutText: {
    textAlign: 'center',
    maxWidth: 450,
    marginTop: spacing.sm,
  },
});
