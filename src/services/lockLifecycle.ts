// Platform-independent lock lifecycle. An inactive authentication prompt may
// succeed before active arrives; a real background transition invalidates it.
export function createLockController(
  dependencies: {
    readEnabled: () => Promise<boolean>;
    authenticate: () => Promise<boolean>;
    onChange: (hidden: boolean) => void;
  },
  initialState = 'active',
) {
  let state = initialState;
  let locked = true;
  let disposed = false;
  let generation = 0;
  let authenticating = false;
  const emit = () => {
    if (!disposed) dependencies.onChange(locked || state !== 'active');
  };
  const refresh = async () => {
    const request = ++generation;
    try {
      const enabled = await dependencies.readEnabled();
      if (!disposed && request === generation) {
        locked = enabled;
        emit();
      }
    } catch {
      if (!disposed && request === generation) {
        locked = true;
        emit();
      }
    }
  };
  return {
    start: refresh,
    change(next: string) {
      state = next;
      if (next !== 'active') {
        locked = true;
        if (next === 'background') generation += 1;
        emit();
      } else {
        emit();
        // Do not race a system authentication prompt with a settings read.
        if (locked && !authenticating) void refresh();
      }
    },
    async unlock() {
      if (authenticating || state !== 'active' || disposed) return;
      authenticating = true;
      const request = ++generation;
      try {
        const success = await dependencies.authenticate();
        if (!disposed && request === generation && success) locked = false;
      } catch {
        /* Authentication errors leave the gate closed. */
      } finally {
        authenticating = false;
        emit();
      }
    },
    dispose() {
      disposed = true;
      generation += 1;
    },
  };
}
