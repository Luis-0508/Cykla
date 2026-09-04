import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { BRAND } from '@/config/branding';
import { de } from '@/i18n/de';
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
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 78,
          paddingTop: 8,
          paddingBottom: 10,
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
      <Tabs.Screen name="index" options={{ title: de.nav.today }} />
      <Tabs.Screen name="calendar" options={{ title: de.nav.calendar }} />
      <Tabs.Screen name="log" options={{ title: de.nav.log }} />
      <Tabs.Screen name="insights" options={{ title: de.nav.insights }} />
      <Tabs.Screen
        name="settings"
        options={{
          title: de.nav.settings,
          tabBarAccessibilityLabel: `${BRAND.name} Einstellungen`,
        }}
      />
    </Tabs>
  );
}
