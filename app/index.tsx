import { Redirect } from 'expo-router';
import { LoadingState } from '@/components/ui/States';
import { useSettings } from '@/hooks/useCyklaData';
import { useI18n } from '@/i18n/I18nProvider';

export default function EntryRoute() {
  const settings = useSettings();
  const { t } = useI18n();
  if (settings.isLoading) return <LoadingState label={t.states.preparing} />;
  return <Redirect href={settings.data?.onboardingCompleted ? '/(tabs)' : '/onboarding'} />;
}
