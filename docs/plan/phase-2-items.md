# Phase 2 — Items

Parent: [PROJECT_PLAN.md](../../PROJECT_PLAN.md) · Index: [README.md](./README.md) · Depends on: [Phase 1](./phase-1-storage-and-board-lifecycle.md)

## Goal

CRUD for kanban items under `boards/<board-id>/items/`, with auto-generated ids, status validation against the board, and `item.*` audit events.

## Prerequisites

- Phase 1 complete: initialized workspace, boards, `board.json`, `history.jsonl`.

## On-disk layout (this phase)

```
.akb/boards/<board-id>/
├── board.json
├── history.jsonl
└── items/
    └── <item-id>.json    # one file per item; stem = item id
```

## Schemas

### Item file (`items/<item-id>.json`)

| Field         | Type   | Description                                                 |
| ------------- | ------ | ----------------------------------------------------------- |
| `id`          | string | `{board-id}-{shortId}` (matches filename stem)              |
| `title`       | string | Short summary                                               |
| `description` | string | Optional longer text                                        |
| `status`      | string | Must be one of `board.statuses`                             |
| `createdAt`   | string | ISO 8601                                                    |
| `updatedAt`   | string | ISO 8601                                                    |
| `metadata`    | object | Optional key-value for agent-specific fields                |
| `subtasks`    | array  | Ordered sub-task objects; default `[]` (used in Phase 2b)   |

### Short ids (items)

| Rule | Detail |
| ---- | ------ |
| Length | Randomly 5 or 6 characters per suffix |
| Charset | `a`–`z`, `0`–`9` |
| Uniqueness | Retry on collision within board |
| Composition | `{board-id}-{suffix}` |

### `history.jsonl` (this phase)

| `type`         | When recorded                             |
| -------------- | ----------------------------------------- |
| `item.created` | New item file written                     |
| `item.updated` | Non-status fields changed                 |
| `item.moved`   | `status` changed (include `from`, `to`)   |
| `item.deleted` | Item removed                              |

Example:

```json
{"at":"2026-05-21T12:00:00.000Z","type":"item.moved","boardId":"my-sprint","itemId":"my-sprint-k3m9x","from":"To Do","to":"In Progress"}
```

## CLI commands

| Command                            | Purpose                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `akb item add <board> <title>`     | Create item; default `statuses[0]`; optional `--status` (error if invalid)        |
| `akb item list <board>`            | List items; optional `--status` filter                                            |
| `akb item show <board> <item>`     | Show one item                                                                     |
| `akb item move <board> <item> <status>` | Change status; append `item.moved`                                         |
| `akb item update <board> <item>`   | Update title/description/metadata                                                 |
| `akb item remove <board> <item>`   | Delete item file; log `item.deleted`                                              |

## Tasks

- [ ] CRUD for items under `items/`.
- [ ] Auto-generate item ids as `{board-id}-{shortId}` (5–6 char alphanumeric; retry on collision).
- [ ] `item add` with optional `--status` (default `statuses[0]`; error if status not on board).
- [ ] Enforce `status` ∈ `board.statuses` on add and move.
- [ ] Append `item.created`, `item.updated`, `item.moved`, `item.deleted` to `history.jsonl`.
- [ ] Resolve board by id (unique display name aliases: later).

## Acceptance criteria

- New items land in `items/<id>.json` with correct default or `--status`.
- Invalid status on add/move fails with a clear message.
- `item move` updates `updatedAt` and writes `item.moved` with `from` / `to`.
- `item remove` deletes the file and logs `item.deleted`; id cannot be reused without a new add (new suffix).
- `item list` / `item show` reflect current files on disk.

## Design notes

| Topic               | Decision                                                          |
| ------------------- | ----------------------------------------------------------------- |
| Initial item status | Default `board.statuses[0]`; override with `item add --status`. |
| Item ids            | `{board-id}-{shortId}` — not full UUIDs.                          |

## Out of scope (later phases)

- Sub-task commands and embedded sub-task logic (Phase 2b).
- `--json` on list/show (Phase 3).
- `history` command (can land in Phase 2 or 3 — spec lists it globally).
