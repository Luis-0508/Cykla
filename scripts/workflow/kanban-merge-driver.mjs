#!/usr/bin/env node
// Git merge driver for .kanban/board.json (claude-kanban). Merges by ticket and
// epic ID instead of by text lines, so parallel branches and worktrees never
// silently drop each other's tickets, notes or field changes.
//
// Setup (once per clone; see docs/WORKFLOW.md):
//   git config merge.kanban-board.name "Kanban board merge by ticket ID"
//   git config merge.kanban-board.driver "node scripts/workflow/kanban-merge-driver.mjs %O %A %B"
// .gitattributes routes the file here: `.kanban/board.json merge=kanban-board`.
//
// Exit 0: clean merge written to %A. Exit 1: a merged, valid board is written to
// %A, but something needs a human look (conflicting field edits, renumbered
// IDs, deleted-but-modified items). Git then marks the file as conflicted and
// the reasons are printed to stderr. Nothing is dropped in either case.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TICKETS = { key: 'tickets', prefix: 'K-', seq: 'next_ticket_seq' }
const EPICS = { key: 'epics', prefix: 'EP-', seq: 'next_epic_seq' }
// Append-only logs: merged as a union, never a conflict.
const LOG_FIELDS = new Set(['notes', 'review'])
// Unordered string sets: three-way set merge.
const SET_FIELDS = new Set(['labels', 'depends_on'])

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const idNumber = (id, prefix) => (typeof id === 'string' && id.startsWith(prefix) ? Number(id.slice(prefix.length)) || 0 : 0)

function mergeLog(base = [], ours = [], theirs = []) {
  const seen = new Set()
  const out = []
  for (const entry of [...base, ...ours, ...theirs]) {
    const key = JSON.stringify(entry)
    if (!seen.has(key)) {
      seen.add(key)
      out.push(entry)
    }
  }
  // Keep chronological order when every entry carries a timestamp.
  if (out.every((e) => e && typeof e.at === 'string')) out.sort((a, b) => a.at.localeCompare(b.at))
  return out
}

function mergeSet(base = [], ours = [], theirs = []) {
  const out = []
  for (const x of [...ours, ...theirs]) {
    // An entry from the base survives only if neither side removed it.
    const keep = !base.includes(x) || (ours.includes(x) && theirs.includes(x))
    if (keep && !out.includes(x)) out.push(x)
  }
  return out
}

function mergeValue(base, ours, theirs) {
  if (same(ours, theirs) || same(theirs, base)) return { value: ours, conflict: false }
  if (same(ours, base)) return { value: theirs, conflict: false }
  return { value: ours, conflict: true }
}

function mergeItem(base, ours, theirs, conflicts) {
  const out = {}
  for (const key of new Set([...Object.keys(ours), ...Object.keys(theirs), ...Object.keys(base)])) {
    let value
    if (LOG_FIELDS.has(key)) value = mergeLog(base[key], ours[key], theirs[key])
    else if (SET_FIELDS.has(key)) value = mergeSet(base[key], ours[key], theirs[key])
    else {
      const result = mergeValue(base[key], ours[key], theirs[key])
      if (result.conflict) {
        conflicts.push(`${ours.id}: both sides changed "${key}"; kept ours ${JSON.stringify(ours[key])}, theirs was ${JSON.stringify(theirs[key])}`)
      }
      value = result.value
    }
    // The plugin omits absent values and empty lists; do the same.
    if (value === undefined || (Array.isArray(value) && value.length === 0)) continue
    out[key] = value
  }
  return out
}

// Merges one ID-keyed collection. Our order is kept (it is the priority
// order); items only on their side follow in their order.
function mergeCollection(spec, base, ours, theirs, conflicts) {
  const byId = (list) => new Map((list ?? []).map((item) => [item.id, item]))
  const b = byId(base[spec.key])
  const o = byId(ours[spec.key])
  const t = byId(theirs[spec.key])

  let next = Math.max(
    ours[spec.seq] ?? 0,
    theirs[spec.seq] ?? 0,
    ...[...b.keys(), ...o.keys(), ...t.keys()].map((id) => idNumber(id, spec.prefix) + 1),
  )
  const renamed = new Map()
  const list = []
  const fromTheirs = new Set()

  for (const [id, mine] of o) {
    const original = b.get(id)
    const other = t.get(id)
    if (!other) {
      if (original && same(mine, original)) continue // removed (or archived) on their side
      if (original) conflicts.push(`${id}: removed on their side but changed on ours; kept ours`)
      list.push(mine)
    } else if (!original && !same(mine, other)) {
      // Both sides created the same ID independently: keep both.
      const fresh = `${spec.prefix}${next++}`
      renamed.set(id, fresh)
      list.push(mine)
      conflicts.push(`${id}: created independently on both sides; their ${id} is now ${fresh} (update branch names and PR references)`)
    } else {
      list.push(original ? mergeItem(original, mine, other, conflicts) : mine)
    }
  }
  for (const [id, other] of t) {
    const original = b.get(id)
    if (o.has(id) && !renamed.has(id)) continue
    if (!o.has(id) && original && same(other, original)) continue // removed on our side
    if (!o.has(id) && original) conflicts.push(`${id}: removed on our side but changed on theirs; kept theirs`)
    const item = renamed.has(id) ? { ...other, id: renamed.get(id) } : other
    list.push(item)
    fromTheirs.add(item)
  }
  return { list, next, renamed, fromTheirs }
}

export function mergeBoards(base, ours, theirs) {
  const conflicts = []
  const tickets = mergeCollection(TICKETS, base, ours, theirs, conflicts)
  const epics = mergeCollection(EPICS, base, ours, theirs, conflicts)

  // Items that came from their side follow their side's renumbered IDs.
  for (const ticket of tickets.fromTheirs) {
    if (Array.isArray(ticket.depends_on)) ticket.depends_on = ticket.depends_on.map((d) => tickets.renamed.get(d) ?? d)
    if (epics.renamed.has(ticket.epic)) ticket.epic = epics.renamed.get(ticket.epic)
  }

  const board = {}
  for (const key of new Set([...Object.keys(ours), ...Object.keys(theirs)])) {
    if (key === TICKETS.key) board[key] = tickets.list
    else if (key === EPICS.key) board[key] = epics.list
    else if (key === TICKETS.seq) board[key] = tickets.next
    else if (key === EPICS.seq) board[key] = epics.next
    // The plugin uses version for optimistic locking; any merge is a new version.
    else if (key === 'version') board[key] = Math.max(ours.version ?? 0, theirs.version ?? 0) + 1
    else {
      const merged = mergeValue(base[key], ours[key], theirs[key])
      if (merged.conflict) conflicts.push(`board: both sides changed "${key}"; kept ours`)
      if (merged.value !== undefined) board[key] = merged.value
    }
  }
  return { board, conflicts }
}

function main([basePath, oursPath, theirsPath]) {
  if (!basePath || !oursPath || !theirsPath) {
    console.error('usage: kanban-merge-driver.mjs <base> <ours> <theirs>')
    return 2
  }
  let base, ours, theirs
  try {
    ours = JSON.parse(readFileSync(oursPath, 'utf8'))
    theirs = JSON.parse(readFileSync(theirsPath, 'utf8'))
    const baseText = readFileSync(basePath, 'utf8')
    base = baseText.trim() ? JSON.parse(baseText) : {}
  } catch (error) {
    console.error(`kanban board merge: cannot parse a side (${error.message}); resolve .kanban/board.json by hand`)
    return 1
  }
  const { board, conflicts } = mergeBoards(base, ours, theirs)
  writeFileSync(oursPath, `${JSON.stringify(board, null, 2)}\n`)
  if (conflicts.length) {
    console.error('kanban board merge: merged by ID, nothing dropped; review before `git add`:')
    for (const c of conflicts) console.error(`  - ${c}`)
    return 1
  }
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
