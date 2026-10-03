import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '@/config/branding';
import { useI18n } from '@/i18n/I18nProvider';
import { useCyklaTheme } from '@/theme/theme';

const icons = {
  index: ['today-outline', 'today'],
  calendar: ['calendar-outline', 'calendar'],
  log: ['add-circle-outline', 'add-circle'],
  insights: ['analytics-outline', 'analytics'],
  settings: ['person-outline', 'person'],
} as const;

export default function TabLayout() {
  const theme = useCyklaTheme();
  const { t } = useI18n();
  // A fixed height would place the labels inside the home indicator area.
  const bottomPadding = Math.max(10, useSafeAreaInsets().bottom);
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 68 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarIcon: ({ focused, color, size }) => {
          const routeIcons = icons[route.name as keyof typeof icons] ?? icons.index;
          return (
            <Ionicons
              name={routeIcons[focused ? 1 : 0]}
              color={color}
              size={route.name === 'log' ? size + 6 : size}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: t.nav.today }} />
      <Tabs.Screen name="calendar" options={{ title: t.nav.calendar }} />
      <Tabs.Screen name="log" options={{ title: t.nav.log }} />
      <Tabs.Screen name="insights" options={{ title: t.nav.insights }} />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.nav.settings,
          tabBarAccessibilityLabel: t.nav.settingsLabel(BRAND.name),
        }}
      />
    </Tabs>
  );
}
