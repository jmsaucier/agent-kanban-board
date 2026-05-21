import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  initWorkspace,
  readConfig,
  requireWorkspace,
  resolveWorkspace,
  WorkspaceError,
} from "../src/workspace/index.js";
import { createTempDir, removeTempDir } from "./helpers/temp-dir.js";

describe("workspace", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    removeTempDir(cwd);
  });

  it("resolveWorkspace returns paths under cwd", () => {
    const paths = resolveWorkspace(cwd);
    expect(paths.cwd).toBe(cwd);
    expect(paths.root).toBe(join(cwd, ".akb"));
    expect(paths.configPath).toBe(join(cwd, ".akb", "config.json"));
    expect(paths.boardsDir).toBe(join(cwd, ".akb", "boards"));
  });

  it("requireWorkspace throws when not initialized", () => {
    expect(() => requireWorkspace(cwd)).toThrow(WorkspaceError);
    expect(() => requireWorkspace(cwd)).toThrow(
      "Workspace not initialized. Run `akb init` in this directory first.",
    );
  });

  it("initWorkspace creates layout and config", () => {
    initWorkspace({ cwd });
    const paths = resolveWorkspace(cwd);

    expect(existsSync(paths.root)).toBe(true);
    expect(existsSync(paths.boardsDir)).toBe(true);
    expect(existsSync(paths.configPath)).toBe(true);

    const config = readConfig(paths);
    expect(config.version).toBe(1);
    expect(config.initializedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("initWorkspace is idempotent and preserves config", () => {
    initWorkspace({ cwd });
    const first = readConfig(resolveWorkspace(cwd));

    initWorkspace({ cwd });
    const second = readConfig(resolveWorkspace(cwd));

    expect(second).toEqual(first);
  });

  it("requireWorkspace succeeds after init", () => {
    initWorkspace({ cwd });
    expect(() => requireWorkspace(cwd)).not.toThrow();
  });

  it("initWorkspace --gitignore appends .akb/ once", () => {
    initWorkspace({ cwd, gitignore: true });
    initWorkspace({ cwd, gitignore: true });

    const gitignore = readFileSync(join(cwd, ".gitignore"), "utf8");
    const matches = gitignore
      .split(/\r?\n/)
      .filter((line) => line.trim() === ".akb/");
    expect(matches).toHaveLength(1);
  });

  it("initWorkspace --gitignore creates .gitignore when missing", () => {
    initWorkspace({ cwd, gitignore: true });
    expect(readFileSync(join(cwd, ".gitignore"), "utf8")).toBe(".akb/\n");
  });

  it("initWorkspace --gitignore preserves existing entries", () => {
    writeFileSync(join(cwd, ".gitignore"), "node_modules/\n", "utf8");

    initWorkspace({ cwd, gitignore: true });

    const gitignore = readFileSync(join(cwd, ".gitignore"), "utf8");
    expect(gitignore).toContain("node_modules/");
    expect(gitignore).toContain(".akb/");
  });
});
