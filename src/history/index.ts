import { appendFileSync } from "node:fs";
import { join } from "node:path";

export type BoardCreatedEvent = {
  at: string;
  type: "board.created";
  boardId: string;
  statuses: string[];
};

export function appendBoardEvent(
  boardDir: string,
  event: BoardCreatedEvent,
): void {
  const historyPath = join(boardDir, "history.jsonl");
  appendFileSync(historyPath, `${JSON.stringify(event)}\n`, "utf8");
}

export function recordBoardCreated(
  boardDir: string,
  boardId: string,
  statuses: string[],
  at: string,
): void {
  appendBoardEvent(boardDir, {
    at,
    type: "board.created",
    boardId,
    statuses,
  });
}
