import { beforeEach, describe, expect, it, vi } from 'vitest';
import { disableDailyReminder, enableDailyReminder } from './notifications';
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
    await expect(enableDailyReminder()).rejects.toThrow();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('replaces only Cykla reminders with neutral content', async () => {
    mocks.permission.mockResolvedValue({ granted: true });
    mocks.scheduled.mockResolvedValue([
      { identifier: 'ours', content: { data: { tag: 'cykla-daily-reminder' } } },
      { identifier: 'other', content: { data: {} } },
    ]);
    await enableDailyReminder();
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
    await expect(enableDailyReminder()).rejects.toThrow();
    expect(mocks.permission).not.toHaveBeenCalled();
    expect(mocks.scheduled).not.toHaveBeenCalled();
  });
});
