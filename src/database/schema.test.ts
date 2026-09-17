import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './testing/sqlite';
import { initializeDatabase, migrations } from './schema';

describe('database migrations', () => {
  let test: ReturnType<typeof createTestDatabase>;
  beforeEach(() => {
    test = createTestDatabase();
  });
  afterEach(() => test.close());
  const version = () => test.db.getFirstAsync('PRAGMA user_version');
  it('initializes and reopens without removing data; enables foreign keys on reopen', async () => {
    await initializeDatabase(test.db);
    await test.db.runAsync("INSERT INTO app_settings VALUES ('goal', 'track')");
    await test.db.execAsync('PRAGMA foreign_keys = OFF');
    await initializeDatabase(test.db);
    expect(await version()).toEqual({ user_version: 1 });
    expect(await test.db.getFirstAsync('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
    expect(await test.db.getAllAsync('SELECT * FROM app_settings')).toEqual([
      { key: 'goal', value: 'track' },
    ]);
  });
  it('upgrades original v1 in order without rerunning it', async () => {
    await migrations[0]!.up(test.db);
    await test.db.execAsync(
      "PRAGMA user_version = 1; INSERT INTO app_settings VALUES ('goal', 'conceive')",
    );
    await initializeDatabase(test.db, [
      {
        version: 1,
        up: async () => {
          throw new Error('must not rerun');
        },
      },
      {
        version: 2,
        up: async (db) => {
          await db.execAsync('CREATE TABLE second (value TEXT)');
        },
      },
      {
        version: 3,
        up: async (db) => {
          await db.runAsync("INSERT INTO second VALUES ('upgraded')");
        },
      },
    ]);
    expect(await version()).toEqual({ user_version: 3 });
    expect(await test.db.getFirstAsync('SELECT value FROM app_settings')).toEqual({
      value: 'conceive',
    });
    expect(await test.db.getFirstAsync('SELECT value FROM second')).toEqual({ value: 'upgraded' });
  });
  it('rolls back both schema and data on failure and can retry', async () => {
    await initializeDatabase(test.db);
    const failing = {
      version: 2,
      up: async (db: typeof test.db) => {
        await db.execAsync(
          "CREATE TABLE partial (value TEXT); INSERT INTO app_settings VALUES ('goal', 'track');",
        );
        throw new Error('interrupted');
      },
    };
    await expect(initializeDatabase(test.db, [...migrations, failing])).rejects.toThrow(
      'interrupted',
    );
    expect(await version()).toEqual({ user_version: 1 });
    expect(await test.db.getAllAsync('SELECT * FROM app_settings')).toEqual([]);
    expect(
      await test.db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'partial'"),
    ).toBeNull();
    await initializeDatabase(test.db, [
      ...migrations,
      {
        version: 2,
        up: async (db) => {
          await db.execAsync('CREATE TABLE partial (value TEXT)');
        },
      },
    ]);
    expect(await version()).toEqual({ user_version: 2 });
  });
  it('rejects duplicates, gaps, and unsupported future versions without downgrading', async () => {
    await expect(initializeDatabase(test.db, [...migrations, migrations[0]!])).rejects.toThrow(
      'consecutive',
    );
    await expect(initializeDatabase(test.db, [{ version: 2, up: async () => {} }])).rejects.toThrow(
      'consecutive',
    );
    await test.db.execAsync('PRAGMA user_version = 99');
    await expect(initializeDatabase(test.db)).rejects.toThrow('newer app');
    expect(await version()).toEqual({ user_version: 99 });
  });
});
