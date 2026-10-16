import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, test } from 'node:test'

const HOOK = resolve(import.meta.dirname, '..', '..', '.claude', 'hooks', 'session-context.mjs')
const dirs = []
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'session-context-'))
  dirs.push(dir)
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 'test@example.com')
  git('config', 'user.name', 'Test')
  git('config', 'core.autocrlf', 'false')
  const write = (path, text) => {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  return { dir, git, write }
}

function runHook(cwd, stdin = JSON.stringify({ cwd, hook_event_name: 'SessionStart', source: 'startup' })) {
  const started = Date.now()
  const result = spawnSync(process.execPath, [HOOK], { input: stdin, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: cwd } })
  return { ...result, ms: Date.now() - started }
}

const STATE = '# Project state\n\n- Last updated: 2026-01-01\n\n## Active work\n\n- None\n'

test('reports an uninitialized template', () => {
  const { dir, git, write } = repo()
  write('docs/PROJECT_STATE.md', '<!-- TEMPLATE: NOT INITIALIZED -->\n# Project state\n')
  git('add', '.')
  git('commit', '-qm', 'init')
  const { stdout, status } = runHook(dir)
  assert.equal(status, 0)
  assert.match(stdout, /Project memory is NOT INITIALIZED/)
  assert.match(stdout, /No Kanban board yet; the init-project skill creates it/)
})

test('reports a missing board as a gap in an initialized project', () => {
  const { dir, git, write } = repo()
  write('docs/PROJECT_STATE.md', STATE)
  git('add', '.')
  git('commit', '-qm', 'init')
  const { stdout, status } = runHook(dir)
  assert.equal(status, 0)
  assert.match(stdout, /Kanban board missing \(\.kanban\/board\.json\): it is part of the default workflow/)
})

test('injects the project state, the board and the staleness hint', () => {
  const { dir, git, write } = repo()
  write('docs/PROJECT_STATE.md', STATE)
  git('add', '.')
  git('commit', '-qm', 'state')
  write('src/a.txt', 'a')
  git('add', '.')
  git('commit', '-qm', 'feat: later work')
  write('.kanban/board.json', JSON.stringify({
    tickets: [
      { id: 'K-1', title: 'Doing one', status: 'ready', column: { id: 'doing', owner: 'claude' } },
      { id: 'K-2', title: 'Blocked one', status: 'ready', depends_on: ['K-1'], column: { id: 'todo' } },
      { id: 'K-3', title: 'Done one', status: 'ready', column: { id: 'done' } },
    ],
  }))
  const { stdout, status, ms } = runHook(dir)
  assert.equal(status, 0)
  assert.match(stdout, /Branch: main/)
  assert.match(stdout, /K-1 \(ready\) @claude: Doing one/)
  assert.match(stdout, /K-2 \(ready\) \[blocked\]: Blocked one/)
  assert.doesNotMatch(stdout, /Done one/)
  assert.match(stdout, /## Active work/)
  assert.match(stdout, /1 commit\(s\) since/)
  assert.match(stdout, /Board merge driver is not configured/)
  assert.ok(ms < 5000, `hook took ${ms} ms`)
})

test('stays quiet about the merge driver once it is configured', () => {
  const { dir, git, write } = repo()
  write('.kanban/board.json', '{"tickets":[]}')
  git('config', 'merge.kanban-board.driver', 'node driver.mjs %O %A %B')
  assert.doesNotMatch(runHook(dir).stdout, /merge driver/)
})

test('keeps the first character of uncommitted paths', () => {
  const { dir, git, write } = repo()
  write('.github/file.md', 'one')
  git('add', '.')
  git('commit', '-qm', 'init')
  write('.github/file.md', 'two')
  assert.match(runHook(dir).stdout, /Uncommitted: 1 file\(s\): \.github\/file\.md/)
})

test('reads the board from the main working tree inside a linked worktree', () => {
  const { dir, git, write } = repo()
  write('docs/PROJECT_STATE.md', STATE)
  git('add', '.')
  git('commit', '-qm', 'init')
  write('.kanban/board.json', JSON.stringify({ tickets: [{ id: 'K-7', title: 'Main board', status: 'ready', column: { id: 'review' } }] }))
  const worktree = `${dir}-wt`
  dirs.push(worktree)
  git('worktree', 'add', '-q', '-b', 'feature', worktree)
  const { stdout } = runHook(worktree)
  assert.match(stdout, /Branch: feature/)
  assert.match(stdout, /K-7 \(ready\): Main board/)
})

test('truncates an oversized state file', () => {
  const { dir, write } = repo()
  write('docs/PROJECT_STATE.md', `${STATE}${'x'.repeat(7000)}`)
  assert.match(runHook(dir).stdout, /truncated; the file exceeds 6000 characters/)
})

test('never fails: outside git, with bad input or an unreadable board', () => {
  const plain = mkdtempSync(join(tmpdir(), 'session-context-plain-'))
  dirs.push(plain)
  const outside = runHook(plain, 'not json')
  assert.equal(outside.status, 0)
  assert.match(outside.stdout, /Not a git repository/)

  const { dir, write } = repo()
  write('.kanban/board.json', '{ broken')
  const broken = runHook(dir, '')
  assert.equal(broken.status, 0)
  assert.match(broken.stdout, /could not be read/)
})
