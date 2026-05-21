import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendBoardEvent,
  recordBoardCreated,
} from "../src/history/index.js";
import { createTempDir, removeTempDir } from "./helpers/temp-dir.js";

describe("history", () => {
  let boardDir: string;

  beforeEach(() => {
    boardDir = join(createTempDir(), "my-board");
    mkdirSync(boardDir, { recursive: true });
  });

  afterEach(() => {
    removeTempDir(join(boardDir, ".."));
  });

  it("recordBoardCreated writes board.created line", () => {
    const at = "2026-05-21T12:00:00.000Z";
    recordBoardCreated(boardDir, "my-board", ["To Do", "Done"], at);

    const historyPath = join(boardDir, "history.jsonl");
    expect(existsSync(historyPath)).toBe(true);

    const line = readFileSync(historyPath, "utf8").trim();
    expect(JSON.parse(line)).toEqual({
      at,
      type: "board.created",
      boardId: "my-board",
      statuses: ["To Do", "Done"],
    });
  });

  it("appendBoardEvent appends without rewriting", () => {
    appendBoardEvent(boardDir, {
      at: "2026-05-21T12:00:00.000Z",
      type: "board.created",
      boardId: "a",
      statuses: ["To Do"],
    });
    appendBoardEvent(boardDir, {
      at: "2026-05-21T13:00:00.000Z",
      type: "board.created",
      boardId: "b",
      statuses: ["Done"],
    });

    const lines = readFileSync(join(boardDir, "history.jsonl"), "utf8")
      .trim()
      .split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).boardId).toBe("a");
    expect(JSON.parse(lines[1]!).boardId).toBe("b");
  });
});
