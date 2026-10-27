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
  const result = spawnSync(process.execPath, [HOOK], { input: stdin, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: cwd, SESSION_CONTEXT_OFFLINE: '1' } })
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
})

test('injects the project state and the staleness hint', () => {
  const { dir, git, write } = repo()
  write('docs/PROJECT_STATE.md', STATE)
  git('add', '.')
  git('commit', '-qm', 'state')
  write('src/a.txt', 'a')
  git('add', '.')
  git('commit', '-qm', 'feat: later work')
  const { stdout, status, ms } = runHook(dir)
  assert.equal(status, 0)
  assert.match(stdout, /Branch: main/)
  assert.match(stdout, /## Active work/)
  assert.match(stdout, /1 commit\(s\) since/)
  assert.ok(ms < 5000, `hook took ${ms} ms`)
})

test('skips the GitHub section when offline', () => {
  const { dir, git, write } = repo()
  write('docs/PROJECT_STATE.md', STATE)
  git('add', '.')
  git('commit', '-qm', 'init')
  const { stdout } = runHook(dir)
  assert.doesNotMatch(stdout, /Open pull requests|Issues assigned to you/)
})

test('keeps the first character of uncommitted paths', () => {
  const { dir, git, write } = repo()
  write('.github/file.md', 'one')
  git('add', '.')
  git('commit', '-qm', 'init')
  write('.github/file.md', 'two')
  assert.match(runHook(dir).stdout, /Uncommitted: 1 file\(s\): \.github\/file\.md/)
})

test('truncates an oversized state file', () => {
  const { dir, write } = repo()
  write('docs/PROJECT_STATE.md', `${STATE}${'x'.repeat(7000)}`)
  assert.match(runHook(dir).stdout, /truncated; the file exceeds 6000 characters/)
})

test('never fails: outside git or with bad input', () => {
  const plain = mkdtempSync(join(tmpdir(), 'session-context-plain-'))
  dirs.push(plain)
  const outside = runHook(plain, 'not json')
  assert.equal(outside.status, 0)
  assert.match(outside.stdout, /Not a git repository/)
})
