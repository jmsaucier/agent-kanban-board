# Phase 1 — Storage and board lifecycle

Parent: [PROJECT_PLAN.md](../../PROJECT_PLAN.md) · Index: [README.md](./README.md)

## Goal

Establish the on-disk workspace under `.akb/`, guard uninitialized usage, and support board creation, listing, and inspection with audit logging for board creation.

## Prerequisites

- Node.js ≥ 18, TypeScript, Commander CLI scaffold (`akb` binary).
- No prior phases.

## On-disk layout (this phase)

```
.akb/
├── config.json
└── boards/
    └── <board-id>/
        ├── board.json
        ├── history.jsonl
        └── items/          # empty until Phase 2
```

## Schemas

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

### Default statuses

When a board is created **without** custom statuses:

1. `To Do`
2. `In Progress`
3. `Review`
4. `Done`

Custom statuses: `akb board create <id> --status "Backlog" --status "Doing" ...` (order = column order).

### `history.jsonl` (this phase)

| `type`          | When recorded                             |
| --------------- | ----------------------------------------- |
| `board.created` | Board created (includes initial statuses) |

Append-only; never rewrite the file.

## CLI commands

| Command                     | Purpose                                                                           |
| --------------------------- | --------------------------------------------------------------------------------- |
| `akb init`                  | Create `.akb/`, `boards/`, and `config.json` (idempotent); optional `--gitignore` |
| `akb board create <id>`     | Create board with default or repeated `--status` columns                          |
| `akb board list`            | List boards under `.akb/boards/`                                                  |
| `akb board show <id>`       | Print board config and column summary                                             |

### `akb init` behavior

| Action                   | Detail                                                            |
| ------------------------ | ----------------------------------------------------------------- |
| Create `.akb/`           | Root directory for kanban state in cwd                            |
| Create `.akb/boards/`    | Empty; board dirs added by `board create`                         |
| Write `.akb/config.json` | `initializedAt` (ISO 8601) and schema version                     |
| `--gitignore` (optional) | Append `.akb/` to project `.gitignore` in cwd                     |

- Idempotent: re-run succeeds without overwriting existing data.
- Default: does **not** modify `.gitignore`.
- Other commands: if `.akb/` is missing, exit with clear error → run `akb init`.

## Tasks

- [ ] Resolve `.akb/` path from cwd (future: optional `--cwd`).
- [ ] Implement `akb init` and optional `--gitignore`.
- [ ] Guard all non-init commands when workspace is not initialized.
- [ ] Implement `board create` with default statuses and optional `--status` repeats.
- [ ] Implement `board list` and `board show`.
- [ ] Append `board.created` events to `history.jsonl` on board create.
- [ ] Use filesystem-safe slugs for board ids (user-provided on create).

## Acceptance criteria

- `akb init` twice in same cwd does not corrupt `config.json`.
- `akb init --gitignore` appends `.akb/` only when appropriate (no duplicate lines if re-run — define behavior).
- `board create` rejects invalid ids / duplicate boards with clear errors.
- `board list` / `board show` work with zero or many boards.
- Each new board has `board.json`, empty `items/`, and `history.jsonl` with a `board.created` line.

## Design notes

| Topic      | Decision                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| `.akb/` in git | Opt-in via `init --gitignore`; otherwise teams may commit `.akb/`. |

## Out of scope (later phases)

- Items, sub-tasks, `history` command filters, `--json` output.
