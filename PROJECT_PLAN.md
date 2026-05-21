# Agent Kanban Board — Project Plan

## Overview

**Agent Kanban Board** (`akb`) is a CLI project that gives AI agents a simple, file-based kanban workflow. Agents (or humans driving agents) can create boards, add work items, decompose work into **sub-tasks**, move items across statuses, and inspect history—all without a database or remote service.

A **planning agent** can own a parent item on the board and split it into sub-tasks; **worker agents** can each claim and complete individual sub-tasks while the parent item tracks overall progress on the kanban columns.

State lives in the **current working directory** under a `.akb/` folder. Multiple boards can coexist; each board is a directory with its own configuration, items, and audit log.

## Goals

- **Agent-friendly**: predictable commands and machine-readable output (JSON where useful).
- **Local-first**: no network; works in any repo or workspace by running commands from that directory.
- **Transparent storage**: plain JSON and JSONL files that agents can read, diff, and commit if desired.
- **Auditable**: every status change and significant item/sub-task event is appended to `history.jsonl`.
- **Decomposable work**: parent items carry sub-tasks so large tasks can be split for parallel agent execution without extra board columns or files per sub-task.

## On-Disk Layout

All data is rooted at `.akb/` relative to the process working directory (or an explicit `--cwd` if we add it later).

```
.akb/
├── config.json                 # workspace metadata (created by `akb init`)
├── boards/
│   └── <board-id>/
│       ├── board.json          # board metadata and column/status definitions
│       ├── history.jsonl       # append-only audit log for this board
│       └── items/
│           ├── <item-id>.json  # one file per kanban item
│           └── ...
```

Run **`akb init`** once per working directory before creating boards or items. It creates `.akb/`, `boards/`, and `config.json` if they do not already exist. The command is **idempotent**: re-running init succeeds without overwriting existing data.

### Board directory (`<board-id>`)

- **`board.json`** — board name, id, created/updated timestamps, and ordered list of **statuses** (columns).
- **`items/`** — one JSON file per item; filename is the item id (e.g. `my-sprint-k3m9x.json`).
- **`history.jsonl`** — one JSON object per line; records board- and item-level events (creation, status changes, updates, deletion).

Board ids should be filesystem-safe slugs (user-provided on `board create`). The CLI resolves boards by id or by a unique display name if we support aliases later.

### Default statuses

When a board is created **without** custom statuses, it uses this column order:

1. `To Do`
2. `In Progress`
3. `Review`
4. `Done`

### Custom statuses

Board creation accepts an optional list of status names (order = column order left-to-right). Example:

```bash
akb board create my-sprint --status "Backlog" --status "Doing" --status "Blocked" --status "Shipped"
```

Statuses are stored in `board.json` and validated on every item move: an item’s `status` must match one of the board’s defined statuses.

### Workspace initialization (`akb init`)

`akb init` prepares the local kanban workspace under `.akb/`:

| Action                   | Detail                                                            |
| ------------------------ | ----------------------------------------------------------------- |
| Create `.akb/`           | Root directory for all kanban state in the current cwd            |
| Create `.akb/boards/`    | Empty directory; board subdirectories are added by `board create` |
| Write `.akb/config.json` | Records `initializedAt` (ISO 8601) and schema version             |
| `--gitignore` (optional) | Append `.akb/` to the project `.gitignore` in the current cwd     |

Whether `.akb/` is committed is left to the team. By default, `init` does **not** modify `.gitignore`. Pass `--gitignore` when the workspace should treat kanban state as local-only (typical for agent scratch work).

Other commands (`board create`, `item add`, etc.) require an initialized workspace. If `.akb/` is missing, the CLI should exit with a clear error pointing the user (or agent) to run `akb init` first.

Example:

```bash
akb init
akb init --gitignore
akb board create my-sprint
```

## Data Schemas (planned)

### Short ids (suffix)

Auto-generated suffixes are **not** RFC UUIDs. Each suffix is **5–6 random lowercase alphanumeric characters** (`a`–`z`, `0`–`9`) so ids stay short and easy for humans to read and type (e.g. `my-sprint-k3m9x`, `my-sprint-k3m9x-a7f2p`).

| Rule | Detail |
| ---- | ------ |
| Length | Randomly 5 or 6 characters per generated suffix |
| Charset | `abcdefghijklmnopqrstuvwxyz0123456789` |
| Uniqueness | On collision within scope, generate a new suffix and retry (items: unique per board; sub-tasks: unique per parent item) |
| Composition | Item: `{board-id}-{suffix}` · Sub-task: `{item-id}-{suffix}` |

Full ids use hyphen separators; the suffix is only the trailing segment(s), not a nested UUID string.

### `config.json` (workspace root)

| Field           | Type   | Description                           |
| --------------- | ------ | ------------------------------------- |
| `version`       | number | On-disk schema version (start at `1`) |
| `initializedAt` | string | ISO 8601 timestamp of first init      |

### `board.json`

| Field       | Type     | Description                                      |
| ----------- | -------- | ------------------------------------------------ |
| `id`        | string   | Stable board identifier (matches directory name) |
| `name`      | string   | Human-readable board name                        |
| `statuses`  | string[] | Ordered column names                             |
| `createdAt` | string   | ISO 8601 timestamp                               |
| `updatedAt` | string   | ISO 8601 timestamp                               |

### Item file (`items/<item-id>.json`)

| Field         | Type   | Description                                                 |
| ------------- | ------ | ----------------------------------------------------------- |
| `id`          | string | Auto-generated: `{board-id}-{shortId}` (matches filename stem) |
| `title`       | string | Short summary                                               |
| `description` | string | Optional longer text                                        |
| `status`      | string | Must be one of `board.statuses`                             |
| `createdAt`   | string | ISO 8601                                                    |
| `updatedAt`   | string | ISO 8601                                                    |
| `metadata`    | object | Optional key-value for agent-specific fields                |
| `subtasks`    | array  | Ordered list of sub-task objects (see below); default `[]`  |

### Sub-tasks (embedded on parent item)

Sub-tasks are stored **inside** the parent item’s JSON file (not separate files under `items/`). That keeps decomposition colocated with the parent card and avoids polluting the board with many top-level items for every small work slice.

| Field         | Type   | Description                                                                |
| ------------- | ------ | -------------------------------------------------------------------------- |
| `id`          | string | Auto-generated: `{item-id}-{shortId}` (item id already includes board prefix) |
| `title`       | string | Short description of the work piece                                        |
| `description` | string | Optional detail for the worker agent                                       |
| `status`      | string | Sub-task lifecycle: `pending`, `in_progress`, `done`, `cancelled`          |
| `assignee`    | string | Optional agent/human label (e.g. sub-agent id, role name)                  |
| `createdAt`   | string | ISO 8601                                                                   |
| `updatedAt`   | string | ISO 8601                                                                   |
| `metadata`    | object | Optional agent-specific fields (prompt refs, tool hints, etc.)             |

Sub-task statuses are **independent** of board columns. Board `status` on the parent reflects the overall item on the kanban; sub-task `status` tracks each slice of work underneath.

**Typical agent flow**

1. Planning agent: `item add` → parent on board (default `statuses[0]`, or `--status`).
2. Planning agent: `item subtask add` (repeat) → splits parent into work pieces.
3. Planning agent: `item move` parent → `In Progress` when ready for workers.
4. Worker agents: `item subtask update` / `item subtask done` on assigned sub-tasks (optional `assignee` on add or update).
5. When every sub-task is `done` or `cancelled`, the CLI **automatically** moves the parent to `Review` if that column exists on the board; otherwise to `Done`. Log as `item.moved` (include `reason: "all_subtasks_complete"`).

The CLI exposes sub-task progress on `item show` (e.g. `2/5 done`).

Example fragment inside `items/my-sprint-k3m9x.json`:

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
    },
    {
      "id": "my-sprint-k3m9x-x9k2m",
      "title": "Add session middleware",
      "status": "in_progress",
      "assignee": "agent-backend",
      "createdAt": "2026-05-21T10:00:00.000Z",
      "updatedAt": "2026-05-21T12:00:00.000Z"
    }
  ]
}
```

### `history.jsonl` (audit)

Each line is a single JSON object. Minimum event types to support:

| `type`            | When recorded                             |
| ----------------- | ----------------------------------------- |
| `board.created`   | Board created (includes initial statuses) |
| `item.created`    | New item file written                     |
| `item.updated`    | Non-status fields changed                 |
| `item.moved`      | `status` changed (include `from`, `to`)   |
| `item.deleted`    | Item removed                              |
| `subtask.created` | Sub-task added to parent item             |
| `subtask.updated` | Sub-task fields changed (non-status)      |
| `subtask.moved`   | Sub-task `status` changed (`from`, `to`)  |
| `subtask.deleted` | Sub-task removed from parent              |

Example lines:

```json
{"at":"2026-05-21T12:00:00.000Z","type":"item.moved","boardId":"my-sprint","itemId":"my-sprint-k3m9x","from":"To Do","to":"In Progress"}
{"at":"2026-05-21T12:05:00.000Z","type":"subtask.created","boardId":"my-sprint","itemId":"my-sprint-k3m9x","subtaskId":"my-sprint-k3m9x-a7f2p","title":"Add login API route"}
{"at":"2026-05-21T13:00:00.000Z","type":"subtask.moved","boardId":"my-sprint","itemId":"my-sprint-k3m9x","subtaskId":"my-sprint-k3m9x-a7f2p","from":"in_progress","to":"done"}
```

Append-only: never rewrite `history.jsonl`; agents can tail or parse it for context.

## CLI Surface (planned)

| Command                                               | Purpose                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `init`                                                | Create `.akb/`, `boards/`, and `config.json` (idempotent); optional `--gitignore` |
| `board create <id>`                                   | Create board with default or `--status` columns                                   |
| `board list`                                          | List boards under `.akb/boards/`                                                  |
| `board show <id>`                                     | Print board config and column summary                                             |
| `item add <board> <title>`                            | Create item; default status `statuses[0]`; optional `--status` (error if invalid) |
| `item list <board>`                                   | List items, optionally filter by `--status`                                       |
| `item show <board> <item>`                            | Show one item                                                                     |
| `item move <board> <item> <status>`                   | Change status; append `item.moved` to history                                     |
| `item update <board> <item>`                          | Update title/description/metadata                                                 |
| `item remove <board> <item>`                          | Delete item file; log `item.deleted`                                              |
| `item subtask add <board> <item> <title>`             | Add sub-task (`pending`); optional `--description`, `--assignee`                  |
| `item subtask list <board> <item>`                    | List sub-tasks; optional `--status`, `--assignee`                                 |
| `item subtask show <board> <item> <subtask>`          | Show one sub-task                                                                 |
| `item subtask update <board> <item> <subtask>`        | Update title/description/assignee/metadata                                        |
| `item subtask move <board> <item> <subtask> <status>` | Set sub-task status; log `subtask.moved`                                          |
| `item subtask done <board> <item> <subtask>`          | Shortcut for `move` → `done`                                                      |
| `item subtask remove <board> <item> <subtask>`        | Remove sub-task; log `subtask.deleted`                                            |
| `history <board>`                                     | Print or tail `history.jsonl` (optional `--item`, `--limit`)                      |

Output conventions (to decide during implementation):

- Human tables for interactive use.
- `--json` flag on list/show commands for agent consumption.

## Implementation Phases

### Phase 1 — Storage and board lifecycle

- Resolve `.akb/` path from cwd.
- `akb init` to create workspace layout and `config.json`; `--gitignore` appends `.akb/` to project `.gitignore`.
- Guard other commands when workspace is not initialized.
- `board create` with default statuses and optional `--status` repeats.
- `board list` / `board show`.
- Write `board.created` to `history.jsonl`.

### Phase 2 — Items

- CRUD for items under `items/`.
- Auto-generate item ids as `{board-id}-{shortId}` (5–6 char alphanumeric suffix; retry on collision).
- `item add` with optional `--status` (default `statuses[0]`; error if status not on board).
- Enforce status ∈ `board.statuses`.
- Append `item.*` events to `history.jsonl`.

### Phase 2b — Sub-tasks

- Embed `subtasks` array on item JSON; validate sub-task `status` enum.
- Auto-generate sub-task ids as `{item-id}-{shortId}` (5–6 char suffix; retry on collision within item).
- `item subtask` CRUD and `done` shortcut; optional filters on list.
- When all sub-tasks are `done` or `cancelled`, auto-move parent to `Review` (else `Done`).
- Append `subtask.*` events to `history.jsonl` (include `subtaskId` on every line).
- Show sub-task progress summary on `item show` / `item list --json`.

### Phase 3 — Agent ergonomics

- `--json` on read commands.
- Stable exit codes and error messages.
- Document agent workflows in README (invoke `akb`, read `.akb/` directly).

### Phase 4 — Polish (optional)

- `board delete`, item search, dry-run.
- Global config (default board, default statuses template).

## Non-Goals (for now)

- Web UI or TUI.
- Multi-user locking or merge conflict resolution beyond “last write wins” on item files.
- Remote sync or Git integration (users may commit `.akb/` themselves).

## Technical Stack

- **Runtime**: Node.js ≥ 18, ESM, TypeScript.
- **CLI**: Commander (already in use).
- **Binary**: `akb` (see `package.json`); align command name with `akb` in docs as the product evolves.

## Design decisions

| Topic                          | Decision                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.akb/` in git                 | Opt-in via `akb init --gitignore` (appends `.akb/` to the project `.gitignore`). Otherwise teams may commit `.akb/` as shared state.             |
| Initial item status            | Default `board.statuses[0]`; override with `item add --status`. Invalid status → error.                                                          |
| Item ids                       | `{board-id}-{shortId}` — suffix is 5–6 random lowercase alphanumeric characters.                                                                   |
| Sub-task ids                   | `{item-id}-{shortId}` — same suffix rules; unique among sub-tasks on that item.                                                                    |
| Short id format                | Human-readable, easy to copy in chat/CLI (e.g. `k3m9x`, `a7f2p`), not a full UUID.                                                                |
| Parent when sub-tasks complete | Yes — auto-move parent to `Review` if that status exists on the board, otherwise `Done`, when every sub-task is `done` or `cancelled`.           |

---

This document is the source of truth for scope and on-disk contracts until superseded by code and tests.
