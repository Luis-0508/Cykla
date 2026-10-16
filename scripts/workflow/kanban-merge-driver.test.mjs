import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { mergeBoards } from './kanban-merge-driver.mjs'

const DRIVER = resolve(import.meta.dirname, 'kanban-merge-driver.mjs')

const ticket = (n, extra = {}) => ({ id: `K-${n}`, title: `Ticket ${n}`, status: 'ready', column: { id: 'todo' }, ...extra })
const board = (tickets, extra = {}) => ({
  schema: 2,
  version: 1,
  next_ticket_seq: Math.max(1, ...tickets.map((t) => Number(t.id.slice(2)) + 1)),
  next_epic_seq: 1,
  columns: [{ id: 'todo', title: 'To do' }, { id: 'doing', title: 'Doing' }, { id: 'review', title: 'Review' }, { id: 'done', title: 'Done' }],
  epics: [],
  tickets,
  ...extra,
})
const note = (at, text) => ({ at, author: 'claude', text })
const ids = (b) => b.tickets.map((t) => t.id)

test('tickets added on both sides with the same new ID are both kept', () => {
  const base = board([ticket(1)])
  const ours = board([ticket(1), ticket(2, { title: 'Ours' })], { version: 2 })
  const theirs = board([ticket(1), ticket(2, { title: 'Theirs', depends_on: ['K-1'] })], { version: 3 })
  const { board: merged, conflicts } = mergeBoards(base, ours, theirs)
  assert.deepEqual(ids(merged), ['K-1', 'K-2', 'K-3'])
  assert.equal(merged.tickets[1].title, 'Ours')
  assert.equal(merged.tickets[2].title, 'Theirs')
  assert.equal(merged.next_ticket_seq, 4)
  assert.equal(merged.version, 4)
  assert.match(conflicts.join('\n'), /K-2: created independently.*now K-3/)
})

test('distinct new tickets merge cleanly in priority order', () => {
  const base = board([ticket(1), ticket(2)])
  const ours = board([ticket(2), ticket(1), ticket(3)])
  const theirs = board([ticket(1), ticket(2), ticket(4)])
  const { board: merged, conflicts } = mergeBoards(base, ours, theirs)
  assert.deepEqual(ids(merged), ['K-2', 'K-1', 'K-3', 'K-4'])
  assert.deepEqual(conflicts, [])
})

test('notes from both sides are unioned chronologically', () => {
  const n0 = note('2026-01-01T00:00:00Z', 'start')
  const base = board([ticket(1, { notes: [n0] })])
  const ours = board([ticket(1, { notes: [n0, note('2026-01-03T00:00:00Z', 'ours')] })])
  const theirs = board([ticket(1, { notes: [n0, note('2026-01-02T00:00:00Z', 'theirs')] })])
  const { board: merged, conflicts } = mergeBoards(base, ours, theirs)
  assert.deepEqual(merged.tickets[0].notes.map((n) => n.text), ['start', 'theirs', 'ours'])
  assert.deepEqual(conflicts, [])
})

test('changes to different fields of one ticket both survive', () => {
  const base = board([ticket(1)])
  const ours = board([ticket(1, { column: { id: 'doing', owner: 'claude' } })])
  const theirs = board([ticket(1, { body: 'Refined spec', labels: ['ui'] })])
  const { board: merged, conflicts } = mergeBoards(base, ours, theirs)
  assert.deepEqual(merged.tickets[0].column, { id: 'doing', owner: 'claude' })
  assert.equal(merged.tickets[0].body, 'Refined spec')
  assert.deepEqual(merged.tickets[0].labels, ['ui'])
  assert.deepEqual(conflicts, [])
})

test('a landed ticket moves to done when the other side did not touch its column', () => {
  const base = board([ticket(1, { column: { id: 'review', branch: 'feat/x' } })])
  const ours = board([ticket(1, { column: { id: 'review', branch: 'feat/x' }, notes: [note('2026-01-02T00:00:00Z', 'pr')] })])
  const theirs = board([ticket(1, { column: { id: 'done' } })])
  const { board: merged, conflicts } = mergeBoards(base, ours, theirs)
  assert.deepEqual(merged.tickets[0].column, { id: 'done' })
  assert.equal(merged.tickets[0].notes.length, 1)
  assert.deepEqual(conflicts, [])
})

test('the same field changed differently is reported, ours kept, theirs named', () => {
  const base = board([ticket(1)])
  const ours = board([ticket(1, { title: 'Ours' })])
  const theirs = board([ticket(1, { title: 'Theirs' })])
  const { board: merged, conflicts } = mergeBoards(base, ours, theirs)
  assert.equal(merged.tickets[0].title, 'Ours')
  assert.match(conflicts[0], /K-1: both sides changed "title".*Theirs/)
})

test('labels and dependencies merge as sets', () => {
  const base = board([ticket(1), ticket(2), ticket(3), ticket(4, { labels: ['a', 'b'], depends_on: ['K-1', 'K-2'] })])
  const ours = board([ticket(1), ticket(2), ticket(3), ticket(4, { labels: ['b', 'c'], depends_on: ['K-1', 'K-2', 'K-3'] })])
  const theirs = board([ticket(1), ticket(2), ticket(3), ticket(4, { labels: ['a', 'b', 'd'], depends_on: ['K-1'] })])
  const { board: merged, conflicts } = mergeBoards(base, ours, theirs)
  assert.deepEqual(merged.tickets[3].labels, ['b', 'c', 'd'])
  assert.deepEqual(merged.tickets[3].depends_on, ['K-1', 'K-3'])
  assert.deepEqual(conflicts, [])
})

test('removal wins only over an untouched ticket', () => {
  const base = board([ticket(1), ticket(2)])
  const ours = board([ticket(2, { body: 'changed' })])
  const theirs = board([ticket(1)])
  const { board: merged, conflicts } = mergeBoards(base, ours, theirs)
  assert.deepEqual(ids(merged), ['K-2'])
  assert.match(conflicts.join('\n'), /K-2: removed on their side but changed on ours/)
})

test('renumbered epics are followed by their side tickets', () => {
  const epic = (n, title) => ({ id: `EP-${n}`, title, status: 'ready' })
  const base = board([], { epics: [] })
  const ours = board([ticket(1, { epic: 'EP-1' })], { epics: [epic(1, 'Ours')], next_epic_seq: 2 })
  const theirs = board([ticket(2, { epic: 'EP-1' })], { epics: [epic(1, 'Theirs')], next_epic_seq: 2 })
  const { board: merged } = mergeBoards(base, ours, theirs)
  assert.deepEqual(merged.epics.map((e) => `${e.id}:${e.title}`), ['EP-1:Ours', 'EP-2:Theirs'])
  assert.equal(merged.tickets.find((t) => t.id === 'K-2').epic, 'EP-2')
  assert.equal(merged.next_epic_seq, 3)
})

// Two branches that each add a note to K-1 and a new ticket: a line-based
// merge of the pretty-printed JSON conflicts, an ID-based merge does not.
function parallelBranches(withDriver) {
  const dir = mkdtempSync(join(tmpdir(), 'kanban-merge-'))
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const write = (b) => writeFileSync(join(dir, '.kanban', 'board.json'), `${JSON.stringify(b, null, 2)}\n`)
  const read = () => JSON.parse(readFileSync(join(dir, '.kanban', 'board.json'), 'utf8'))
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 'test@example.com')
  git('config', 'user.name', 'Test')
  git('config', 'core.autocrlf', 'false')
  if (withDriver) git('config', 'merge.kanban-board.driver', `node "${DRIVER.replaceAll('\\', '/')}" %O %A %B`)
  writeFileSync(join(dir, '.gitattributes'), '.kanban/board.json merge=kanban-board\n')
  mkdirSync(join(dir, '.kanban'))
  const n0 = note('2026-01-01T00:00:00Z', 'created')
  write(board([ticket(1, { notes: [n0] }), ticket(2)]))
  git('add', '.')
  git('commit', '-qm', 'base')

  git('switch', '-qc', 'feature-a')
  write(board([ticket(1, { notes: [n0, note('2026-01-02T00:00:00Z', 'a')], column: { id: 'doing', owner: 'claude' } }), ticket(2), ticket(3, { title: 'A' })], { version: 2 }))
  git('commit', '-qam', 'a')

  git('switch', '-q', 'main')
  git('switch', '-qc', 'feature-b')
  write(board([ticket(1, { notes: [n0, note('2026-01-03T00:00:00Z', 'b')] }), ticket(2, { body: 'b spec' }), ticket(4, { title: 'B' })], { version: 2 }))
  git('commit', '-qam', 'b')

  git('switch', '-q', 'main')
  git('merge', '-q', 'feature-a')
  return { dir, git, write, read, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

test('without the driver configured, git falls back to a conflicting text merge', () => {
  const repo = parallelBranches(false)
  try {
    assert.throws(() => repo.git('merge', '-q', '--no-edit', 'feature-b'))
    assert.match(repo.git('status', '--porcelain'), /^UU \.kanban\/board\.json/m)
  } finally {
    repo.cleanup()
  }
})

test('git uses the driver for merges and rebases of parallel branches', () => {
  const { git, write, read, cleanup } = parallelBranches(true)
  try {
    git('merge', '-q', '--no-edit', 'feature-b')
    const merged = read()
    assert.deepEqual(ids(merged), ['K-1', 'K-2', 'K-3', 'K-4'])
    assert.deepEqual(merged.tickets[0].notes.map((n) => n.text), ['created', 'a', 'b'])
    assert.equal(merged.tickets[0].column.id, 'doing')
    assert.equal(merged.tickets[1].body, 'b spec')

    // A rebase replays commits through the same driver.
    git('switch', '-qc', 'feature-c', 'feature-b')
    write({ ...read(), tickets: [...read().tickets, ticket(5, { title: 'C' })] })
    git('commit', '-qam', 'c')
    git('rebase', '-q', 'main')
    assert.deepEqual(ids(read()), ['K-1', 'K-2', 'K-3', 'K-4', 'K-5'])
  } finally {
    cleanup()
  }
})
