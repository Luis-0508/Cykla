import { Redirect } from 'expo-router';
import { LoadingState } from '@/components/ui/States';
import { useSettings } from '@/hooks/useCyklaData';

export default function EntryRoute() {
  const settings = useSettings();
  if (settings.isLoading) return <LoadingState label="Cykla wird vorbereitet …" />;
  return <Redirect href={settings.data?.onboardingCompleted ? '/(tabs)' : '/onboarding'} />;
}
