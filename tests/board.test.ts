import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BoardError,
  createBoard,
  DEFAULT_STATUSES,
  formatBoardList,
  formatBoardShow,
  getBoard,
  listBoards,
  validateBoardId,
} from "../src/board/index.js";
import { initWorkspace, WorkspaceError } from "../src/workspace/index.js";
import { createTempDir, removeTempDir } from "./helpers/temp-dir.js";

describe("board", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
    initWorkspace({ cwd });
  });

  afterEach(() => {
    removeTempDir(cwd);
  });

  describe("validateBoardId", () => {
    it("accepts valid slugs", () => {
      expect(() => validateBoardId("demo")).not.toThrow();
      expect(() => validateBoardId("my-sprint")).not.toThrow();
      expect(() => validateBoardId("a1b2")).not.toThrow();
    });

    it("rejects empty, dot, and path separators", () => {
      expect(() => validateBoardId("")).toThrow(BoardError);
      expect(() => validateBoardId(".")).toThrow(BoardError);
      expect(() => validateBoardId("..")).toThrow(BoardError);
      expect(() => validateBoardId("bad/id")).toThrow(/path separators/);
      expect(() => validateBoardId("bad\\id")).toThrow(/path separators/);
    });

    it("rejects invalid slug characters", () => {
      expect(() => validateBoardId("My-Board")).toThrow(BoardError);
      expect(() => validateBoardId("-leading")).toThrow(BoardError);
      expect(() => validateBoardId("trailing-")).toThrow(BoardError);
    });
  });

  describe("createBoard", () => {
    it("creates board with default statuses and artifacts", () => {
      const board = createBoard("demo", undefined, cwd);

      expect(board.id).toBe("demo");
      expect(board.name).toBe("demo");
      expect(board.statuses).toEqual([...DEFAULT_STATUSES]);
      expect(board.createdAt).toBe(board.updatedAt);

      const boardDir = join(cwd, ".akb", "boards", "demo");
      expect(existsSync(join(boardDir, "board.json"))).toBe(true);
      expect(existsSync(join(boardDir, "items"))).toBe(true);

      const history = readFileSync(join(boardDir, "history.jsonl"), "utf8")
        .trim();
      const event = JSON.parse(history);
      expect(event.type).toBe("board.created");
      expect(event.boardId).toBe("demo");
      expect(event.statuses).toEqual([...DEFAULT_STATUSES]);
    });

    it("creates board with custom statuses", () => {
      const board = createBoard(
        "custom",
        ["Backlog", "Doing", "Shipped"],
        cwd,
      );
      expect(board.statuses).toEqual(["Backlog", "Doing", "Shipped"]);
    });

    it("rejects duplicate board", () => {
      createBoard("demo", undefined, cwd);
      expect(() => createBoard("demo", undefined, cwd)).toThrow(
        "Board already exists: demo",
      );
    });

    it("requires initialized workspace", () => {
      const empty = createTempDir();
      try {
        expect(() => createBoard("demo", undefined, empty)).toThrow(
          WorkspaceError,
        );
      } finally {
        removeTempDir(empty);
      }
    });
  });

  describe("listBoards", () => {
    it("returns empty list when no boards", () => {
      expect(listBoards(cwd)).toEqual([]);
    });

    it("returns boards sorted by id", () => {
      createBoard("zebra", undefined, cwd);
      createBoard("alpha", undefined, cwd);
      const boards = listBoards(cwd);
      expect(boards.map((b) => b.id)).toEqual(["alpha", "zebra"]);
    });
  });

  describe("getBoard", () => {
    it("returns board config", () => {
      createBoard("demo", undefined, cwd);
      const board = getBoard("demo", cwd);
      expect(board.id).toBe("demo");
    });

    it("throws when board not found", () => {
      expect(() => getBoard("missing", cwd)).toThrow("Board not found: missing");
    });
  });

  describe("formatBoardList", () => {
    it("formats empty list message", () => {
      expect(formatBoardList([])).toBe("No boards found.");
    });

    it("formats board table", () => {
      const output = formatBoardList([
        {
          id: "demo",
          name: "demo",
          statuses: ["To Do", "Done"],
          createdAt: "2026-05-21T12:00:00.000Z",
          updatedAt: "2026-05-21T12:00:00.000Z",
        },
      ]);
      expect(output).toContain("ID");
      expect(output).toContain("demo");
      expect(output).toContain("To Do → Done");
    });
  });

  describe("formatBoardShow", () => {
    it("formats board details and item count", () => {
      createBoard("demo", undefined, cwd);
      const board = getBoard("demo", cwd);
      const output = formatBoardShow(board, cwd);

      expect(output).toContain("Board: demo");
      expect(output).toContain("Columns:");
      expect(output).toContain("1. To Do");
      expect(output).toContain("Items: 0");
    });
  });
});
