import { appendFileSync } from "node:fs";
import { join } from "node:path";

export type BoardCreatedEvent = {
  at: string;
  type: "board.created";
  boardId: string;
  statuses: string[];
};

export type ItemCreatedEvent = {
  at: string;
  type: "item.created";
  boardId: string;
  itemId: string;
};

export type ItemUpdatedEvent = {
  at: string;
  type: "item.updated";
  boardId: string;
  itemId: string;
};

export type ItemMovedEvent = {
  at: string;
  type: "item.moved";
  boardId: string;
  itemId: string;
  from: string;
  to: string;
};

export type ItemDeletedEvent = {
  at: string;
  type: "item.deleted";
  boardId: string;
  itemId: string;
};

export type HistoryEvent =
  | BoardCreatedEvent
  | ItemCreatedEvent
  | ItemUpdatedEvent
  | ItemMovedEvent
  | ItemDeletedEvent;

export function appendHistoryEvent(
  boardDir: string,
  event: HistoryEvent,
): void {
  const historyPath = join(boardDir, "history.jsonl");
  appendFileSync(historyPath, `${JSON.stringify(event)}\n`, "utf8");
}

/** @deprecated Use appendHistoryEvent */
export function appendBoardEvent(
  boardDir: string,
  event: BoardCreatedEvent,
): void {
  appendHistoryEvent(boardDir, event);
}

export function recordBoardCreated(
  boardDir: string,
  boardId: string,
  statuses: string[],
  at: string,
): void {
  appendHistoryEvent(boardDir, {
    at,
    type: "board.created",
    boardId,
    statuses,
  });
}

export function recordItemCreated(
  boardDir: string,
  boardId: string,
  itemId: string,
  at: string,
): void {
  appendHistoryEvent(boardDir, {
    at,
    type: "item.created",
    boardId,
    itemId,
  });
}

export function recordItemUpdated(
  boardDir: string,
  boardId: string,
  itemId: string,
  at: string,
): void {
  appendHistoryEvent(boardDir, {
    at,
    type: "item.updated",
    boardId,
    itemId,
  });
}

export function recordItemMoved(
  boardDir: string,
  boardId: string,
  itemId: string,
  from: string,
  to: string,
  at: string,
): void {
  appendHistoryEvent(boardDir, {
    at,
    type: "item.moved",
    boardId,
    itemId,
    from,
    to,
  });
}

export function recordItemDeleted(
  boardDir: string,
  boardId: string,
  itemId: string,
  at: string,
): void {
  appendHistoryEvent(boardDir, {
    at,
    type: "item.deleted",
    boardId,
    itemId,
  });
}
