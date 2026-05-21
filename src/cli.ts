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

  program.parse(argv);
}
