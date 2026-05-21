import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { recordBoardCreated } from "../history/index.js";
import {
  requireWorkspace,
  resolveWorkspace,
  type WorkspacePaths,
} from "../workspace/index.js";

export const DEFAULT_STATUSES = [
  "To Do",
  "In Progress",
  "Review",
  "Done",
] as const;

export type BoardConfig = {
  id: string;
  name: string;
  statuses: string[];
  createdAt: string;
  updatedAt: string;
};

export class BoardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoardError";
  }
}

const BOARD_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateBoardId(id: string): void {
  if (!id || id === "." || id === "..") {
    throw new BoardError(
      `Invalid board id "${id}": must be a lowercase alphanumeric slug (hyphens allowed).`,
    );
  }
  if (id.includes("/") || id.includes("\\")) {
    throw new BoardError(
      `Invalid board id "${id}": must not contain path separators.`,
    );
  }
  if (!BOARD_ID_PATTERN.test(id)) {
    throw new BoardError(
      `Invalid board id "${id}": use lowercase letters, numbers, and hyphens only (e.g. my-sprint).`,
    );
  }
}

function boardDir(paths: WorkspacePaths, id: string): string {
  return join(paths.boardsDir, id);
}

function boardConfigPath(paths: WorkspacePaths, id: string): string {
  return join(boardDir(paths, id), "board.json");
}

export function readBoardFile(paths: WorkspacePaths, id: string): BoardConfig {
  const configPath = boardConfigPath(paths, id);
  if (!existsSync(configPath)) {
    throw new BoardError(`Board not found: ${id}`);
  }
  const raw = readFileSync(configPath, "utf8");
  return JSON.parse(raw) as BoardConfig;
}

export function createBoard(
  id: string,
  statuses?: string[],
  cwd: string = process.cwd(),
): BoardConfig {
  const paths = requireWorkspace(cwd);
  validateBoardId(id);

  const dir = boardDir(paths, id);
  if (existsSync(dir)) {
    throw new BoardError(`Board already exists: ${id}`);
  }

  const columnStatuses =
    statuses && statuses.length > 0 ? [...statuses] : [...DEFAULT_STATUSES];
  const now = new Date().toISOString();
  const board: BoardConfig = {
    id,
    name: id,
    statuses: columnStatuses,
    createdAt: now,
    updatedAt: now,
  };

  mkdirSync(join(dir, "items"), { recursive: true });
  writeFileSync(
    join(dir, "board.json"),
    `${JSON.stringify(board, null, 2)}\n`,
    "utf8",
  );
  recordBoardCreated(dir, id, columnStatuses, now);

  return board;
}

export function listBoards(cwd: string = process.cwd()): BoardConfig[] {
  const paths = requireWorkspace(cwd);
  if (!existsSync(paths.boardsDir)) {
    return [];
  }

  const entries = readdirSync(paths.boardsDir, { withFileTypes: true });
  const boards: BoardConfig[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const configPath = join(paths.boardsDir, entry.name, "board.json");
    if (!existsSync(configPath)) {
      continue;
    }
    try {
      boards.push(readBoardFile(paths, entry.name));
    } catch {
      continue;
    }
  }

  boards.sort((a, b) => a.id.localeCompare(b.id));
  return boards;
}

export function getBoard(
  id: string,
  cwd: string = process.cwd(),
): BoardConfig {
  const paths = requireWorkspace(cwd);
  validateBoardId(id);
  return readBoardFile(paths, id);
}

export function formatBoardList(boards: BoardConfig[]): string {
  if (boards.length === 0) {
    return "No boards found.";
  }

  const idWidth = Math.max(2, ...boards.map((b) => b.id.length));
  const nameWidth = Math.max(4, ...boards.map((b) => b.name.length));
  const header = `${"ID".padEnd(idWidth)}  ${"NAME".padEnd(nameWidth)}  STATUSES`;
  const rows = boards.map((board) => {
    const statuses = board.statuses.join(" → ");
    return `${board.id.padEnd(idWidth)}  ${board.name.padEnd(nameWidth)}  ${statuses}`;
  });
  return [header, ...rows].join("\n");
}

export function formatBoardShow(
  board: BoardConfig,
  cwd: string = process.cwd(),
): string {
  const lines = [
    `Board: ${board.id}`,
    `Name: ${board.name}`,
    `Created: ${board.createdAt}`,
    `Updated: ${board.updatedAt}`,
    "",
    "Columns:",
  ];

  board.statuses.forEach((status, index) => {
    lines.push(`  ${index + 1}. ${status}`);
  });

  const itemsDir = join(resolveWorkspace(cwd).boardsDir, board.id, "items");
  let itemCount = 0;
  if (existsSync(itemsDir)) {
    itemCount = readdirSync(itemsDir).filter((name) => {
      const fullPath = join(itemsDir, name);
      return statSync(fullPath).isFile();
    }).length;
  }

  lines.push("", `Items: ${itemCount}`);
  return lines.join("\n");
}
