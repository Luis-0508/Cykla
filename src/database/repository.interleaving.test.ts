import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestDatabase } from './testing/sqlite';
import { initializeDatabase } from './schema';
import * as repository from './repository';

const original: repository.SaveDailyEntryInput = {
  date: '2026-01-01',
  flow: 'medium',
  mood: 'calm',
  pain: 2,
  energy: 3,
  sleepHours: 7.5,
  sleepQuality: 4,
  notes: 'Synthetic original',
  symptoms: [{ code: 'cramps', intensity: 2 }],
};
const changed: repository.SaveDailyEntryInput = {
  ...original,
  flow: 'heavy',
  notes: 'Synthetic replacement',
  symptoms: [{ code: 'headache', intensity: 1 }],
};

function barrier() {
  const reached = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  return {
    reached: reached.promise,
    release: release.resolve,
    async pause() {
      reached.resolve();
      await release.promise;
    },
  };
}

describe('repository interleavings on real SQLite', () => {
  let test: ReturnType<typeof createTestDatabase>;
  beforeEach(async () => {
    test = createTestDatabase();
    await initializeDatabase(test.db);
    await repository.saveDailyEntry(test.db, original);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    test.close();
  });

  function pauseReplacement() {
    const gate = barrier();
    const run = test.db.runAsync.bind(test.db);
    vi.spyOn(test.db, 'runAsync').mockImplementation(async (...args) => {
      const result = await run(...args);
      if (args[0] === 'DELETE FROM symptom_entries WHERE date = ?') await gate.pause();
      return result;
    });
    return gate;
  }

  it('keeps a concurrent setting write when the entry replacement rolls back', async () => {
    const before = await repository.getEntry(test.db, original.date);
    await repository.setSetting(test.db, 'goal', 'conceive');
    await test.db.execAsync(
      "CREATE TRIGGER reject_symptom BEFORE INSERT ON symptom_entries BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END",
    );
    const gate = pauseReplacement();
    const failed = repository.saveDailyEntry(test.db, changed);
    const failedResult = expect(failed).rejects.toThrow('synthetic failure');
    await gate.reached;
    const setting = repository.setSetting(test.db, 'theme', 'dark');
    gate.release();
    await Promise.all([failedResult, setting]);
    expect(await repository.getSettings(test.db)).toMatchObject({
      theme: 'dark',
      goal: 'conceive',
    });
    expect(await repository.getEntry(test.db, original.date)).toEqual(before);
  });

  it.each([original.date, '2026-01-02'])(
    'commits two concurrent entry saves independently (%s)',
    async (secondDate) => {
      const gate = pauseReplacement();
      const first = repository.saveDailyEntry(test.db, changed);
      await gate.reached;
      const secondInput = { ...original, date: secondDate, notes: 'Synthetic second save' };
      const second = repository.saveDailyEntry(test.db, secondInput);
      const completed = Promise.all([first, second]);
      gate.release();
      await completed;
      expect(await repository.getEntry(test.db, secondDate)).toMatchObject(secondInput);
      if (secondDate !== original.date) {
        expect(await repository.getEntry(test.db, original.date)).toMatchObject(changed);
      }
    },
  );

  it('does not expose the gap between deleting and inserting symptoms to either reader', async () => {
    const gate = pauseReplacement();
    const write = repository.saveDailyEntry(test.db, changed);
    await gate.reached;
    const entry = repository.getEntry(test.db, original.date);
    const entries = repository.getAllEntries(test.db);
    // Let unprotected readers finish while the replacement is deliberately paused.
    await new Promise<void>((resolve) => setImmediate(resolve));
    gate.release();
    await write;
    expect(await entry).toMatchObject(changed);
    expect(await entries).toMatchObject([changed]);
  });

  it.each(['entry', 'entries'] as const)(
    'holds a consistent snapshot across both statements of %s',
    async (reader) => {
      const before = await repository.getEntry(test.db, original.date);
      const gate = barrier();
      if (reader === 'entry') {
        const read = test.db.getFirstAsync.bind(test.db);
        vi.spyOn(test.db, 'getFirstAsync').mockImplementationOnce(async (...args) => {
          const row = await read(...args);
          await gate.pause();
          return row;
        });
      } else {
        const read = test.db.getAllAsync.bind(test.db);
        vi.spyOn(test.db, 'getAllAsync').mockImplementationOnce(async (...args) => {
          const rows = await read(...args);
          await gate.pause();
          return rows;
        });
      }
      const read =
        reader === 'entry'
          ? repository.getEntry(test.db, original.date)
          : repository.getAllEntries(test.db);
      await gate.reached;
      const write = repository.saveDailyEntry(test.db, changed);
      await new Promise<void>((resolve) => setImmediate(resolve));
      gate.release();
      expect(await read).toEqual(reader === 'entry' ? before : [before]);
      await write;
      expect(await repository.getEntry(test.db, original.date)).toMatchObject(changed);
    },
  );

  it('does not block operations on another connection', async () => {
    const other = createTestDatabase();
    const gate = pauseReplacement();
    try {
      await initializeDatabase(other.db);
      const write = repository.saveDailyEntry(test.db, changed);
      await gate.reached;
      await repository.setSetting(other.db, 'theme', 'dark');
      expect(await repository.getSettings(other.db)).toMatchObject({ theme: 'dark' });
      gate.release();
      await write;
    } finally {
      gate.release();
      other.close();
    }
  });

  it.each(['entry', 'entries'] as const)(
    'keeps the %s snapshot when another WAL connection commits between SELECTs',
    async (reader) => {
      const directory = mkdtempSync(join(tmpdir(), 'cykla-snapshot-'));
      const path = join(directory, 'synthetic.db');
      const first = createTestDatabase(path);
      const second = createTestDatabase(path);
      const gate = barrier();
      try {
        await initializeDatabase(first.db);
        await initializeDatabase(second.db);
        await repository.saveDailyEntry(first.db, original);
        const before = await repository.getEntry(first.db, original.date);
        if (reader === 'entry') {
          const read = first.db.getFirstAsync.bind(first.db);
          vi.spyOn(first.db, 'getFirstAsync').mockImplementationOnce(async (...args) => {
            const row = await read(...args);
            await gate.pause();
            return row;
          });
        } else {
          const read = first.db.getAllAsync.bind(first.db);
          vi.spyOn(first.db, 'getAllAsync').mockImplementationOnce(async (...args) => {
            const rows = await read(...args);
            await gate.pause();
            return rows;
          });
        }
        const read =
          reader === 'entry'
            ? repository.getEntry(first.db, original.date)
            : repository.getAllEntries(first.db);
        await gate.reached;
        // This connection has its own queue and commits while the reader is paused.
        await repository.saveDailyEntry(second.db, changed);
        gate.release();
        expect(await read).toEqual(reader === 'entry' ? before : [before]);
        expect(await repository.getEntry(first.db, original.date)).toMatchObject(changed);
      } finally {
        gate.release();
        first.close();
        second.close();
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});
