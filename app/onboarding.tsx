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
  }, de.onboardingDetails.invalidDate),
  typicalCycleLength: z.number().int().min(20).max(60),
  typicalPeriodLength: z.number().int().min(1).max(10),
});

type OnboardingForm = z.infer<typeof schema>;

const goalOptions: { value: Goal; title: string; body: string }[] = [
  {
    value: 'track',
    title: de.onboardingDetails.trackTitle,
    body: de.onboardingDetails.trackBody,
  },
  {
    value: 'conceive',
    title: de.onboardingDetails.conceiveTitle,
    body: de.onboardingDetails.conceiveBody,
  },
  {
    value: 'unsure',
    title: de.onboardingDetails.unsureTitle,
    body: de.onboardingDetails.unsureBody,
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
          accessibilityLabel={de.onboardingDetails.decrease(label)}
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
          accessibilityLabel={de.onboardingDetails.increase(label)}
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
            <Typography variant="label">{de.onboardingDetails.privateTitle}</Typography>
            <Typography muted style={styles.cardCopy}>
              {de.onboarding.privacy}
            </Typography>
          </Card>
          <Button
            label={de.onboardingDetails.continueWithoutAccount}
            onPress={() => void goForward()}
          />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.step}>
          <Typography variant="title">{de.onboardingDetails.goalTitle}</Typography>
          <Typography muted>{de.onboardingDetails.goalBody}</Typography>
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
          <Typography variant="title">{de.onboardingDetails.periodTitle}</Typography>
          <Typography muted>{de.onboardingDetails.periodBody}</Typography>
          <Controller
            control={control}
            name="lastPeriodDate"
            render={({ field: { value, onChange, onBlur } }) => (
              <>
                <TextInput
                  accessibilityLabel={de.onboardingDetails.periodLabel}
                  placeholder={de.onboardingDetails.datePlaceholder}
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
                    ? de.onboardingDetails.today
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
          <Typography variant="title">{de.onboardingDetails.typicalTitle}</Typography>
          <Typography muted>{de.onboardingDetails.typicalBody}</Typography>
          <Controller
            control={control}
            name="typicalCycleLength"
            render={({ field: { value, onChange } }) => (
              <Stepper
                label={de.onboardingDetails.cycleLength}
                value={value}
                minimum={20}
                maximum={60}
                suffix={de.onboardingDetails.days}
                onChange={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="typicalPeriodLength"
            render={({ field: { value, onChange } }) => (
              <Stepper
                label={de.onboardingDetails.periodLength}
                value={value}
                minimum={1}
                maximum={10}
                suffix={de.onboardingDetails.days}
                onChange={onChange}
              />
            )}
          />
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.step}>
          <CyklaMark size={64} />
          <Typography variant="title">{de.onboardingDetails.ready}</Typography>
          <Card tone="primary">
            <Typography variant="heading">{de.onboardingDetails.privacyTitle}</Typography>
            <Typography muted style={styles.cardCopy}>
              {de.onboardingDetails.privacyBody}
            </Typography>
          </Card>
          <Card>
            <Typography variant="label">{de.onboardingDetails.cautionTitle}</Typography>
            <Typography muted style={styles.cardCopy}>
              {de.onboardingDetails.cautionBody}
            </Typography>
          </Card>
          <Button
            label={de.onboardingDetails.open}
            loading={complete.isPending}
            onPress={() => void finish()}
          />
          {complete.error ? (
            <Typography style={{ color: theme.colors.danger }}>
              {de.onboardingDetails.saveError}
            </Typography>
          ) : null}
        </View>
      ) : null}

      {step > 0 && step < 4 ? (
        <View style={styles.footer}>
          <Button
            label={de.onboardingDetails.back}
            variant="ghost"
            onPress={() => setStep(step - 1)}
          />
          <View style={styles.footerMain}>
            <Button label={de.onboardingDetails.continue} onPress={() => void goForward()} />
          </View>
        </View>
      ) : null}
      {step === 4 ? (
        <Button label={de.onboardingDetails.back} variant="ghost" onPress={() => setStep(3)} />
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
