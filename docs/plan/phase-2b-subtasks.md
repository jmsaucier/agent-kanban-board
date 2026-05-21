# Phase 2b — Sub-tasks

Parent: [PROJECT_PLAN.md](../../PROJECT_PLAN.md) · Index: [README.md](./README.md) · Depends on: [Phase 2](./phase-2-items.md)

## Goal

Embed sub-tasks on parent items, expose full sub-task CLI, log `subtask.*` events, auto-move the parent when all sub-tasks finish, and surface progress on item read commands.

## Prerequisites

- Phase 2 complete: item CRUD, item files with `subtasks: []` default.

## Data model

Sub-tasks live **inside** the parent item JSON (not separate files under `items/`).

### Sub-task object (embedded)

| Field         | Type   | Description                                                                |
| ------------- | ------ | -------------------------------------------------------------------------- |
| `id`          | string | `{item-id}-{shortId}`                                                      |
| `title`       | string | Short description                                                          |
| `description` | string | Optional detail for worker agent                                           |
| `status`      | string | `pending`, `in_progress`, `done`, `cancelled`                              |
| `assignee`    | string | Optional agent/human label                                                 |
| `createdAt`   | string | ISO 8601                                                                   |
| `updatedAt`   | string | ISO 8601                                                                   |
| `metadata`    | object | Optional agent-specific fields                                             |

Sub-task statuses are **independent** of board columns. Parent `status` is the kanban column; sub-task `status` tracks work underneath.

### Short ids (sub-tasks)

| Rule | Detail |
| ---- | ------ |
| Composition | `{item-id}-{suffix}` (item id already includes board prefix) |
| Uniqueness | Retry on collision within parent item |
| Charset / length | Same as items: 5–6 chars, `a`–`z`, `0`–`9` |

### `history.jsonl` (this phase)

| `type`            | When recorded                             |
| ----------------- | ----------------------------------------- |
| `subtask.created` | Sub-task added to parent                  |
| `subtask.updated` | Sub-task fields changed (non-status)      |
| `subtask.moved`   | Sub-task `status` changed (`from`, `to`)  |
| `subtask.deleted` | Sub-task removed from parent              |

Include `subtaskId` on every sub-task line. Parent auto-move also logs `item.moved` with `reason: "all_subtasks_complete"`.

Examples:

```json
{"at":"2026-05-21T12:05:00.000Z","type":"subtask.created","boardId":"my-sprint","itemId":"my-sprint-k3m9x","subtaskId":"my-sprint-k3m9x-a7f2p","title":"Add login API route"}
{"at":"2026-05-21T13:00:00.000Z","type":"subtask.moved","boardId":"my-sprint","itemId":"my-sprint-k3m9x","subtaskId":"my-sprint-k3m9x-a7f2p","from":"in_progress","to":"done"}
```

## Typical agent flow

1. Planning agent: `item add` → parent on board (default or `--status`).
2. Planning agent: `item subtask add` (repeat) → work pieces.
3. Planning agent: `item move` parent → `In Progress` when ready for workers.
4. Worker agents: `item subtask update` / `item subtask done` (optional `assignee`).
5. When every sub-task is `done` or `cancelled`: CLI **automatically** moves parent to `Review` if that column exists, else `Done`; log `item.moved` with `reason: "all_subtasks_complete"`.

## CLI commands

| Command                                                      | Purpose                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `akb item subtask add <board> <item> <title>`                | Add sub-task (`pending`); optional `--description`, `--assignee`         |
| `akb item subtask list <board> <item>`                       | List sub-tasks; optional `--status`, `--assignee`                      |
| `akb item subtask show <board> <item> <subtask>`             | Show one sub-task                                                        |
| `akb item subtask update <board> <item> <subtask>`           | Update title/description/assignee/metadata                               |
| `akb item subtask move <board> <item> <subtask> <status>`    | Set sub-task status; log `subtask.moved`                                 |
| `akb item subtask done <board> <item> <subtask>`             | Shortcut for `move` → `done`                                             |
| `akb item subtask remove <board> <item> <subtask>`           | Remove sub-task; log `subtask.deleted`                                   |

## Tasks

- [ ] Validate sub-task `status` enum on add/move.
- [ ] Auto-generate sub-task ids `{item-id}-{shortId}` with collision retry per item.
- [ ] Implement all `item subtask` commands and `done` shortcut.
- [ ] Optional filters on `subtask list` (`--status`, `--assignee`).
- [ ] When all sub-tasks are `done` or `cancelled`, auto-move parent to `Review` or `Done`.
- [ ] Append all `subtask.*` events to `history.jsonl`.
- [ ] Show sub-task progress on `item show` (e.g. `2/5 done`) and `item list --json` when JSON exists.

## Acceptance criteria

- Sub-tasks persist only in parent JSON; board `items/` count does not grow per sub-task.
- Invalid sub-task status rejected.
- Completing last active sub-task triggers parent move and `item.moved` with reason.
- `item show` displays progress summary.
- `subtask done` equivalent to `move` → `done`.

## Design notes

| Topic                          | Decision                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Parent when sub-tasks complete | Auto `Review` if column exists, else `Done`, when all sub-tasks `done` or `cancelled`.         |

## Example item fragment

```json
{
  "id": "my-sprint-k3m9x",
  "title": "Implement authentication",
  "status": "In Progress",
  "subtasks": [
    {
      "id": "my-sprint-k3m9x-a7f2p",
      "title": "Add login API route",
      "status": "done",
      "assignee": "agent-backend",
      "createdAt": "2026-05-21T10:00:00.000Z",
      "updatedAt": "2026-05-21T11:30:00.000Z"
    }
  ]
}
```

## Out of scope (later phases)

- `--json` flag standardization (Phase 3).
- `history` command with `--item` / `--limit` (implement with Phase 3 if not done earlier).
