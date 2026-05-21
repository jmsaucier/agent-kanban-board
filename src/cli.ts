import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createBoard,
  formatBoardList,
  formatBoardShow,
  getBoard,
  listBoards,
} from "./board/index.js";
import {
  addItem,
  formatItemList,
  formatItemShow,
  getItem,
  ItemError,
  listItems,
  moveItem,
  removeItem,
  updateItem,
} from "./item/index.js";
import { initWorkspace } from "./workspace/index.js";

const packageJson = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
    "utf8",
  ),
) as { version: string };

function handleCommandError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
}

export function runCli(argv: string[]): void {
  const program = new Command();

  program
    .name("akb")
    .description("CLI for agent kanban board")
    .version(packageJson.version);

  program
    .command("init")
    .description("Create .akb/ workspace in the current directory")
    .option("--gitignore", "Append .akb/ to .gitignore")
    .action((options: { gitignore?: boolean }) => {
      try {
        initWorkspace({ gitignore: options.gitignore });
        console.log("Workspace initialized at .akb/");
      } catch (err) {
        handleCommandError(err);
      }
    });

  const board = program
    .command("board")
    .description("Manage kanban boards");

  board
    .command("create")
    .description("Create a new board")
    .argument("<id>", "Board id (filesystem-safe slug)")
    .option(
      "--status <name>",
      "Column status (repeat for order; default: To Do, In Progress, Review, Done)",
      (value: string, previous: string[]) => previous.concat([value]),
      [] as string[],
    )
    .action((id: string, options: { status: string[] }) => {
      try {
        const statuses =
          options.status.length > 0 ? options.status : undefined;
        const created = createBoard(id, statuses);
        console.log(`Board created: ${created.id}`);
        console.log(`Columns: ${created.statuses.join(" → ")}`);
      } catch (err) {
        handleCommandError(err);
      }
    });

  board
    .command("list")
    .description("List all boards")
    .action(() => {
      try {
        const boards = listBoards();
        console.log(formatBoardList(boards));
      } catch (err) {
        handleCommandError(err);
      }
    });

  board
    .command("show")
    .description("Show board details")
    .argument("<id>", "Board id")
    .action((id: string) => {
      try {
        const board = getBoard(id);
        console.log(formatBoardShow(board));
      } catch (err) {
        handleCommandError(err);
      }
    });

  const item = program.command("item").description("Manage kanban items");

  item
    .command("add")
    .description("Create a new item")
    .argument("<board>", "Board id")
    .argument("<title>", "Item title")
    .option("--status <name>", "Initial column status (default: first board column)")
    .action((boardId: string, title: string, options: { status?: string }) => {
      try {
        const created = addItem(boardId, title, {
          status: options.status,
        });
        console.log(`Item created: ${created.id}`);
        console.log(`Status: ${created.status}`);
      } catch (err) {
        handleCommandError(err);
      }
    });

  item
    .command("list")
    .description("List items on a board")
    .argument("<board>", "Board id")
    .option("--status <name>", "Filter by status")
    .action((boardId: string, options: { status?: string }) => {
      try {
        const items = listItems(boardId, { status: options.status });
        console.log(formatItemList(items));
      } catch (err) {
        handleCommandError(err);
      }
    });

  item
    .command("show")
    .description("Show one item")
    .argument("<board>", "Board id")
    .argument("<item>", "Item id")
    .action((boardId: string, itemId: string) => {
      try {
        const itemConfig = getItem(boardId, itemId);
        console.log(formatItemShow(itemConfig));
      } catch (err) {
        handleCommandError(err);
      }
    });

  item
    .command("move")
    .description("Move item to a column status")
    .argument("<board>", "Board id")
    .argument("<item>", "Item id")
    .argument("<status>", "Target status")
    .action((boardId: string, itemId: string, status: string) => {
      try {
        const moved = moveItem(boardId, itemId, status);
        console.log(`Item moved: ${moved.id}`);
        console.log(`Status: ${moved.status}`);
      } catch (err) {
        handleCommandError(err);
      }
    });

  item
    .command("update")
    .description("Update item title, description, or metadata")
    .argument("<board>", "Board id")
    .argument("<item>", "Item id")
    .option("--title <value>", "New title")
    .option("--description <value>", "New description")
    .option("--metadata <json>", "Metadata object as JSON")
    .action(
      (
        boardId: string,
        itemId: string,
        options: {
          title?: string;
          description?: string;
          metadata?: string;
        },
      ) => {
        try {
          if (
            options.title === undefined &&
            options.description === undefined &&
            options.metadata === undefined
          ) {
            throw new ItemError(
              "Provide at least one of --title, --description, or --metadata.",
            );
          }

          let metadata: Record<string, unknown> | undefined;
          if (options.metadata !== undefined) {
            try {
              metadata = JSON.parse(options.metadata) as Record<string, unknown>;
            } catch {
              throw new ItemError("--metadata must be valid JSON.");
            }
            if (
              metadata === null ||
              typeof metadata !== "object" ||
              Array.isArray(metadata)
            ) {
              throw new ItemError("--metadata must be a JSON object.");
            }
          }

          const updated = updateItem(boardId, itemId, {
            title: options.title,
            description: options.description,
            metadata,
          });
          console.log(`Item updated: ${updated.id}`);
        } catch (err) {
          handleCommandError(err);
        }
      },
    );

  item
    .command("remove")
    .description("Delete an item")
    .argument("<board>", "Board id")
    .argument("<item>", "Item id")
    .action((boardId: string, itemId: string) => {
      try {
        removeItem(boardId, itemId);
        console.log(`Item removed: ${itemId}`);
      } catch (err) {
        handleCommandError(err);
      }
    });

  program.parse(argv);
}
