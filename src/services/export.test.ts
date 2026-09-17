import { cleanupTemporaryExports, exportCsv } from './export';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  platform: { OS: 'ios' },
  write: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
  available: vi.fn(),
  share: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: mocks.write,
  makeDirectoryAsync: mocks.mkdir,
  deleteAsync: mocks.remove,
}));
vi.mock('expo-sharing', () => ({ isAvailableAsync: mocks.available, shareAsync: mocks.share }));

describe('temporary export lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.platform.OS = 'ios';
    mocks.available.mockResolvedValue(true);
  });
  it('waits for sharing before removing the cache folder', async () => {
    let finish!: () => void;
    mocks.share.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = exportCsv([]);
    await vi.waitFor(() => expect(mocks.share).toHaveBeenCalled());
    expect(mocks.write.mock.calls[0]![0]).toMatch(
      /^cache\/cykla-exports\/.+\/cykla-export-.+\.csv$/,
    );
    expect(mocks.remove).not.toHaveBeenCalled();
    finish();
    await pending;
    expect(mocks.remove).toHaveBeenCalledWith(
      expect.stringMatching(/^cache\/cykla-exports\/.+\/$/),
      { idempotent: true },
    );
  });
  it.each(['write', 'share'] as const)(
    'removes partial exports after %s failure',
    async (method) => {
      mocks[method].mockRejectedValue(new Error('synthetic failure'));
      await expect(exportCsv([])).rejects.toThrow('synthetic failure');
      expect(mocks.remove).toHaveBeenCalledOnce();
    },
  );
  it('does not write if sharing is unavailable', async () => {
    mocks.available.mockResolvedValue(false);
    await expect(exportCsv([])).rejects.toThrow('unavailable');
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it('reports a cleanup failure instead of claiming success', async () => {
    mocks.remove.mockRejectedValue(new Error('cleanup failed'));
    await expect(exportCsv([])).rejects.toThrow('cleanup failed');
  });
  it('cleans stale temporary exports on startup', async () => {
    await cleanupTemporaryExports();
    expect(mocks.remove).toHaveBeenCalledWith('cache/cykla-exports/', { idempotent: true });
  });
  it('keeps web downloads independent of mobile sharing', async () => {
    mocks.platform.OS = 'web';
    const click = vi.fn();
    vi.stubGlobal('document', { createElement: () => ({ click }) });
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    try {
      await exportCsv([]);
      await cleanupTemporaryExports();
      expect(click).toHaveBeenCalledOnce();
      expect(revoke).toHaveBeenCalledOnce();
      expect(mocks.write).not.toHaveBeenCalled();
      expect(mocks.share).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      revoke.mockRestore();
    }
  });
});
