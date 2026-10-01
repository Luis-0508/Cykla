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
import { addDays, parseDateOnly, todayDate } from '@/domain/dateOnly';
import type { Goal } from '@/domain/models';
import { useCompleteOnboarding } from '@/hooks/useCyklaData';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

// Validation messages are shown from the active catalog, not from the schema.
const schema = z.object({
  goal: z.enum(['track', 'conceive', 'unsure']),
  lastPeriodDate: z.string().refine((value) => {
    try {
      return parseDateOnly(value) <= parseDateOnly(todayDate());
    } catch {
      return false;
    }
  }),
  typicalCycleLength: z.number().int().min(20).max(60),
  typicalPeriodLength: z.number().int().min(1).max(10),
});

type OnboardingForm = z.infer<typeof schema>;

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
  suffix: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const theme = useCyklaTheme();
  const { t } = useI18n();
  return (
    <Card style={styles.stepperCard}>
      <Typography variant="label">{label}</Typography>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.onboarding.decrease(label)}
          onPress={() => onChange(Math.max(minimum, value - 1))}
          style={[styles.stepperButton, { borderColor: theme.colors.border }]}
        >
          <Typography variant="heading">−</Typography>
        </Pressable>
        <View style={styles.stepperValue}>
          <Typography variant="display">{value}</Typography>
          <Typography muted>{suffix(value)}</Typography>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.onboarding.increase(label)}
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
  const { t, formatDate } = useI18n();
  const goalOptions: { value: Goal; title: string; body: string }[] = [
    { value: 'track', title: t.onboarding.trackTitle, body: t.onboarding.trackBody },
    { value: 'conceive', title: t.onboarding.conceiveTitle, body: t.onboarding.conceiveBody },
    { value: 'unsure', title: t.onboarding.unsureTitle, body: t.onboarding.unsureBody },
  ];
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
          <Typography variant="display">{t.onboarding.welcomeTitle}</Typography>
          <Typography muted>{t.onboarding.welcomeBody}</Typography>
          <Card tone="accent">
            <Typography variant="label">{t.onboarding.privateTitle}</Typography>
            <Typography muted style={styles.cardCopy}>
              {t.onboarding.privacy}
            </Typography>
          </Card>
          <Button label={t.onboarding.continueWithoutAccount} onPress={() => void goForward()} />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.step}>
          <Typography variant="title">{t.onboarding.goalTitle}</Typography>
          <Typography muted>{t.onboarding.goalBody}</Typography>
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
          <Typography variant="title">{t.onboarding.periodTitle}</Typography>
          <Typography muted>{t.onboarding.periodBody}</Typography>
          <Controller
            control={control}
            name="lastPeriodDate"
            render={({ field: { value, onChange, onBlur } }) => (
              <>
                <TextInput
                  accessibilityLabel={t.onboarding.periodLabel}
                  placeholder={t.onboarding.datePlaceholder}
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
                {schema.shape.lastPeriodDate.safeParse(value).success ? (
                  <Typography variant="label">{formatDate(value)}</Typography>
                ) : null}
              </>
            )}
          />
          {errors.lastPeriodDate ? (
            <Typography style={{ color: theme.colors.danger }}>
              {t.onboarding.invalidDate}
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
                    ? t.common.today
                    : formatDate(date, { day: 'numeric', month: 'short' })
                }
                onPress={() => setValue('lastPeriodDate', date, { shouldValidate: true })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.step}>
          <Typography variant="title">{t.onboarding.typicalTitle}</Typography>
          <Typography muted>{t.onboarding.typicalBody}</Typography>
          <Controller
            control={control}
            name="typicalCycleLength"
            render={({ field: { value, onChange } }) => (
              <Stepper
                label={t.onboarding.cycleLength}
                value={value}
                minimum={20}
                maximum={60}
                suffix={t.common.days}
                onChange={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="typicalPeriodLength"
            render={({ field: { value, onChange } }) => (
              <Stepper
                label={t.onboarding.periodLength}
                value={value}
                minimum={1}
                maximum={10}
                suffix={t.common.days}
                onChange={onChange}
              />
            )}
          />
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.step}>
          <CyklaMark size={64} />
          <Typography variant="title">{t.onboarding.ready}</Typography>
          <Card tone="primary">
            <Typography variant="heading">{t.onboarding.privacyTitle}</Typography>
            <Typography muted style={styles.cardCopy}>
              {t.onboarding.privacyBody}
            </Typography>
          </Card>
          <Card>
            <Typography variant="label">{t.onboarding.cautionTitle}</Typography>
            <Typography muted style={styles.cardCopy}>
              {t.onboarding.cautionBody}
            </Typography>
          </Card>
          <Button
            label={t.onboarding.open}
            loading={complete.isPending}
            onPress={() => void finish()}
          />
          {complete.error ? (
            <Typography style={{ color: theme.colors.danger }}>{t.onboarding.saveError}</Typography>
          ) : null}
        </View>
      ) : null}

      {step > 0 && step < 4 ? (
        <View style={styles.footer}>
          <Button label={t.common.back} variant="ghost" onPress={() => setStep(step - 1)} />
          <View style={styles.footerMain}>
            <Button label={t.common.continue} onPress={() => void goForward()} />
          </View>
        </View>
      ) : null}
      {step === 4 ? (
        <Button label={t.common.back} variant="ghost" onPress={() => setStep(3)} />
      ) : null}
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
