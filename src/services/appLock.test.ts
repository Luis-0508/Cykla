import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticateApp, canUseAppLock, isAppLockEnabled, setAppLockEnabled } from './appLock';
import { en } from '@/i18n/locales/en';
const mocks = vi.hoisted(() => ({
  platform: { OS: 'ios' },
  get: vi.fn(),
  set: vi.fn(),
  hardware: vi.fn(),
  enrolled: vi.fn(),
  authenticate: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('expo-secure-store', () => ({ getItemAsync: mocks.get, setItemAsync: mocks.set }));
vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: mocks.hardware,
  isEnrolledAsync: mocks.enrolled,
  authenticateAsync: mocks.authenticate,
}));
describe('operating system lock boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.platform.OS = 'ios';
  });
  it('fails closed on secure storage errors', async () => {
    mocks.get.mockRejectedValue(new Error('device storage unavailable'));
    expect(await isAppLockEnabled()).toBe(true);
  });
  it('reads the enabled flag and stores no biometric material', async () => {
    mocks.get.mockResolvedValue('true');
    expect(await isAppLockEnabled()).toBe(true);
    mocks.get.mockResolvedValue(null);
    expect(await isAppLockEnabled()).toBe(false);
    await setAppLockEnabled(true);
    expect(mocks.set).toHaveBeenCalledWith('cykla.app-lock.enabled', 'true');
  });
  it('requires available enrolled hardware and uses OS authentication with device fallback', async () => {
    mocks.hardware.mockResolvedValue(true);
    mocks.enrolled.mockResolvedValue(false);
    expect(await canUseAppLock()).toBe(false);
    mocks.enrolled.mockResolvedValue(true);
    expect(await canUseAppLock()).toBe(true);
    mocks.authenticate.mockResolvedValue({ success: false });
    expect(await authenticateApp(en.lock)).toBe(false);
    mocks.authenticate.mockResolvedValue({ success: true });
    expect(await authenticateApp(en.lock)).toBe(true);
    expect(mocks.authenticate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        disableDeviceFallback: false,
        promptMessage: 'Unlock Cykla',
        cancelLabel: 'Cancel',
      }),
    );
  });
  it('does not access native authentication or secure storage on web', async () => {
    mocks.platform.OS = 'web';
    expect(await isAppLockEnabled()).toBe(false);
    expect(await canUseAppLock()).toBe(false);
    expect(await authenticateApp(en.lock)).toBe(true);
    await setAppLockEnabled(true);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });
});
