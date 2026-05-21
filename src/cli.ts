import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageJson = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
    "utf8",
  ),
) as { version: string };

export function runCli(argv: string[]): void {
  const program = new Command();

  program
    .name("agent-kanban")
    .description("CLI for agent kanban board")
    .version(packageJson.version);

  program
    .command("hello")
    .description("Print a greeting")
    .argument("[name]", "Name to greet", "world")
    .action((name: string) => {
      console.log(`Hello, ${name}!`);
    });

  program.parse(argv);
}
