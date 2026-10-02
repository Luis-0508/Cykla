// Exports the real Cykla web build into video/.app (gitignored).
// A static production build has no dev overlay or hot reload, so captures are
// cleaner and repeatable. The app source is not modified.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = path.join(root, 'video', '.app');
const expoCli = path.join(root, 'node_modules', 'expo', 'bin', 'cli');

const result = spawnSync(
  process.execPath,
  [expoCli, 'export', '--platform', 'web', '--output-dir', out, '--clear'],
  { cwd: root, stdio: 'inherit', env: { ...process.env, EXPO_NO_TELEMETRY: '1' } },
);
process.exit(result.status ?? 1);
