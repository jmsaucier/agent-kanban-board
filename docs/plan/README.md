# Implementation plan (by phase)

This directory breaks [PROJECT_PLAN.md](../../PROJECT_PLAN.md) into one file per implementation phase. The root plan remains the source of truth for schemas and CLI contracts; these files add phase scope, prerequisites, and checklists.

| Phase | File | Summary |
| ----- | ---- | ------- |
| 1 | [phase-1-storage-and-board-lifecycle.md](./phase-1-storage-and-board-lifecycle.md) | Workspace init, board create/list/show, history |
| 2 | [phase-2-items.md](./phase-2-items.md) | Item CRUD, ids, status validation, item history |
| 2b | [phase-2b-subtasks.md](./phase-2b-subtasks.md) | Embedded sub-tasks, auto parent move, subtask history |
| 3 | [phase-3-agent-ergonomics.md](./phase-3-agent-ergonomics.md) | `--json`, exit codes, README workflows |
| 4 | [phase-4-polish.md](./phase-4-polish.md) | Optional: delete, search, dry-run, global config |
