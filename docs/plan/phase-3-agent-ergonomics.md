# Phase 3 — Agent ergonomics

Parent: [PROJECT_PLAN.md](../../PROJECT_PLAN.md) · Index: [README.md](./README.md) · Depends on: [Phase 2b](./phase-2b-subtasks.md)

## Goal

Make the CLI predictable for autonomous agents: machine-readable output, stable errors, and documented workflows for invoking `akb` and reading `.akb/` directly.

## Prerequisites

- Phases 1, 2, and 2b: full command surface for init, boards, items, and sub-tasks.
- Core history append behavior in place.

## CLI / UX scope

### `--json` on read commands

Apply to list/show commands (minimum):

- `board list`, `board show`
- `item list`, `item show`
- `item subtask list`, `item subtask show`
- `history` (if implemented)

Human-friendly tables remain the default for interactive use.

### Exit codes and errors

- Stable, documented exit codes (e.g. success `0`, usage `1`, not initialized `2`, not found `3`, validation `4` — finalize during implementation).
- Error messages name the fix (e.g. “Run `akb init` in this directory”).
- Invalid board/item/sub-task/status: consistent wording for agents to parse.

### `history` command

| Command              | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `akb history <board>` | Print or tail `history.jsonl`; optional `--item`, `--limit` |

Agents can also read `.akb/boards/<id>/history.jsonl` directly.

## Tasks

- [ ] Add `--json` to all read/list/show commands listed above.
- [ ] Define and implement stable exit codes; document in README.
- [ ] Normalize error messages for missing workspace, board, item, sub-task, and invalid status.
- [ ] Implement `akb history <board>` with optional `--item` and `--limit`.
- [ ] Document agent workflows in README:
  - How to invoke `akb` from a repo cwd
  - When to use `--json`
  - How planning vs worker agents use items and sub-tasks
  - Reading raw JSON under `.akb/` for context

## Acceptance criteria

- Same command with and without `--json` returns equivalent data (JSON is complete, not lossy).
- Scripts can branch on exit code without parsing stderr text alone.
- README gives copy-paste examples for planning + worker flows.
- `history --limit` and `--item` filter as specified.

## Design alignment

From project goals:

- **Agent-friendly**: predictable commands and JSON where useful.
- **Transparent storage**: agents may diff/commit `.akb/` or tail `history.jsonl`.

## Out of scope (Phase 4)

- `board delete`, item search, dry-run, global defaults template.
