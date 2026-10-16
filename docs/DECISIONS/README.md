# Decision records

Short records of significant technical decisions: what was decided, why, and
what it costs. They are written when a decision is made and are not rewritten
later; a changed decision gets a new record that supersedes the old one.

Earlier decisions (offline-only storage, versioned SQLite migrations, pure prediction
logic, typed i18n catalogs) are described in [ARCHITECTURE.md](../ARCHITECTURE.md),
[DATABASE.md](../DATABASE.md) and [HARDENING.md](../HARDENING.md).

Name files `NNNN-short-title.md`, numbered in order, and add each record to
the table.

| #                                                     | Decision                                              | Status   |
| ----------------------------------------------------- | ----------------------------------------------------- | -------- |
| [0001](0001-local-kanban-board-and-project-memory.md) | Local Kanban board and project memory for development | Accepted |

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

What problem or force made a decision necessary.

## Decision

What we do.

## Alternatives considered

The real options that were rejected, and why.

## Consequences

What becomes easier, what becomes harder, what to watch.
```
