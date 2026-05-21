import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type WorkspaceConfig = {
  version: number;
  initializedAt: string;
};

export type WorkspacePaths = {
  cwd: string;
  root: string;
  configPath: string;
  boardsDir: string;
};

export class WorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export function resolveWorkspace(cwd: string = process.cwd()): WorkspacePaths {
  const root = join(cwd, ".akb");
  return {
    cwd,
    root,
    configPath: join(root, "config.json"),
    boardsDir: join(root, "boards"),
  };
}

export function readConfig(paths: WorkspacePaths): WorkspaceConfig {
  const raw = readFileSync(paths.configPath, "utf8");
  return JSON.parse(raw) as WorkspaceConfig;
}

export function requireWorkspace(cwd: string = process.cwd()): WorkspacePaths {
  const paths = resolveWorkspace(cwd);
  if (!existsSync(paths.root) || !existsSync(paths.configPath)) {
    throw new WorkspaceError(
      "Workspace not initialized. Run `akb init` in this directory first.",
    );
  }
  return paths;
}

export type InitWorkspaceOptions = {
  cwd?: string;
  gitignore?: boolean;
};

export function initWorkspace(options: InitWorkspaceOptions = {}): void {
  const cwd = options.cwd ?? process.cwd();
  const paths = resolveWorkspace(cwd);

  mkdirSync(paths.root, { recursive: true });
  mkdirSync(paths.boardsDir, { recursive: true });

  if (!existsSync(paths.configPath)) {
    const config: WorkspaceConfig = {
      version: 1,
      initializedAt: new Date().toISOString(),
    };
    writeFileSync(paths.configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }

  if (options.gitignore) {
    appendGitignoreEntry(cwd);
  }
}

function appendGitignoreEntry(cwd: string): void {
  const gitignorePath = join(cwd, ".gitignore");
  const entry = ".akb/";

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf8");
    const lines = content.split(/\r?\n/);
    if (lines.some((line) => line.trim() === entry)) {
      return;
    }
    const suffix = content.endsWith("\n") ? "" : "\n";
    writeFileSync(gitignorePath, `${content}${suffix}${entry}\n`, "utf8");
    return;
  }

  writeFileSync(gitignorePath, `${entry}\n`, "utf8");
}
