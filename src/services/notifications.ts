import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_TAG = 'cykla-daily-reminder';

export async function enableDailyReminder(hour = 20, minute = 0): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Lokale Erinnerungen werden in der Web-Vorschau nicht unterstützt.');
  }
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Benachrichtigungen wurden nicht erlaubt.');
  }
  await disableDailyReminder();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Zeit für einen kurzen Check-in',
      body: 'Nimm dir einen Moment für deinen heutigen Eintrag.',
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
