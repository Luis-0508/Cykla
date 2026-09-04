import { useEffect } from 'react';
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
import { LoadingState } from '@/components/ui/States';
import { Typography } from '@/components/ui/Typography';
import { formatGermanDate, parseDateOnly } from '@/domain/dateOnly';
import type { FlowIntensity, Mood } from '@/domain/models';
import { useDeleteEntry, useEntry, useSaveEntry } from '@/hooks/useCyklaData';
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

const flowOptions: { value: FlowIntensity; label: string }[] = [
  { value: 'none', label: 'Keine' },
  { value: 'spotting', label: 'Schmierblutung' },
  { value: 'light', label: 'Leicht' },
  { value: 'medium', label: 'Mittel' },
  { value: 'heavy', label: 'Stark' },
];

const moods: { value: Mood; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'calm', label: 'Ruhig', icon: 'leaf-outline' },
  { value: 'happy', label: 'Zufrieden', icon: 'happy-outline' },
  { value: 'sensitive', label: 'Sensibel', icon: 'heart-outline' },
  { value: 'irritable', label: 'Gereizt', icon: 'flash-outline' },
  { value: 'sad', label: 'Traurig', icon: 'rainy-outline' },
  { value: 'stressed', label: 'Gestresst', icon: 'speedometer-outline' },
];

const symptoms = [
  ['cramps', 'Krämpfe'],
  ['headache', 'Kopfschmerz'],
  ['bloating', 'Blähungen'],
  ['breast_tenderness', 'Brustempfindlichkeit'],
  ['nausea', 'Übelkeit'],
  ['back_pain', 'Rückenschmerz'],
  ['acne', 'Hautveränderung'],
  ['cravings', 'Heißhunger'],
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
  return (
    <View style={styles.scale}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: value === null }}
        accessibilityLabel={`${accessibilityLabel} nicht eingetragen`}
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
          accessibilityLabel={`${accessibilityLabel} ${option}`}
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
  const theme = useCyklaTheme();
  const entryQuery = useEntry(validDate ?? '');
  const saveEntry = useSaveEntry();
  const deleteEntry = useDeleteEntry();
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EntryForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flow: 'none',
      mood: null,
      pain: null,
      energy: null,
      sleepHours: null,
      sleepQuality: null,
      symptoms: [],
      notes: '',
    },
  });
  const selectedSymptoms = useWatch({ control, name: 'symptoms' });
  const notes = useWatch({ control, name: 'notes' });

  useEffect(() => {
    if (!entryQuery.data) return;
    reset({
      flow: entryQuery.data.flow,
      mood: entryQuery.data.mood,
      pain: entryQuery.data.pain,
      energy: entryQuery.data.energy,
      sleepHours: entryQuery.data.sleepHours,
      sleepQuality: entryQuery.data.sleepQuality,
      symptoms: entryQuery.data.symptoms.map((symptom) => symptom.code),
      notes: entryQuery.data.notes,
    });
  }, [entryQuery.data, reset]);

  if (!validDate) {
    return (
      <AppScreen>
        <Typography variant="title">Ungültiges Datum</Typography>
        <Button label="Schließen" onPress={() => router.back()} />
      </AppScreen>
    );
  }
  if (entryQuery.isLoading) return <LoadingState label="Eintrag wird geladen …" />;

  const onSubmit = handleSubmit(async (values) => {
    await saveEntry.mutateAsync({
      date: validDate,
      ...values,
      symptoms: values.symptoms.map((code) => ({ code, intensity: 1 })),
    });
    router.back();
  });

  const confirmDelete = () => {
    Alert.alert(
      'Eintrag löschen?',
      'Alle dokumentierten Angaben dieses Tages werden dauerhaft vom Gerät entfernt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            void deleteEntry.mutateAsync(validDate).then(() => router.back());
          },
        },
      ],
    );
  };

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tageseditor schließen"
          onPress={() => router.back()}
          style={[styles.close, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Typography variant="caption" muted>
            TAGESEINTRAG
          </Typography>
          <Typography variant="heading">{formatGermanDate(validDate)}</Typography>
        </View>
      </View>

      <Card tone="primary">
        <Typography variant="label">Dokumentiert, nicht berechnet</Typography>
        <Typography muted style={styles.cardCopy}>
          Alles auf dieser Seite stammt aus deiner Auswahl und bleibt auf diesem Gerät.
        </Typography>
      </Card>

      <Card style={styles.section}>
        <Typography variant="heading">Blutung</Typography>
        <Controller
          control={control}
          name="flow"
          render={({ field: { value, onChange } }) => (
            <View style={styles.chips}>
              {flowOptions.map((option) => (
                <ChoiceChip
                  key={option.value}
                  compact
                  label={option.label}
                  selected={value === option.value}
                  onPress={() => onChange(option.value)}
                />
              ))}
            </View>
          )}
        />
      </Card>

      <Card style={styles.section}>
        <View>
          <Typography variant="heading">Schmerzen</Typography>
          <Typography muted>0 bedeutet keine Schmerzen, 10 sehr starke Schmerzen.</Typography>
        </View>
        <Controller
          control={control}
          name="pain"
          render={({ field: { value, onChange } }) => (
            <Scale
              value={value}
              values={[0, 2, 4, 6, 8, 10]}
              onChange={onChange}
              accessibilityLabel="Schmerzintensität"
            />
          )}
        />
      </Card>

      <Card style={styles.section}>
        <Typography variant="heading">Stimmung</Typography>
        <Controller
          control={control}
          name="mood"
          render={({ field: { value, onChange } }) => (
            <View style={styles.chips}>
              {moods.map((mood) => (
                <ChoiceChip
                  key={mood.value}
                  compact
                  label={mood.label}
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
          <Typography variant="heading">Energie</Typography>
          <Typography muted>1 ist sehr niedrig, 5 sehr hoch.</Typography>
        </View>
        <Controller
          control={control}
          name="energy"
          render={({ field: { value, onChange } }) => (
            <Scale
              value={value}
              values={[1, 2, 3, 4, 5]}
              onChange={onChange}
              accessibilityLabel="Energie"
            />
          )}
        />
      </Card>

      <Card style={styles.section}>
        <Typography variant="heading">Schlaf</Typography>
        <Controller
          control={control}
          name="sleepHours"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              accessibilityLabel="Schlafdauer in Stunden"
              placeholder="z. B. 7,5 Stunden"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
              value={value == null ? '' : String(value).replace('.', ',')}
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
        <Typography variant="label">Schlafqualität</Typography>
        <Controller
          control={control}
          name="sleepQuality"
          render={({ field: { value, onChange } }) => (
            <Scale
              value={value}
              values={[1, 2, 3, 4, 5]}
              onChange={onChange}
              accessibilityLabel="Schlafqualität"
            />
          )}
        />
      </Card>

      <Card style={styles.section}>
        <Typography variant="heading">Symptome & Körper</Typography>
        <View style={styles.chips}>
          {symptoms.map(([code, label]) => {
            const selected = selectedSymptoms.includes(code);
            return (
              <ChoiceChip
                key={code}
                compact
                label={label}
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
          <Typography variant="heading">Notiz</Typography>
          <Typography variant="caption" muted>
            {notes.length}/1000
          </Typography>
        </View>
        <Controller
          control={control}
          name="notes"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              accessibilityLabel="Freie Notiz"
              multiline
              maxLength={1000}
              placeholder="Was möchtest du festhalten?"
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
        label="Eintrag speichern"
        icon="checkmark-circle-outline"
        loading={saveEntry.isPending}
        onPress={() => void onSubmit()}
      />
      {entryQuery.data ? (
        <Button
          label="Tagesdaten löschen"
          variant="danger"
          loading={deleteEntry.isPending}
          onPress={confirmDelete}
        />
      ) : null}
      {saveEntry.error ? (
        <Typography style={{ color: theme.colors.danger }}>
          Der Eintrag konnte nicht gespeichert werden. Deine bisherigen Daten wurden nicht
          verändert.
        </Typography>
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
