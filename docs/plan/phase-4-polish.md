# Phase 4 — Polish (optional)

Parent: [PROJECT_PLAN.md](../../PROJECT_PLAN.md) · Index: [README.md](./README.md) · Depends on: [Phase 3](./phase-3-agent-ergonomics.md)

## Goal

Optional quality-of-life features after the core agent workflow is stable. Treat as backlog unless explicitly prioritized.

## Prerequisites

- Phases 1–3 shipped and usable by agents in real workspaces.

## Proposed scope

### Board lifecycle

- `akb board delete <id>` — remove board directory and contents (with confirmation or `--force`).

### Item discovery

- Item search across a board (by title/description/metadata substring).
- Optional global search across boards (if useful).

### Safety

- Dry-run mode for destructive or move operations (print intended writes without applying).

### Global / workspace config

Extend `config.json` or a separate config file with optional defaults:

- Default board id for commands that omit `<board>`
- Default statuses template for `board create` when no `--status` passed

Exact schema TBD when this phase starts; keep backward compatible with `version` in `config.json`.

## Tasks

- [ ] `board delete` with clear audit or final history entry (define behavior).
- [ ] Item search command(s) and `--json` output.
- [ ] Dry-run flag design (`--dry-run` global vs per-command).
- [ ] Global config fields and CLI precedence (flag > env > config > default).

## Acceptance criteria

- Deleting a board does not leave orphan state under `.akb/boards/`.
- Dry-run never mutates JSON/JSONL on disk.
- Documented non-goals remain: no web UI, no multi-user locking, no remote sync.

## Non-goals (unchanged)

From [PROJECT_PLAN.md](../../PROJECT_PLAN.md):

- Web UI or TUI.
- Multi-user locking or merge conflict resolution beyond last-write-wins on item files.
- Remote sync or Git integration (users may commit `.akb/` themselves).

## Notes

This phase is explicitly **optional**. Ship Phases 1–3 before investing here unless a concrete user need appears (e.g. many boards requiring delete, or repeated `board create` with same columns).
