import { beforeEach, describe, expect, it, vi } from 'vitest';
import { de } from '@/i18n/locales/de';
import { en } from '@/i18n/locales/en';
import {
  disableDailyReminder,
  enableDailyReminder,
  refreshDailyReminderText,
} from './notifications';
const mocks = vi.hoisted(() => ({
  platform: { OS: 'ios' },
  permission: vi.fn(),
  scheduled: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('expo-notifications', () => ({
  requestPermissionsAsync: mocks.permission,
  getAllScheduledNotificationsAsync: mocks.scheduled,
  cancelScheduledNotificationAsync: mocks.cancel,
  scheduleNotificationAsync: mocks.schedule,
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));
describe('local reminder privacy', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.platform.OS = 'ios';
    mocks.scheduled.mockResolvedValue([]);
  });
  it('rejects denied permission without scheduling', async () => {
    mocks.permission.mockResolvedValue({ granted: false });
    await expect(enableDailyReminder(de.notifications)).rejects.toThrow(
      de.notifications.permissionDenied,
    );
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('replaces only Cykla reminders with neutral content', async () => {
    mocks.permission.mockResolvedValue({ granted: true });
    mocks.scheduled.mockResolvedValue([
      { identifier: 'ours', content: { data: { tag: 'cykla-daily-reminder' } } },
      { identifier: 'other', content: { data: {} } },
    ]);
    await enableDailyReminder(de.notifications);
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith('ours');
    expect(mocks.schedule).toHaveBeenCalledExactlyOnceWith({
      content: {
        title: 'Zeit für einen kurzen Check-in',
        body: 'Nimm dir einen Moment für deinen heutigen Eintrag.',
        data: { tag: 'cykla-daily-reminder' },
      },
      trigger: { type: 'daily', hour: 20, minute: 0 },
    });
  });
  it('avoids native APIs on web', async () => {
    mocks.platform.OS = 'web';
    await disableDailyReminder();
    await refreshDailyReminderText(en.notifications);
    await expect(enableDailyReminder(en.notifications)).rejects.toThrow(
      en.notifications.webUnavailable,
    );
    expect(mocks.permission).not.toHaveBeenCalled();
    expect(mocks.scheduled).not.toHaveBeenCalled();
  });
});
describe('reminder language refresh', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.platform.OS = 'ios';
  });
  const reminder = (title: string, body: string) => ({
    identifier: 'ours',
    content: { title, body, data: { tag: 'cykla-daily-reminder' } },
  });
  it('reschedules an active reminder in the new language without asking for permission', async () => {
    mocks.scheduled.mockResolvedValue([reminder(de.notifications.title, de.notifications.body)]);
    await refreshDailyReminderText(en.notifications);
    expect(mocks.permission).not.toHaveBeenCalled();
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith('ours');
    expect(mocks.schedule).toHaveBeenCalledExactlyOnceWith({
      content: {
        title: 'Time for a quick check-in',
        body: 'Take a moment for today’s entry.',
        data: { tag: 'cykla-daily-reminder' },
      },
      trigger: { type: 'daily', hour: 20, minute: 0 },
    });
  });
  it('leaves reminders alone when the wording already matches', async () => {
    mocks.scheduled.mockResolvedValue([reminder(en.notifications.title, en.notifications.body)]);
    await refreshDailyReminderText(en.notifications);
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('never creates a reminder the user has not enabled', async () => {
    mocks.scheduled.mockResolvedValue([{ identifier: 'other', content: { data: {} } }]);
    await refreshDailyReminderText(en.notifications);
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
});
