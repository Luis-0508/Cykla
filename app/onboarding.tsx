import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { router } from 'expo-router';
import { z } from 'zod';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { CyklaMark } from '@/components/ui/CyklaMark';
import { Typography } from '@/components/ui/Typography';
import { addDays, formatGermanDate, parseDateOnly, todayDate } from '@/domain/dateOnly';
import type { Goal } from '@/domain/models';
import { useCompleteOnboarding } from '@/hooks/useCyklaData';
import { de } from '@/i18n/de';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

const schema = z.object({
  goal: z.enum(['track', 'conceive', 'unsure']),
  lastPeriodDate: z.string().refine((value) => {
    try {
      return parseDateOnly(value) <= parseDateOnly(todayDate());
    } catch {
      return false;
    }
  }, 'Bitte wähle ein gültiges Datum, das nicht in der Zukunft liegt.'),
  typicalCycleLength: z.number().int().min(20).max(60),
  typicalPeriodLength: z.number().int().min(1).max(10),
});

type OnboardingForm = z.infer<typeof schema>;

const goalOptions: { value: Goal; title: string; body: string }[] = [
  {
    value: 'track',
    title: 'Zyklus beobachten',
    body: 'Periode, Wohlbefinden und Veränderungen dokumentieren.',
  },
  {
    value: 'conceive',
    title: 'Mögliche fruchtbare Tage verstehen',
    body: 'Vorsichtige Schätzungen sehen – nicht zur Verhütung geeignet.',
  },
  {
    value: 'unsure',
    title: 'Noch nicht sicher',
    body: 'Mit den Grundlagen starten und später entscheiden.',
  },
];

function Stepper({
  label,
  value,
  minimum,
  maximum,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const theme = useCyklaTheme();
  return (
    <Card style={styles.stepperCard}>
      <Typography variant="label">{label}</Typography>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} verringern`}
          onPress={() => onChange(Math.max(minimum, value - 1))}
          style={[styles.stepperButton, { borderColor: theme.colors.border }]}
        >
          <Typography variant="heading">−</Typography>
        </Pressable>
        <View style={styles.stepperValue}>
          <Typography variant="display">{value}</Typography>
          <Typography muted>{suffix}</Typography>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} erhöhen`}
          onPress={() => onChange(Math.min(maximum, value + 1))}
          style={[styles.stepperButton, { borderColor: theme.colors.border }]}
        >
          <Typography variant="heading">+</Typography>
        </Pressable>
      </View>
    </Card>
  );
}

export default function OnboardingScreen() {
  const theme = useCyklaTheme();
  const [step, setStep] = useState(0);
  const complete = useCompleteOnboarding();
  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      goal: 'track',
      lastPeriodDate: '',
      typicalCycleLength: 28,
      typicalPeriodLength: 5,
    },
  });

  const selectedDate = useWatch({ control, name: 'lastPeriodDate' });
  const quickDates = useMemo(
    () => [0, -7, -14, -21, -28].map((offset) => addDays(todayDate(), offset)),
    [],
  );

  const goForward = async () => {
    if (step === 2 && !(await trigger('lastPeriodDate'))) return;
    setStep((value) => Math.min(4, value + 1));
  };

  const finish = handleSubmit(async (values) => {
    await complete.mutateAsync(values);
    router.replace('/(tabs)');
  });

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.progressRow}>
        {Array.from({ length: 5 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progress,
              {
                backgroundColor: index <= step ? theme.colors.primary : theme.colors.primarySoft,
              },
            ]}
          />
        ))}
      </View>

      {step === 0 ? (
        <View style={styles.hero}>
          <CyklaMark size={84} />
          <Typography variant="display">{de.onboarding.welcomeTitle}</Typography>
          <Typography muted>{de.onboarding.welcomeBody}</Typography>
          <Card tone="accent">
            <Typography variant="label">Privat von Anfang an</Typography>
            <Typography muted style={styles.cardCopy}>
              {de.onboarding.privacy}
            </Typography>
          </Card>
          <Button label="Ohne Konto fortfahren" onPress={() => void goForward()} />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.step}>
          <Typography variant="title">Was ist dir gerade wichtig?</Typography>
          <Typography muted>Du kannst diese Auswahl später ändern.</Typography>
          <Controller
            control={control}
            name="goal"
            render={({ field: { value, onChange } }) => (
              <View style={styles.optionList}>
                {goalOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: value === option.value }}
                    onPress={() => onChange(option.value)}
                  >
                    <Card
                      style={[
                        styles.goalCard,
                        value === option.value
                          ? { borderColor: theme.colors.primary, borderWidth: 2 }
                          : {},
                      ]}
                    >
                      <View style={styles.goalRow}>
                        <View style={styles.goalText}>
                          <Typography variant="heading">{option.title}</Typography>
                          <Typography muted>{option.body}</Typography>
                        </View>
                        <View
                          style={[
                            styles.radio,
                            { borderColor: theme.colors.primary },
                            value === option.value && {
                              backgroundColor: theme.colors.primary,
                            },
                          ]}
                        />
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.step}>
          <Typography variant="title">Wann begann deine letzte Periode?</Typography>
          <Typography muted>
            Wähle ein ungefähres Datum. Du kannst es im Kalender jederzeit bearbeiten.
          </Typography>
          <Controller
            control={control}
            name="lastPeriodDate"
            render={({ field: { value, onChange, onBlur } }) => (
              <>
                <TextInput
                  accessibilityLabel="Beginn der letzten Periode"
                  placeholder="JJJJ-MM-TT"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  inputMode="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={[
                    styles.dateInput,
                    {
                      color: theme.colors.text,
                      borderColor: errors.lastPeriodDate
                        ? theme.colors.danger
                        : theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                />
                {value && !errors.lastPeriodDate ? (
                  <Typography variant="label">{formatGermanDate(value)}</Typography>
                ) : null}
              </>
            )}
          />
          {errors.lastPeriodDate ? (
            <Typography style={{ color: theme.colors.danger }}>
              {errors.lastPeriodDate.message}
            </Typography>
          ) : null}
          <View style={styles.chipWrap}>
            {quickDates.map((date) => (
              <ChoiceChip
                key={date}
                compact
                selected={selectedDate === date}
                label={
                  date === todayDate()
                    ? 'Heute'
                    : formatGermanDate(date, { day: 'numeric', month: 'short' })
                }
                onPress={() => setValue('lastPeriodDate', date, { shouldValidate: true })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.step}>
          <Typography variant="title">Was ist für dich typisch?</Typography>
          <Typography muted>
            Diese Werte dienen nur als erste Annahme. Mit dokumentierten Zyklen wird die Schätzung
            persönlicher.
          </Typography>
          <Controller
            control={control}
            name="typicalCycleLength"
            render={({ field: { value, onChange } }) => (
              <Stepper
                label="Zykluslänge"
                value={value}
                minimum={20}
                maximum={60}
                suffix="Tage"
                onChange={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="typicalPeriodLength"
            render={({ field: { value, onChange } }) => (
              <Stepper
                label="Blutungsdauer"
                value={value}
                minimum={1}
                maximum={10}
                suffix="Tage"
                onChange={onChange}
              />
            )}
          />
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.step}>
          <CyklaMark size={64} />
          <Typography variant="title">Bereit für deinen ersten Überblick</Typography>
          <Card tone="primary">
            <Typography variant="heading">Deine Daten bleiben bei dir</Typography>
            <Typography muted style={styles.cardCopy}>
              Kein Konto, keine Werbung, kein externes Analytics-SDK. Export und vollständiges
              Löschen findest du jederzeit unter „Ich“.
            </Typography>
          </Card>
          <Card>
            <Typography variant="label">Bitte im Blick behalten</Typography>
            <Typography muted style={styles.cardCopy}>
              Prognosen können abweichen. Cykla ist keine Verhütungsmethode und ersetzt keine
              medizinische Beratung.
            </Typography>
          </Card>
          <Button label="Cykla öffnen" loading={complete.isPending} onPress={() => void finish()} />
          {complete.error ? (
            <Typography style={{ color: theme.colors.danger }}>
              Deine Angaben konnten nicht gespeichert werden. Bitte versuche es erneut.
            </Typography>
          ) : null}
        </View>
      ) : null}

      {step > 0 && step < 4 ? (
        <View style={styles.footer}>
          <Button label="Zurück" variant="ghost" onPress={() => setStep(step - 1)} />
          <View style={styles.footerMain}>
            <Button label="Weiter" onPress={() => void goForward()} />
          </View>
        </View>
      ) : null}
      {step === 4 ? <Button label="Zurück" variant="ghost" onPress={() => setStep(3)} /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progress: {
    height: 5,
    flex: 1,
    borderRadius: radii.pill,
  },
  hero: {
    paddingTop: spacing.xxl,
    gap: spacing.xl,
  },
  step: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  cardCopy: {
    marginTop: spacing.sm,
  },
  optionList: {
    gap: spacing.md,
  },
  goalCard: {
    padding: spacing.lg,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  goalText: {
    flex: 1,
    gap: spacing.xs,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 22,
    borderWidth: 2,
  },
  dateInput: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontSize: 20,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stepperCard: {
    gap: spacing.lg,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerMain: {
    flex: 1,
  },
});
