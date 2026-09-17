import { describe, expect, it, vi } from 'vitest';
import { createLockController } from './lockLifecycle';
function fixture(enabled = true) {
  const dependencies = {
    readEnabled: vi.fn().mockResolvedValue(enabled),
    authenticate: vi.fn().mockResolvedValue(true),
    onChange: vi.fn(),
  };
  return { ...dependencies, controller: createLockController(dependencies) };
}
describe('app lock lifecycle', () => {
  it('locks immediately on inactive and background and requires authentication on return', async () => {
    const f = fixture();
    await f.controller.start();
    await f.controller.unlock();
    expect(f.onChange).toHaveBeenLastCalledWith(false);
    f.controller.change('inactive');
    expect(f.onChange).toHaveBeenLastCalledWith(true);
    f.controller.change('background');
    f.controller.change('active');
    await vi.waitFor(() => expect(f.readEnabled).toHaveBeenCalledTimes(2));
    expect(f.onChange).toHaveBeenLastCalledWith(true);
    await f.controller.unlock();
    expect(f.onChange).toHaveBeenLastCalledWith(false);
  });
  it('shields disabled-lock apps while inactive and restores them on return', async () => {
    const f = fixture(false);
    await f.controller.start();
    f.controller.change('inactive');
    expect(f.onChange).toHaveBeenLastCalledWith(true);
    f.controller.change('active');
    await vi.waitFor(() => expect(f.onChange).toHaveBeenLastCalledWith(false));
  });
  it('handles authentication-induced inactive without an unlock loop', async () => {
    const f = fixture();
    await f.controller.start();
    f.authenticate.mockImplementation(async () => {
      f.controller.change('inactive');
      return true;
    });
    await f.controller.unlock();
    expect(f.onChange).toHaveBeenLastCalledWith(true);
    f.controller.change('active');
    expect(f.onChange).toHaveBeenLastCalledWith(false);
  });
  it('rejects late authentication after a real background transition', async () => {
    const f = fixture();
    await f.controller.start();
    f.authenticate.mockImplementation(async () => {
      f.controller.change('background');
      return true;
    });
    await f.controller.unlock();
    f.controller.change('active');
    expect(f.onChange).toHaveBeenLastCalledWith(true);
  });
  it('fails closed on authentication and storage errors', async () => {
    const f = fixture();
    f.readEnabled.mockRejectedValue(new Error());
    await f.controller.start();
    expect(f.onChange).toHaveBeenLastCalledWith(true);
    f.authenticate.mockRejectedValue(new Error());
    await f.controller.unlock();
    expect(f.onChange).toHaveBeenLastCalledWith(true);
    f.authenticate.mockResolvedValue(false);
    await f.controller.unlock();
    expect(f.onChange).toHaveBeenLastCalledWith(true);
  });
  it('prevents duplicate prompts and ignores completion after disposal', async () => {
    const f = fixture();
    await f.controller.start();
    let finish!: (value: boolean) => void;
    f.authenticate.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = f.controller.unlock();
    await f.controller.unlock();
    expect(f.authenticate).toHaveBeenCalledOnce();
    f.controller.dispose();
    f.onChange.mockClear();
    finish(true);
    await pending;
    expect(f.onChange).not.toHaveBeenCalled();
  });
});
