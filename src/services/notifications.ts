import { de } from '@/i18n/de';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_TAG = 'cykla-daily-reminder';

export async function enableDailyReminder(hour = 20, minute = 0): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error(de.notifications.webUnavailable);
  }
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error(de.notifications.permissionDenied);
  }
  await disableDailyReminder();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: de.notifications.title,
      body: de.notifications.body,
      data: { tag: REMINDER_TAG },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function disableDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.tag === REMINDER_TAG)
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );
}
