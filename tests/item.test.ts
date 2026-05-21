import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBoard } from "../src/board/index.js";
import {
  addItem,
  assertBoardStatus,
  formatItemList,
  formatItemShow,
  getItem,
  ItemError,
  listItems,
  moveItem,
  removeItem,
  updateItem,
} from "../src/item/index.js";
import { initWorkspace, WorkspaceError } from "../src/workspace/index.js";
import { createTempDir, removeTempDir } from "./helpers/temp-dir.js";

const ITEM_ID_PATTERN = /^demo-[a-z0-9]{5,6}$/;

describe("item", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
    initWorkspace({ cwd });
    createBoard("demo", undefined, cwd);
  });

  afterEach(() => {
    removeTempDir(cwd);
  });

  describe("assertBoardStatus", () => {
    it("accepts valid board status", () => {
      const board = {
        id: "demo",
        name: "demo",
        statuses: ["To Do", "Done"],
        createdAt: "",
        updatedAt: "",
      };
      expect(() => assertBoardStatus(board, "To Do")).not.toThrow();
    });

    it("rejects invalid status with clear message", () => {
      const board = {
        id: "demo",
        name: "demo",
        statuses: ["To Do", "Done"],
        createdAt: "",
        updatedAt: "",
      };
      expect(() => assertBoardStatus(board, "Blocked")).toThrow(
        'Invalid status "Blocked". Valid: To Do → Done',
      );
    });
  });

  describe("addItem", () => {
    it("creates item file with default status and generated id", () => {
      const item = addItem("demo", "First task", {}, cwd);

      expect(item.id).toMatch(ITEM_ID_PATTERN);
      expect(item.title).toBe("First task");
      expect(item.status).toBe("To Do");
      expect(item.description).toBe("");
      expect(item.subtasks).toEqual([]);

      const filePath = join(
        cwd,
        ".akb",
        "boards",
        "demo",
        "items",
        `${item.id}.json`,
      );
      expect(existsSync(filePath)).toBe(true);

      const history = readFileSync(
        join(cwd, ".akb", "boards", "demo", "history.jsonl"),
        "utf8",
      )
        .trim()
        .split("\n");
      const last = JSON.parse(history[history.length - 1]!);
      expect(last.type).toBe("item.created");
      expect(last.boardId).toBe("demo");
      expect(last.itemId).toBe(item.id);
    });

    it("creates item with custom status", () => {
      const item = addItem("demo", "Review me", { status: "Review" }, cwd);
      expect(item.status).toBe("Review");
    });

    it("rejects invalid status on add", () => {
      expect(() => addItem("demo", "Bad", { status: "Shipped" }, cwd)).toThrow(
        ItemError,
      );
    });

    it("requires initialized workspace", () => {
      const empty = createTempDir();
      try {
        expect(() => addItem("demo", "X", {}, empty)).toThrow(WorkspaceError);
      } finally {
        removeTempDir(empty);
      }
    });
  });

  describe("listItems", () => {
    it("returns empty list when no items", () => {
      expect(listItems("demo", {}, cwd)).toEqual([]);
      expect(formatItemList([])).toBe("No items found.");
    });

    it("returns items sorted by createdAt", () => {
      const a = addItem("demo", "A", {}, cwd);
      const b = addItem("demo", "B", {}, cwd);
      const items = listItems("demo", {}, cwd);
      expect(items.map((i) => i.id)).toEqual([a.id, b.id]);
    });

    it("filters by status", () => {
      const todo = addItem("demo", "Todo", {}, cwd);
      const done = addItem("demo", "Done", { status: "Done" }, cwd);
      const filtered = listItems("demo", { status: "Done" }, cwd);
      expect(filtered.map((i) => i.id)).toEqual([done.id]);
      expect(filtered.some((i) => i.id === todo.id)).toBe(false);
    });
  });

  describe("getItem", () => {
    it("returns item config", () => {
      const created = addItem("demo", "Show me", {}, cwd);
      const item = getItem("demo", created.id, cwd);
      expect(item.title).toBe("Show me");
    });

    it("throws when item not found", () => {
      expect(() => getItem("demo", "demo-missing", cwd)).toThrow(
        "Item not found: demo-missing",
      );
    });
  });

  describe("moveItem", () => {
    it("updates status and logs item.moved", () => {
      const created = addItem("demo", "Move me", {}, cwd);
      const moved = moveItem("demo", created.id, "In Progress", cwd);

      expect(moved.status).toBe("In Progress");
      expect(moved.updatedAt >= created.updatedAt).toBe(true);

      const history = readFileSync(
        join(cwd, ".akb", "boards", "demo", "history.jsonl"),
        "utf8",
      )
        .trim()
        .split("\n");
      const event = JSON.parse(history[history.length - 1]!);
      expect(event).toMatchObject({
        type: "item.moved",
        boardId: "demo",
        itemId: created.id,
        from: "To Do",
        to: "In Progress",
      });
    });

    it("is a no-op when status unchanged", () => {
      const created = addItem("demo", "Stay", {}, cwd);
      const historyBefore = readFileSync(
        join(cwd, ".akb", "boards", "demo", "history.jsonl"),
        "utf8",
      );
      const moved = moveItem("demo", created.id, "To Do", cwd);
      const historyAfter = readFileSync(
        join(cwd, ".akb", "boards", "demo", "history.jsonl"),
        "utf8",
      );

      expect(moved.status).toBe("To Do");
      expect(historyAfter).toBe(historyBefore);
    });

    it("rejects invalid status on move", () => {
      const created = addItem("demo", "X", {}, cwd);
      expect(() => moveItem("demo", created.id, "Invalid", cwd)).toThrow(
        ItemError,
      );
    });
  });

  describe("updateItem", () => {
    it("updates fields and logs item.updated", () => {
      const created = addItem("demo", "Old", {}, cwd);
      const updated = updateItem(
        "demo",
        created.id,
        { title: "New", description: "Details" },
        cwd,
      );

      expect(updated.title).toBe("New");
      expect(updated.description).toBe("Details");

      const history = readFileSync(
        join(cwd, ".akb", "boards", "demo", "history.jsonl"),
        "utf8",
      )
        .trim()
        .split("\n");
      const event = JSON.parse(history[history.length - 1]!);
      expect(event.type).toBe("item.updated");
    });

    it("does not log when nothing changed", () => {
      const created = addItem("demo", "Same", {}, cwd);
      const historyBefore = readFileSync(
        join(cwd, ".akb", "boards", "demo", "history.jsonl"),
        "utf8",
      );
      updateItem("demo", created.id, { title: "Same" }, cwd);
      const historyAfter = readFileSync(
        join(cwd, ".akb", "boards", "demo", "history.jsonl"),
        "utf8",
      );
      expect(historyAfter).toBe(historyBefore);
    });
  });

  describe("removeItem", () => {
    it("deletes file and logs item.deleted", () => {
      const created = addItem("demo", "Remove me", {}, cwd);
      const filePath = join(
        cwd,
        ".akb",
        "boards",
        "demo",
        "items",
        `${created.id}.json`,
      );

      removeItem("demo", created.id, cwd);
      expect(existsSync(filePath)).toBe(false);

      const history = readFileSync(
        join(cwd, ".akb", "boards", "demo", "history.jsonl"),
        "utf8",
      )
        .trim()
        .split("\n");
      const event = JSON.parse(history[history.length - 1]!);
      expect(event.type).toBe("item.deleted");
      expect(event.itemId).toBe(created.id);
    });

    it("new add after remove gets a new id", () => {
      const first = addItem("demo", "One", {}, cwd);
      removeItem("demo", first.id, cwd);
      const second = addItem("demo", "Two", {}, cwd);
      expect(second.id).not.toBe(first.id);
    });
  });

  describe("formatItemShow", () => {
    it("formats item details", () => {
      const item = addItem("demo", "Task", {}, cwd);
      const output = formatItemShow(item);
      expect(output).toContain(`Item: ${item.id}`);
      expect(output).toContain("Title: Task");
      expect(output).toContain("Subtasks: 0");
    });
  });
});
