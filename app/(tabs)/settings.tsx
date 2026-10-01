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
import type { BackupData } from '@/database/repository';
import {
  useEntries,
  useExcludedCycles,
  useResetData,
  useRestoreBackup,
  useSettings,
  useUpdateSetting,
} from '@/hooks/useCyklaData';
import { LANGUAGES, SUPPORTED_LANGUAGES, type LanguagePreference } from '@/i18n/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import {
  authenticateApp,
  canUseAppLock,
  isAppLockEnabled,
  setAppLockEnabled,
} from '@/services/appLock';
import { BackupError } from '@/services/backup';
import { exportCsv, exportJson } from '@/services/export';
import { chooseBackup } from '@/services/import';
import { disableDailyReminder, enableDailyReminder } from '@/services/notifications';
import { type ThemeMode, useUiStore } from '@/store/uiStore';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

const APP_VERSION = '0.1.0';

export default function SettingsScreen() {
  const theme = useCyklaTheme();
  const { t, preference: languagePreference } = useI18n();
  const goalOptions = [
    ['track', t.settings.track],
    ['conceive', t.settings.conceive],
    ['unsure', t.settings.unsure],
  ] as const;
  // Language names stay in their own language so they are recognisable in any UI language.
  const languageOptions: [LanguagePreference, string][] = [
    ['system', t.settings.languageAutomatic],
    ...SUPPORTED_LANGUAGES.map((language): [LanguagePreference, string] => [
      language,
      LANGUAGES[language].nativeName,
    ]),
  ];
  const settingsQuery = useSettings();
  const entriesQuery = useEntries();
  const exclusionsQuery = useExcludedCycles();
  const restoreData = useRestoreBackup();
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

  // A manual choice is stored and overrides the device language until set back to automatic.
  const changeLanguage = (language: LanguagePreference) => {
    updateSetting.mutate({ key: 'language', value: language });
  };

  const changeLock = async (enabled: boolean) => {
    setBusy('lock');
    try {
      if (enabled && !(await canUseAppLock())) {
        Alert.alert(
          t.settings.lockUnavailable,
          Platform.OS === 'web' ? t.settings.lockMobileOnly : t.settings.lockSetup,
        );
        return;
      }
      if (enabled && !(await authenticateApp(t.lock))) {
        return;
      }
      await setAppLockEnabled(enabled);
      setLockEnabledState(enabled);
    } catch {
      Alert.alert(t.settings.lock, t.settings.lockError);
    } finally {
      setBusy(null);
    }
  };

  const changeReminder = async (enabled: boolean) => {
    setBusy('reminder');
    try {
      if (enabled) await enableDailyReminder(t.notifications);
      else await disableDailyReminder();
      await updateSetting.mutateAsync({ key: 'dailyReminderEnabled', value: enabled });
    } catch (error) {
      Alert.alert(
        t.settings.reminderFailed,
        error instanceof Error ? error.message : t.settings.checkSystem,
      );
    } finally {
      setBusy(null);
    }
  };

  const runExport = async (format: 'json' | 'csv') => {
    if (!settings) return;
    // A backup without the loaded exclusions would silently drop them on restore.
    if (format === 'json' && !exclusionsQuery.data) {
      Alert.alert(t.settings.exportFailed, t.settings.exportError);
      return;
    }
    setBusy(format);
    try {
      if (format === 'json')
        await exportJson(
          entriesQuery.data ?? [],
          settings,
          exclusionsQuery.data ?? [],
          t.settings.shareExport,
        );
      else await exportCsv(entriesQuery.data ?? [], t.settings.shareExport);
    } catch {
      Alert.alert(t.settings.exportFailed, t.settings.exportError);
    } finally {
      setBusy(null);
    }
  };

  // Busy stays set until the confirmation is answered; Alert.alert does not block.
  const runImport = async () => {
    setBusy('import');
    let backup: BackupData | null;
    try {
      backup = await chooseBackup();
    } catch (error) {
      setBusy(null);
      Alert.alert(
        t.settings.importFailed,
        error instanceof BackupError
          ? t.settings.backupError[error.code]
          : t.settings.importReadError,
      );
      return;
    }
    if (!backup) {
      setBusy(null);
      return;
    }
    const confirmed = backup;
    Alert.alert(
      t.settings.importConfirmTitle,
      [
        t.settings.importConfirmBody(confirmed.entries.length),
        confirmed.version === 1 ? t.settings.importLegacyNote : '',
      ]
        .filter(Boolean)
        .join(' '),
      [
        { text: t.common.cancel, style: 'cancel', onPress: () => setBusy(null) },
        {
          text: t.settings.importConfirm,
          style: 'destructive',
          onPress: () => {
            void restoreData
              .mutateAsync(confirmed)
              .then(() => Alert.alert(t.settings.importDoneTitle, t.settings.importDoneBody))
              .catch(() => Alert.alert(t.settings.importFailed, t.settings.importUnchanged))
              .finally(() => setBusy(null));
          },
        },
      ],
      { cancelable: true, onDismiss: () => setBusy(null) },
    );
  };

  const confirmReset = () => {
    Alert.alert(t.settings.deleteTitle, t.settings.deleteWarning, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.settings.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          void disableDailyReminder()
            .then(() => setAppLockEnabled(false))
            .then(() => resetData.mutateAsync())
            .then(() => router.replace('/onboarding'))
            .catch(() => Alert.alert(t.settings.deleteAll, t.settings.deleteError));
        },
      },
    ]);
  };

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Typography variant="title">{t.settings.title}</Typography>
          <Typography muted>{t.settings.deviceOnly}</Typography>
        </View>
        <View style={[styles.localBadge, { backgroundColor: theme.colors.primarySoft }]}>
          <Ionicons name="phone-portrait-outline" size={18} color={theme.colors.primary} />
          <Typography variant="caption">{t.settings.local}</Typography>
        </View>
      </View>

      <SectionHeader title={t.settings.goal} />
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

      <SectionHeader title={t.settings.appearance} />
      <Card>
        <View style={styles.chips}>
          {[
            ['system', t.settings.system],
            ['light', t.settings.light],
            ['dark', t.settings.dark],
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

      <SectionHeader title={t.settings.language} subtitle={t.settings.languageSubtitle} />
      <Card>
        <View style={styles.chips}>
          {languageOptions.map(([language, label]) => (
            <ChoiceChip
              key={language}
              label={label}
              compact
              selected={languagePreference === language}
              onPress={() => changeLanguage(language)}
            />
          ))}
        </View>
      </Card>

      <SectionHeader title={t.settings.protection} />
      <Card style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="notifications-outline" size={23} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Typography variant="label">{t.settings.reminder}</Typography>
            <Typography variant="caption" muted>
              {t.settings.neutralReminder}
            </Typography>
          </View>
          <Switch
            accessibilityLabel={t.settings.reminderLabel}
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
            <Typography variant="label">{t.settings.lock}</Typography>
            <Typography variant="caption" muted>
              {t.settings.deviceSecurity}
            </Typography>
          </View>
          <Switch
            accessibilityLabel={t.settings.lock}
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
        title={t.settings.data}
        subtitle={t.settings.documentedDays(entriesQuery.data?.length ?? 0)}
      />
      <View style={styles.exportGrid}>
        <View style={styles.exportButton}>
          <Button
            label={t.settings.json}
            variant="secondary"
            icon="document-text-outline"
            disabled={busy !== null}
            loading={busy === 'json'}
            onPress={() => void runExport('json')}
          />
        </View>
        <View style={styles.exportButton}>
          <Button
            label={t.settings.csv}
            variant="secondary"
            icon="grid-outline"
            disabled={busy !== null}
            loading={busy === 'csv'}
            onPress={() => void runExport('csv')}
          />
        </View>
      </View>
      {Platform.OS !== 'web' ? (
        <Card style={styles.privacyCard}>
          <Typography variant="heading">{t.settings.importTitle}</Typography>
          <Typography muted>{t.settings.importBody}</Typography>
          <Button
            label={t.settings.importButton}
            variant="secondary"
            icon="download-outline"
            disabled={busy !== null}
            loading={busy === 'import'}
            onPress={() => void runImport()}
          />
        </Card>
      ) : null}
      <Card tone="primary" style={styles.privacyCard}>
        <View style={styles.privacyHead}>
          <Ionicons name="shield-checkmark-outline" size={27} color={theme.colors.primary} />
          <Typography variant="heading">{t.settings.privacyTitle}</Typography>
        </View>
        <Typography muted>{t.settings.privacyBody}</Typography>
      </Card>

      <Button
        label={t.settings.deleteAll}
        variant="danger"
        loading={resetData.isPending}
        onPress={confirmReset}
      />

      <View style={styles.about}>
        <Typography variant="label">{t.brand.appTitle}</Typography>
        <Typography variant="caption" muted>
          {t.settings.version(APP_VERSION)}
        </Typography>
        <Typography variant="caption" muted style={styles.aboutText}>
          {t.settings.medical}
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
