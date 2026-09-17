import { de } from '@/i18n/de';
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
  ['track', de.settings.track],
  ['conceive', de.settings.conceive],
  ['unsure', de.settings.unsure],
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
    setBusy('lock');
    try {
      if (enabled && !(await canUseAppLock())) {
        Alert.alert(
          de.settings.lockUnavailable,
          Platform.OS === 'web' ? de.settings.lockMobileOnly : de.settings.lockSetup,
        );
        return;
      }
      if (enabled && !(await authenticateApp())) {
        return;
      }
      await setAppLockEnabled(enabled);
      setLockEnabledState(enabled);
    } catch {
      Alert.alert(de.settings.lock, de.settings.lockError);
    } finally {
      setBusy(null);
    }
  };

  const changeReminder = async (enabled: boolean) => {
    setBusy('reminder');
    try {
      if (enabled) await enableDailyReminder();
      else await disableDailyReminder();
      await updateSetting.mutateAsync({ key: 'dailyReminderEnabled', value: enabled });
    } catch (error) {
      Alert.alert(
        de.settings.reminderFailed,
        error instanceof Error ? error.message : de.settings.checkSystem,
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
      Alert.alert(de.settings.exportFailed, de.settings.exportError);
    } finally {
      setBusy(null);
    }
  };

  const confirmReset = () => {
    Alert.alert(de.settings.deleteTitle, de.settings.deleteWarning, [
      { text: de.settings.cancel, style: 'cancel' },
      {
        text: de.settings.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          void disableDailyReminder()
            .then(() => setAppLockEnabled(false))
            .then(() => resetData.mutateAsync())
            .then(() => router.replace('/onboarding'))
            .catch(() => Alert.alert(de.settings.deleteAll, de.settings.deleteError));
        },
      },
    ]);
  };

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Typography variant="title">{de.settings.title}</Typography>
          <Typography muted>{de.settings.deviceOnly}</Typography>
        </View>
        <View style={[styles.localBadge, { backgroundColor: theme.colors.primarySoft }]}>
          <Ionicons name="phone-portrait-outline" size={18} color={theme.colors.primary} />
          <Typography variant="caption">{de.settings.local}</Typography>
        </View>
      </View>

      <SectionHeader title={de.settings.goal} />
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

      <SectionHeader title={de.settings.appearance} />
      <Card>
        <View style={styles.chips}>
          {[
            ['system', de.settings.system],
            ['light', de.settings.light],
            ['dark', de.settings.dark],
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

      <SectionHeader title={de.settings.protection} />
      <Card style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="notifications-outline" size={23} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Typography variant="label">{de.settings.reminder}</Typography>
            <Typography variant="caption" muted>
              {de.settings.neutralReminder}
            </Typography>
          </View>
          <Switch
            accessibilityLabel={de.settings.reminderLabel}
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
            <Typography variant="label">{de.settings.lock}</Typography>
            <Typography variant="caption" muted>
              {de.settings.deviceSecurity}
            </Typography>
          </View>
          <Switch
            accessibilityLabel={de.settings.lock}
            value={lockEnabled}
            disabled={busy === 'lock'}
            onValueChange={(value) => void changeLock(value)}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
          />
        </View>
      </Card>

      <SectionHeader
        title={de.settings.data}
        subtitle={de.settings.documentedDays(entriesQuery.data?.length ?? 0)}
      />
      <View style={styles.exportGrid}>
        <View style={styles.exportButton}>
          <Button
            label={de.settings.json}
            variant="secondary"
            icon="document-text-outline"
            disabled={busy !== null}
            loading={busy === 'json'}
            onPress={() => void runExport('json')}
          />
        </View>
        <View style={styles.exportButton}>
          <Button
            label={de.settings.csv}
            variant="secondary"
            icon="grid-outline"
            disabled={busy !== null}
            loading={busy === 'csv'}
            onPress={() => void runExport('csv')}
          />
        </View>
      </View>
      <Card tone="primary" style={styles.privacyCard}>
        <View style={styles.privacyHead}>
          <Ionicons name="shield-checkmark-outline" size={27} color={theme.colors.primary} />
          <Typography variant="heading">{de.settings.privacyTitle}</Typography>
        </View>
        <Typography muted>{de.settings.privacyBody}</Typography>
      </Card>

      <Button
        label={de.settings.deleteAll}
        variant="danger"
        loading={resetData.isPending}
        onPress={confirmReset}
      />

      <View style={styles.about}>
        <Typography variant="label">{BRAND.appTitle}</Typography>
        <Typography variant="caption" muted>
          {de.settings.version}
        </Typography>
        <Typography variant="caption" muted style={styles.aboutText}>
          {de.settings.medical}
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
