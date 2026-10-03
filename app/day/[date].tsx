import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Typography } from '@/components/ui/Typography';
import { parseDateOnly } from '@/domain/dateOnly';
import type { DailyEntry, FlowIntensity, Mood } from '@/domain/models';
import { useDeleteEntry, useEntry, useSaveEntry } from '@/hooks/useCyklaData';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

const formSchema = z.object({
  flow: z.enum(['none', 'spotting', 'light', 'medium', 'heavy']),
  mood: z.enum(['calm', 'happy', 'sensitive', 'irritable', 'sad', 'stressed']).nullable(),
  pain: z.number().min(0).max(10).nullable(),
  energy: z.number().min(1).max(5).nullable(),
  sleepHours: z.number().min(0).max(24).nullable(),
  sleepQuality: z.number().min(1).max(5).nullable(),
  symptoms: z.array(z.string()),
  notes: z.string().max(1000),
});

type EntryForm = z.infer<typeof formSchema>;

// Stored codes stay stable; labels come from the active language catalog.
const flowOptions: FlowIntensity[] = ['none', 'spotting', 'light', 'medium', 'heavy'];

const moods: { value: Mood; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'calm', icon: 'leaf-outline' },
  { value: 'happy', icon: 'happy-outline' },
  { value: 'sensitive', icon: 'heart-outline' },
  { value: 'irritable', icon: 'flash-outline' },
  { value: 'sad', icon: 'rainy-outline' },
  { value: 'stressed', icon: 'speedometer-outline' },
];

// Opened directly (web reload, link) the modal has no screen to go back to.
function closeEditor() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}

const symptoms = [
  'cramps',
  'headache',
  'bloating',
  'breast_tenderness',
  'nausea',
  'back_pain',
  'acne',
  'cravings',
] as const;

function Scale({
  value,
  values,
  onChange,
  accessibilityLabel,
}: {
  value: number | null;
  values: number[];
  onChange: (value: number | null) => void;
  accessibilityLabel: string;
}) {
  const theme = useCyklaTheme();
  const { t } = useI18n();
  return (
    <View style={styles.scale}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: value === null }}
        accessibilityLabel={t.dayEditor.scaleNotRecorded(accessibilityLabel)}
        onPress={() => onChange(null)}
        style={[
          styles.scaleButton,
          {
            borderColor: value === null ? theme.colors.primary : theme.colors.border,
            backgroundColor: value === null ? theme.colors.primarySoft : theme.colors.surface,
          },
        ]}
      >
        <Typography variant="caption">–</Typography>
      </Pressable>
      {values.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option }}
          accessibilityLabel={t.dayEditor.scaleValue(accessibilityLabel, option)}
          onPress={() => onChange(option)}
          style={[
            styles.scaleButton,
            {
              borderColor: value === option ? theme.colors.primary : theme.colors.border,
              backgroundColor: value === option ? theme.colors.primarySoft : theme.colors.surface,
            },
          ]}
        >
          <Typography variant="label">{option}</Typography>
        </Pressable>
      ))}
    </View>
  );
}

export default function DayEditorScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const validDate = (() => {
    try {
      if (!date) return null;
      parseDateOnly(date);
      return date;
    } catch {
      return null;
    }
  })();
  const { t } = useI18n();
  const entryQuery = useEntry(validDate ?? '');
  if (!validDate) {
    return (
      <AppScreen>
        <Typography variant="title">{t.dayEditor.invalidDate}</Typography>
        <Button label={t.common.close} onPress={closeEditor} />
      </AppScreen>
    );
  }
  if (entryQuery.isError) {
    return (
      <AppScreen>
        <ErrorState message={t.dayEditor.loadError} onRetry={() => void entryQuery.refetch()} />
        <Button label={t.common.close} onPress={closeEditor} />
      </AppScreen>
    );
  }
  if (!entryQuery.isSuccess) return <LoadingState label={t.dayEditor.loading} />;
  return <DayEntryForm key={validDate} date={validDate} entry={entryQuery.data} />;
}

// The form mounts only after a successful read; null alone means a new day.
function DayEntryForm({ date: validDate, entry }: { date: string; entry: DailyEntry | null }) {
  const theme = useCyklaTheme();
  const { t, formatDate, formatNumber, decimalSeparator } = useI18n();
  const saveEntry = useSaveEntry();
  const deleteEntry = useDeleteEntry();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EntryForm>({
    resolver: zodResolver(formSchema),
    values: {
      flow: entry?.flow ?? 'none',
      mood: entry?.mood ?? null,
      pain: entry?.pain ?? null,
      energy: entry?.energy ?? null,
      sleepHours: entry?.sleepHours ?? null,
      sleepQuality: entry?.sleepQuality ?? null,
      symptoms: entry?.symptoms.map((symptom) => symptom.code) ?? [],
      notes: entry?.notes ?? '',
    },
  });
  const selectedSymptoms = useWatch({ control, name: 'symptoms' });
  const notes = useWatch({ control, name: 'notes' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await saveEntry.mutateAsync({
        date: validDate,
        ...values,
        symptoms: values.symptoms.map((code) => ({ code, intensity: 1 })),
      });
    } catch {
      // Shown below via saveEntry.error; the form keeps the unsaved input.
      return;
    }
    closeEditor();
  });

  const confirmDelete = () => {
    Alert.alert(t.dayEditor.deleteTitle, t.dayEditor.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          deleteEntry.mutate(validDate, { onSuccess: closeEditor });
        },
      },
    ]);
  };

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.dayEditor.close}
          onPress={closeEditor}
          style={[styles.close, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Typography variant="caption" muted>
            {t.dayEditor.eyebrow}
          </Typography>
          <Typography variant="heading">{formatDate(validDate)}</Typography>
        </View>
      </View>

      <Card tone="primary">
        <Typography variant="label">{t.dayEditor.recordedTitle}</Typography>
        <Typography muted style={styles.cardCopy}>
          {t.dayEditor.recordedBody}
        </Typography>
      </Card>

      <Card style={styles.section}>
        <Typography variant="heading">{t.category.bleeding}</Typography>
        <Controller
          control={control}
          name="flow"
          render={({ field: { value, onChange } }) => (
            <View style={styles.chips}>
              {flowOptions.map((option) => (
                <ChoiceChip
                  key={option}
                  compact
                  label={t.flowOption[option]}
                  selected={value === option}
                  onPress={() => onChange(option)}
                />
              ))}
            </View>
          )}
        />
      </Card>

      <Card style={styles.section}>
        <View>
          <Typography variant="heading">{t.category.painPlural}</Typography>
          <Typography muted>{t.dayEditor.painScale}</Typography>
        </View>
        <Controller
          control={control}
          name="pain"
          render={({ field: { value, onChange } }) => (
            <Scale
              value={value}
              values={[0, 2, 4, 6, 8, 10]}
              onChange={onChange}
              accessibilityLabel={t.dayEditor.painLabel}
            />
          )}
        />
      </Card>

      <Card style={styles.section}>
        <Typography variant="heading">{t.category.mood}</Typography>
        <Controller
          control={control}
          name="mood"
          render={({ field: { value, onChange } }) => (
            <View style={styles.chips}>
              {moods.map((mood) => (
                <ChoiceChip
                  key={mood.value}
                  compact
                  label={t.mood[mood.value]}
                  icon={mood.icon}
                  selected={value === mood.value}
                  onPress={() => onChange(value === mood.value ? null : mood.value)}
                />
              ))}
            </View>
          )}
        />
      </Card>

      <Card style={styles.section}>
        <View>
          <Typography variant="heading">{t.category.energy}</Typography>
          <Typography muted>{t.dayEditor.energyScale}</Typography>
        </View>
        <Controller
          control={control}
          name="energy"
          render={({ field: { value, onChange } }) => (
            <Scale
              value={value}
              values={[1, 2, 3, 4, 5]}
              onChange={onChange}
              accessibilityLabel={t.category.energy}
            />
          )}
        />
      </Card>

      <Card style={styles.section}>
        <Typography variant="heading">{t.category.sleep}</Typography>
        <Controller
          control={control}
          name="sleepHours"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              accessibilityLabel={t.dayEditor.sleepHoursLabel}
              placeholder={t.dayEditor.sleepHoursPlaceholder(formatNumber(7.5))}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
              value={value == null ? '' : String(value).replace('.', decimalSeparator)}
              onBlur={onBlur}
              onChangeText={(text) => {
                const normalized = Number(text.replace(',', '.'));
                onChange(text.trim() === '' || Number.isNaN(normalized) ? null : normalized);
              }}
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  borderColor: errors.sleepHours ? theme.colors.danger : theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            />
          )}
        />
        <Typography variant="label">{t.dayEditor.sleepQuality}</Typography>
        <Controller
          control={control}
          name="sleepQuality"
          render={({ field: { value, onChange } }) => (
            <Scale
              value={value}
              values={[1, 2, 3, 4, 5]}
              onChange={onChange}
              accessibilityLabel={t.dayEditor.sleepQuality}
            />
          )}
        />
      </Card>

      <Card style={styles.section}>
        <Typography variant="heading">{t.dayEditor.symptomsTitle}</Typography>
        <View style={styles.chips}>
          {symptoms.map((code) => {
            const selected = selectedSymptoms.includes(code);
            return (
              <ChoiceChip
                key={code}
                compact
                label={t.symptom[code]}
                selected={selected}
                onPress={() =>
                  setValue(
                    'symptoms',
                    selected
                      ? selectedSymptoms.filter((value) => value !== code)
                      : [...selectedSymptoms, code],
                    { shouldDirty: true },
                  )
                }
              />
            );
          })}
        </View>
      </Card>

      <Card style={styles.section}>
        <View style={styles.notesHeader}>
          <Typography variant="heading">{t.dayEditor.note}</Typography>
          <Typography variant="caption" muted>
            {notes.length}/1000
          </Typography>
        </View>
        <Controller
          control={control}
          name="notes"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              accessibilityLabel={t.dayEditor.noteLabel}
              multiline
              maxLength={1000}
              placeholder={t.dayEditor.notePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              textAlignVertical="top"
              style={[
                styles.notes,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            />
          )}
        />
      </Card>

      <Button
        label={t.dayEditor.save}
        icon="checkmark-circle-outline"
        loading={saveEntry.isPending}
        onPress={() => void onSubmit()}
      />
      {entry ? (
        <Button
          label={t.dayEditor.deleteDay}
          variant="danger"
          loading={deleteEntry.isPending}
          onPress={confirmDelete}
        />
      ) : null}
      {saveEntry.error ? (
        <Typography style={{ color: theme.colors.danger }}>{t.dayEditor.saveError}</Typography>
      ) : null}
      {deleteEntry.error ? (
        <Typography style={{ color: theme.colors.danger }}>{t.dayEditor.deleteError}</Typography>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  close: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  cardCopy: {
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scaleButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notes: {
    minHeight: 130,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    fontSize: 16,
    lineHeight: 23,
  },
});
