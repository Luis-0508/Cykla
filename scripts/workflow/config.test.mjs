// Consistency checks for the agent and Claude Code configuration, so later
// edits cannot silently break imports, the hook or the skills.
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

const ROOT = resolve(import.meta.dirname, '..', '..')
// Normalized: Windows checkouts may use CRLF line endings.
const read = (path) => readFileSync(join(ROOT, path), 'utf8').replace(/\r\n/g, '\n')
// Import lines outside fenced code blocks, which Claude Code ignores.
const imports = (text) => text.replace(/```[\s\S]*?```/g, '').split(/\r?\n/).filter((l) => /^@\S/.test(l.trim()))

test('CLAUDE.md imports AGENTS.md exactly once, first, and nothing else', () => {
  const claude = read('CLAUDE.md')
  assert.equal(claude.trimStart().split(/\r?\n/)[0], '@AGENTS.md')
  assert.deepEqual(imports(claude), ['@AGENTS.md'])
  assert.ok(claude.split(/\r?\n/).length <= 200, 'CLAUDE.md should stay under 200 lines')
})

test('AGENTS.md stays tool-independent', () => {
  const agents = read('AGENTS.md')
  assert.deepEqual(imports(agents), [], 'AGENTS.md must not import other files')
  assert.doesNotMatch(agents, /kanban_\w+|\/kanban:|SessionStart|Skill tool/, 'tool-specific workflow belongs in CLAUDE.md')
})

test('the SessionStart hook is registered for every session source and exists', () => {
  const settings = JSON.parse(read('.claude/settings.json'))
  const entries = settings.hooks?.SessionStart ?? []
  assert.equal(entries.length, 1)
  assert.deepEqual(entries[0].matcher.split('|').sort(), ['clear', 'compact', 'resume', 'startup'])
  const [hook] = entries[0].hooks
  assert.equal(hook.type, 'command')
  const script = hook.command.match(/\$CLAUDE_PROJECT_DIR\/([^"\s]+)/)?.[1]
  assert.ok(script && existsSync(join(ROOT, script)), `hook script ${script} must exist`)
  assert.ok(hook.timeout <= 15, 'keep the hook fast')
})

test('the project settings do not force plugins on contributors', () => {
  const settings = JSON.parse(read('.claude/settings.json'))
  assert.equal(settings.enabledPlugins, undefined)
  assert.equal(settings.extraKnownMarketplaces, undefined)
})

test('every project skill has valid frontmatter', () => {
  const skillsDir = join(ROOT, '.claude', 'skills')
  for (const name of readdirSync(skillsDir)) {
    const text = read(join('.claude', 'skills', name, 'SKILL.md'))
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
    assert.ok(front, `${name}: missing frontmatter`)
    assert.match(front, new RegExp(`^name: ${name}$`, 'm'), `${name}: name must match the directory`)
    const description = front.match(/^description: (.+)$/m)?.[1] ?? ''
    assert.ok(description.length >= 40 && description.length <= 1024, `${name}: description length ${description.length}`)
  }
})

test('the project state stays small enough to inject into every session', () => {
  const lines = read('docs/PROJECT_STATE.md').split(/\r?\n/).length
  assert.ok(lines <= 100, `docs/PROJECT_STATE.md has ${lines} lines; condense it`)
})

test('workflow files contain no personal paths', () => {
  const files = ['CLAUDE.md', 'AGENTS.md', 'docs/WORKFLOW.md', '.claude/settings.json', '.claude/hooks/session-context.mjs', '.claude/skills/init-project/SKILL.md']
  for (const file of files) {
    assert.doesNotMatch(read(file), /[A-Z]:[\\/]Users[\\/]|\/home\/\w|\/Users\/\w/, `${file} contains a personal path`)
  }
})

test('no Kanban board or merge driver remains; tasks live in GitHub issues', () => {
  assert.ok(!existsSync(join(ROOT, '.kanban')), 'tasks are tracked in GitHub issues, not a local board')
  if (existsSync(join(ROOT, '.gitattributes'))) assert.doesNotMatch(read('.gitattributes'), /kanban/i)
  for (const file of ['CLAUDE.md', 'docs/WORKFLOW.md', '.claude/hooks/session-context.mjs', '.claude/skills/init-project/SKILL.md']) {
    assert.doesNotMatch(read(file), /kanban_\w+|\/kanban:|board\.json/, `${file} still refers to the Kanban board`)
  }
  assert.match(read('CONTRIBUTING.md'), /None\s+of\s+the\s+tooling\s+is\s+required\s+to\s+contribute/)
})
