import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Typography } from '@/components/ui/Typography';
import { MAX_FLOW_RANGE_DAYS, type SaveFlowRangeInput } from '@/database/repository';
import { addDays, differenceInDays, eachDay, todayDate } from '@/domain/dateOnly';
import { useSaveFlowRange, useSettings } from '@/hooks/useCyklaData';
import { useI18n } from '@/i18n/I18nProvider';
import { useUiStore } from '@/store/uiStore';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

type Flow = SaveFlowRangeInput['flow'];
const flowOptions: Flow[] = ['spotting', 'light', 'medium', 'heavy'];
// How strongly the range preview fills each day, so the chosen flow is visible at a glance.
const flowOpacity: Record<Flow, number> = { spotting: 0.35, light: 0.55, medium: 0.8, heavy: 1 };

// Opened directly (web reload, link) the modal has no screen to go back to.
function closeQuickEntry() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/log');
}

export default function QuickPeriodScreen() {
  const theme = useCyklaTheme();
  const { t, formatDate } = useI18n();
  const today = todayDate();
  const selectedDate = useUiStore((state) => state.selectedDate);
  const periodLength = useSettings().data?.typicalPeriodLength ?? 5;
  const saveRange = useSaveFlowRange();
  const [startDate, setStartDate] = useState(() => (selectedDate < today ? selectedDate : today));
  const [endDate, setEndDate] = useState(() => {
    const end = addDays(startDate, periodLength - 1);
    return end < today ? end : today;
  });
  const [flow, setFlow] = useState<Flow>('medium');
  const days = eachDay(startDate, endDate);

  // Moving one end drags the other along so the range stays valid and within the limit.
  const moveStart = (step: number) => {
    const start = addDays(startDate, step);
    if (start > today) return;
    setStartDate(start);
    if (start > endDate) setEndDate(start);
    else if (differenceInDays(endDate, start) >= MAX_FLOW_RANGE_DAYS) {
      setEndDate(addDays(start, MAX_FLOW_RANGE_DAYS - 1));
    }
  };
  const moveEnd = (step: number) => {
    const end = addDays(endDate, step);
    if (end > today) return;
    setEndDate(end);
    if (end < startDate) setStartDate(end);
    else if (differenceInDays(end, startDate) >= MAX_FLOW_RANGE_DAYS) {
      setStartDate(addDays(end, -(MAX_FLOW_RANGE_DAYS - 1)));
    }
  };

  const save = async () => {
    try {
      await saveRange.mutateAsync({ startDate, endDate, flow });
    } catch {
      // Shown below via saveRange.error; the choices stay for another try.
      return;
    }
    closeQuickEntry();
  };

  const stepper = (label: string, date: string, move: (step: number) => void) => (
    <View style={styles.stepper}>
      <Typography variant="label" style={styles.stepperLabel}>
        {label}
      </Typography>
      <StepButton
        icon="chevron-back"
        label={t.quickEntry.earlier(label)}
        onPress={() => move(-1)}
      />
      <Typography style={styles.stepperDate} accessibilityLiveRegion="polite">
        {formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}
      </Typography>
      <StepButton
        icon="chevron-forward"
        label={t.quickEntry.later(label)}
        disabled={date >= today}
        onPress={() => move(1)}
      />
    </View>
  );

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.quickEntry.close}
          onPress={closeQuickEntry}
          style={[styles.close, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Typography variant="caption" muted>
            {t.quickEntry.eyebrow}
          </Typography>
          <Typography variant="heading">{t.quickEntry.title}</Typography>
        </View>
      </View>

      <Typography muted>{t.quickEntry.body}</Typography>

      <Card style={styles.section}>
        {stepper(t.quickEntry.from, startDate, moveStart)}
        {stepper(t.quickEntry.to, endDate, moveEnd)}
        <View
          style={styles.preview}
          accessible
          accessibilityLabel={t.quickEntry.rangeSummary(days.length)}
        >
          {days.map((date) => (
            <View
              key={date}
              style={[
                styles.previewDay,
                { backgroundColor: theme.colors.period, opacity: flowOpacity[flow] },
              ]}
            />
          ))}
        </View>
        <View>
          <Typography variant="label">{t.quickEntry.rangeSummary(days.length)}</Typography>
          <Typography variant="caption" muted>
            {t.quickEntry.limit(MAX_FLOW_RANGE_DAYS)}
          </Typography>
        </View>
      </Card>

      <Card style={styles.section}>
        <Typography variant="heading">{t.quickEntry.flow}</Typography>
        <View style={styles.chips}>
          {flowOptions.map((option) => (
            <ChoiceChip
              key={option}
              compact
              label={t.flowOption[option]}
              selected={flow === option}
              onPress={() => setFlow(option)}
            />
          ))}
        </View>
      </Card>

      {saveRange.isError ? (
        <Typography style={{ color: theme.colors.danger }}>{t.quickEntry.saveError}</Typography>
      ) : null}
      <Button
        label={t.quickEntry.save(days.length)}
        icon="checkmark"
        loading={saveRange.isPending}
        onPress={() => void save()}
      />
    </AppScreen>
  );
}

function StepButton({
  icon,
  label,
  disabled = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useCyklaTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepButton, { borderColor: theme.colors.border, opacity: disabled ? 0.4 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={theme.colors.text} />
    </Pressable>
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
  section: {
    gap: spacing.lg,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperLabel: {
    width: 40,
  },
  stepperDate: {
    flex: 1,
    textAlign: 'center',
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    gap: 3,
    height: 12,
  },
  previewDay: {
    flex: 1,
    maxWidth: 28,
    borderRadius: radii.pill,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
