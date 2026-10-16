// SessionStart hook: prints live git, board and project-state context so a new,
// resumed or compacted Claude Code session can continue without re-reading
// files. Local reads only, no network, no dependencies; it never fails the
// session and stays silent about anything it cannot read.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const STATE_FILE = 'docs/PROJECT_STATE.md'
const NOT_INITIALIZED = 'TEMPLATE: NOT INITIALIZED'
const MAX_STATE_CHARS = 6000

// Prefer the session's current directory (it may be a worktree).
let cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd()
try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
  if (input.cwd) cwd = input.cwd
} catch {
  // No or invalid hook input; keep the fallback directory.
}

const git = (...args) => {
  try {
    // trimEnd only: porcelain status lines start with a significant space.
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trimEnd()
  } catch {
    return ''
  }
}

const lines = ['## Live project context (SessionStart hook)', '']
const root = git('rev-parse', '--show-toplevel') || cwd

if (git('rev-parse', '--is-inside-work-tree') !== 'true') {
  lines.push('Not a git repository.')
} else {
  const branch = git('branch', '--show-current') || '(detached)'
  const base = git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD')
  const counts = base ? git('rev-list', '--left-right', '--count', `${base}...HEAD`).split(/\s+/) : []
  const sync = counts.length === 2 ? `, ${counts[1]} ahead / ${counts[0]} behind ${base} (as of last fetch)` : ''
  lines.push(`Branch: ${branch}${sync}`)

  const dirty = git('status', '--porcelain').split('\n').filter(Boolean)
  lines.push(dirty.length
    ? `Uncommitted: ${dirty.length} file(s): ${dirty.slice(0, 8).map((l) => l.slice(3)).join(', ')}${dirty.length > 8 ? ', …' : ''}`
    : 'Working tree clean')

  const recent = git('log', '-5', '--format=%h %ad %s', '--date=short')
  if (recent) lines.push('', 'Recent commits:', ...recent.split('\n').map((l) => `  ${l}`))
}

// The board lives in the main working tree, even when this session runs in a worktree.
const commonDir = git('rev-parse', '--path-format=absolute', '--git-common-dir')
const boardPath = join(commonDir ? dirname(resolve(commonDir)) : root, '.kanban', 'board.json')
if (existsSync(boardPath)) {
  try {
    const board = JSON.parse(readFileSync(boardPath, 'utf8'))
    const tickets = board.tickets ?? []
    const done = new Set(tickets.filter((t) => t.column?.id === 'done').map((t) => t.id))
    const show = (t) => {
      const blocked = (t.depends_on ?? []).some((d) => !done.has(d)) ? ' [blocked]' : ''
      const owner = t.column?.owner ? ` @${t.column.owner}` : ''
      return `  ${t.id} (${t.status})${owner}${blocked}: ${t.title}`
    }
    lines.push('', 'Kanban board:')
    for (const column of ['doing', 'review', 'todo']) {
      const inColumn = tickets.filter((t) => t.column?.id === column)
      const shown = column === 'todo' ? inColumn.slice(0, 3) : inColumn
      lines.push(`${column}: ${inColumn.length ? '' : 'none'}`, ...shown.map(show))
      if (shown.length < inColumn.length) lines.push(`  … ${inColumn.length - shown.length} more`)
    }
  } catch {
    lines.push('', `Kanban board at ${boardPath} could not be read.`)
  }
  if (!git('config', '--get', 'merge.kanban-board.driver')) {
    lines.push('Board merge driver is not configured in this clone; see "Kanban board merges" in docs/WORKFLOW.md.')
  }
}

const statePath = join(root, STATE_FILE)
const state = existsSync(statePath) ? readFileSync(statePath, 'utf8') : null
if (!existsSync(boardPath)) {
  lines.push('', state !== null && !state.includes(NOT_INITIALIZED)
    ? 'Kanban board missing (.kanban/board.json): it is part of the default workflow; see the init-project skill.'
    : 'No Kanban board yet; the init-project skill creates it.')
}
if (state !== null) {
  if (state.includes(NOT_INITIALIZED)) {
    lines.push('', `Project memory is NOT INITIALIZED: ${STATE_FILE} is still the template.`)
  } else {
    // Commits since the state file last changed: a hint that it may be stale.
    const stateCommit = git('log', '-1', '--format=%h', '--', STATE_FILE)
    const since = stateCommit ? git('rev-list', '--count', `${stateCommit}..HEAD`) : ''
    const stale = since && since !== '0' ? ` Last changed in ${stateCommit}; ${since} commit(s) since, so verify before relying on it.` : ''
    lines.push('', `### ${STATE_FILE} (already loaded; do not re-read unless editing).${stale}`, '')
    lines.push(state.length > MAX_STATE_CHARS
      ? `${state.slice(0, MAX_STATE_CHARS)}\n… truncated; the file exceeds ${MAX_STATE_CHARS} characters and should be condensed.`
      : state.trim())
  }
} else {
  lines.push('', `No ${STATE_FILE}. Project memory is NOT INITIALIZED.`)
}

lines.push('', 'Follow the session-start protocol in CLAUDE.md.')
console.log(lines.join('\n'))
