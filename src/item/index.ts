import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getBoard, type BoardConfig } from "../board/index.js";
import {
  recordItemCreated,
  recordItemDeleted,
  recordItemMoved,
  recordItemUpdated,
} from "../history/index.js";
import { generateUniqueItemId } from "../ids/index.js";
import {
  requireWorkspace,
  type WorkspacePaths,
} from "../workspace/index.js";

export type ItemConfig = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  subtasks: [];
};

export class ItemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItemError";
  }
}

export type AddItemOptions = {
  status?: string;
};

export type ListItemsFilter = {
  status?: string;
};

export type UpdateItemPatch = {
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

function boardDir(paths: WorkspacePaths, boardId: string): string {
  return join(paths.boardsDir, boardId);
}

function itemsDir(paths: WorkspacePaths, boardId: string): string {
  return join(boardDir(paths, boardId), "items");
}

function itemFilePath(paths: WorkspacePaths, boardId: string, itemId: string): string {
  return join(itemsDir(paths, boardId), `${itemId}.json`);
}

function listItemIds(paths: WorkspacePaths, boardId: string): Set<string> {
  const dir = itemsDir(paths, boardId);
  const ids = new Set<string>();
  if (!existsSync(dir)) {
    return ids;
  }

  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) {
      continue;
    }
    const fullPath = join(dir, name);
    if (!statSync(fullPath).isFile()) {
      continue;
    }
    ids.add(name.slice(0, -".json".length));
  }
  return ids;
}

export function assertBoardStatus(board: BoardConfig, status: string): void {
  if (!board.statuses.includes(status)) {
    const valid = board.statuses.join(" → ");
    throw new ItemError(
      `Invalid status "${status}". Valid: ${valid}`,
    );
  }
}

export function validateItemId(itemId: string): void {
  if (!itemId || itemId === "." || itemId === "..") {
    throw new ItemError(`Invalid item id "${itemId}".`);
  }
  if (itemId.includes("/") || itemId.includes("\\")) {
    throw new ItemError(
      `Invalid item id "${itemId}": must not contain path separators.`,
    );
  }
}

function assertItemOnBoard(
  paths: WorkspacePaths,
  boardId: string,
  itemId: string,
): void {
  validateItemId(itemId);
  if (!itemId.startsWith(`${boardId}-`)) {
    throw new ItemError(`Item not found: ${itemId}`);
  }
  const filePath = itemFilePath(paths, boardId, itemId);
  if (!existsSync(filePath)) {
    throw new ItemError(`Item not found: ${itemId}`);
  }
}

function readItemFile(paths: WorkspacePaths, boardId: string, itemId: string): ItemConfig {
  assertItemOnBoard(paths, boardId, itemId);
  const raw = readFileSync(itemFilePath(paths, boardId, itemId), "utf8");
  return JSON.parse(raw) as ItemConfig;
}

function writeItemFile(
  paths: WorkspacePaths,
  boardId: string,
  item: ItemConfig,
): void {
  writeFileSync(
    itemFilePath(paths, boardId, item.id),
    `${JSON.stringify(item, null, 2)}\n`,
    "utf8",
  );
}

export function addItem(
  boardId: string,
  title: string,
  options: AddItemOptions = {},
  cwd: string = process.cwd(),
): ItemConfig {
  const paths = requireWorkspace(cwd);
  const board = getBoard(boardId, cwd);
  const status = options.status ?? board.statuses[0]!;
  assertBoardStatus(board, status);

  const existingIds = listItemIds(paths, boardId);
  const id = generateUniqueItemId(boardId, existingIds);
  const now = new Date().toISOString();
  const item: ItemConfig = {
    id,
    title,
    description: "",
    status,
    createdAt: now,
    updatedAt: now,
    subtasks: [],
  };

  writeItemFile(paths, boardId, item);
  recordItemCreated(boardDir(paths, boardId), boardId, id, now);
  return item;
}

export function listItems(
  boardId: string,
  filter: ListItemsFilter = {},
  cwd: string = process.cwd(),
): ItemConfig[] {
  const paths = requireWorkspace(cwd);
  getBoard(boardId, cwd);

  const dir = itemsDir(paths, boardId);
  if (!existsSync(dir)) {
    return [];
  }

  const items: ItemConfig[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) {
      continue;
    }
    const fullPath = join(dir, name);
    if (!statSync(fullPath).isFile()) {
      continue;
    }
    const raw = readFileSync(fullPath, "utf8");
    const item = JSON.parse(raw) as ItemConfig;
    if (filter.status !== undefined && item.status !== filter.status) {
      continue;
    }
    items.push(item);
  }

  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return items;
}

export function getItem(
  boardId: string,
  itemId: string,
  cwd: string = process.cwd(),
): ItemConfig {
  const paths = requireWorkspace(cwd);
  getBoard(boardId, cwd);
  return readItemFile(paths, boardId, itemId);
}

export function moveItem(
  boardId: string,
  itemId: string,
  status: string,
  cwd: string = process.cwd(),
): ItemConfig {
  const paths = requireWorkspace(cwd);
  const board = getBoard(boardId, cwd);
  assertBoardStatus(board, status);

  const item = readItemFile(paths, boardId, itemId);
  if (item.status === status) {
    return item;
  }

  const from = item.status;
  const now = new Date().toISOString();
  item.status = status;
  item.updatedAt = now;
  writeItemFile(paths, boardId, item);
  recordItemMoved(boardDir(paths, boardId), boardId, itemId, from, status, now);
  return item;
}

export function updateItem(
  boardId: string,
  itemId: string,
  patch: UpdateItemPatch,
  cwd: string = process.cwd(),
): ItemConfig {
  const paths = requireWorkspace(cwd);
  getBoard(boardId, cwd);

  const item = readItemFile(paths, boardId, itemId);
  let changed = false;

  if (patch.title !== undefined && patch.title !== item.title) {
    item.title = patch.title;
    changed = true;
  }
  if (
    patch.description !== undefined &&
    patch.description !== item.description
  ) {
    item.description = patch.description;
    changed = true;
  }
  if (patch.metadata !== undefined) {
    const prev = JSON.stringify(item.metadata ?? {});
    const next = JSON.stringify(patch.metadata);
    if (prev !== next) {
      item.metadata = patch.metadata;
      changed = true;
    }
  }

  if (!changed) {
    return item;
  }

  const now = new Date().toISOString();
  item.updatedAt = now;
  writeItemFile(paths, boardId, item);
  recordItemUpdated(boardDir(paths, boardId), boardId, itemId, now);
  return item;
}

export function removeItem(
  boardId: string,
  itemId: string,
  cwd: string = process.cwd(),
): void {
  const paths = requireWorkspace(cwd);
  getBoard(boardId, cwd);
  assertItemOnBoard(paths, boardId, itemId);

  const now = new Date().toISOString();
  recordItemDeleted(boardDir(paths, boardId), boardId, itemId, now);
  unlinkSync(itemFilePath(paths, boardId, itemId));
}

export function formatItemList(items: ItemConfig[]): string {
  if (items.length === 0) {
    return "No items found.";
  }

  const idWidth = Math.max(2, ...items.map((i) => i.id.length));
  const titleWidth = Math.max(5, ...items.map((i) => i.title.length));
  const header = `${"ID".padEnd(idWidth)}  ${"TITLE".padEnd(titleWidth)}  STATUS`;
  const rows = items.map((item) => {
    return `${item.id.padEnd(idWidth)}  ${item.title.padEnd(titleWidth)}  ${item.status}`;
  });
  return [header, ...rows].join("\n");
}

export function formatItemShow(item: ItemConfig): string {
  const lines = [
    `Item: ${item.id}`,
    `Title: ${item.title}`,
    `Status: ${item.status}`,
    `Created: ${item.createdAt}`,
    `Updated: ${item.updatedAt}`,
  ];

  if (item.description) {
    lines.push("", "Description:", item.description);
  }

  if (item.metadata && Object.keys(item.metadata).length > 0) {
    lines.push("", "Metadata:", JSON.stringify(item.metadata, null, 2));
  }

  lines.push("", `Subtasks: ${item.subtasks.length}`);
  return lines.join("\n");
}
