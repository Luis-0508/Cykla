import type { Messages } from '@/i18n/i18n';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_TAG = 'cykla-daily-reminder';
const REMINDER_HOUR = 20;
const REMINDER_MINUTE = 0;

type ReminderText = Messages['notifications'];

async function scheduleReminder(text: ReminderText, hour: number, minute: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: text.title,
      body: text.body,
      data: { tag: REMINDER_TAG },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function enableDailyReminder(
  text: ReminderText,
  hour = REMINDER_HOUR,
  minute = REMINDER_MINUTE,
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error(text.webUnavailable);
  }
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error(text.permissionDenied);
  }
  await disableDailyReminder();
  await scheduleReminder(text, hour, minute);
}

/**
 * Notification text is fixed when scheduled. After a language change, replace an
 * existing Cykla reminder so it uses the new wording. Never schedules a reminder
 * that is not already active and never asks for permission.
 */
export async function refreshDailyReminderText(text: ReminderText): Promise<void> {
  if (Platform.OS === 'web') return;
  const reminders = (await Notifications.getAllScheduledNotificationsAsync()).filter(
    (notification) => notification.content.data?.tag === REMINDER_TAG,
  );
  if (
    reminders.length === 0 ||
    reminders.every(
      (notification) =>
        notification.content.title === text.title && notification.content.body === text.body,
    )
  ) {
    return;
  }
  await disableDailyReminder();
  await scheduleReminder(text, REMINDER_HOUR, REMINDER_MINUTE);
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
