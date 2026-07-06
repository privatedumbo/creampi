import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  DEFAULT_WORKTREE_BASE_DIR,
  applyWorktreeBaseDir,
  describeWorktreeBaseDir,
  loadConfig,
  resolveWorktreeBaseDir,
} from "../config.js";

const tmpDirs: string[] = [];

function tmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "creampi-cfg-"));
  tmpDirs.push(dir);
  return dir;
}

function writeConfig(dir: string, body: string): void {
  fs.writeFileSync(path.join(dir, ".creampi.yaml"), body);
}

afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns built-in defaults when no config file exists", () => {
    const config = loadConfig(tmp(), tmp());
    expect(config.source).toBeNull();
    expect(config.models).toEqual({});
    expect(config.workflow).toEqual({});
  });

  it("prefers the project config over the home config", () => {
    const project = tmp();
    const home = tmp();
    writeConfig(project, "workflow:\n  worktreeBaseDir: /from/project\n");
    writeConfig(home, "workflow:\n  worktreeBaseDir: /from/home\n");

    const config = loadConfig(project, home);

    expect(config.source).toBe(path.join(project, ".creampi.yaml"));
    expect(config.workflow.worktreeBaseDir).toBe("/from/project");
  });

  it("falls back to the home config when the project has none", () => {
    const project = tmp();
    const home = tmp();
    writeConfig(home, "models:\n  worker: sonnet\n");

    const config = loadConfig(project, home);

    expect(config.source).toBe(path.join(home, ".creampi.yaml"));
    expect(config.models.worker).toBe("sonnet");
  });
});

describe("resolveWorktreeBaseDir", () => {
  it("uses the built-in default when nothing is configured", () => {
    const config = loadConfig(tmp(), tmp());
    const expected = path.join(os.homedir(), DEFAULT_WORKTREE_BASE_DIR.slice(2));
    expect(resolveWorktreeBaseDir(config, {})).toBe(expected);
  });

  it("expands a ~-relative config value to an absolute path", () => {
    const config = loadConfig(tmp(), tmp());
    config.workflow.worktreeBaseDir = "~/somewhere";
    expect(resolveWorktreeBaseDir(config, {})).toBe(path.join(os.homedir(), "somewhere"));
  });

  it("lets an explicit env override win over the config", () => {
    const config = loadConfig(tmp(), tmp());
    config.workflow.worktreeBaseDir = "/from/config";
    const resolved = resolveWorktreeBaseDir(config, { PI_SUBAGENTS_WORKTREE_DIR: "/from/env" });
    expect(resolved).toBe("/from/env");
  });
});

describe("describeWorktreeBaseDir", () => {
  it("reports the origin of the resolved value", () => {
    const config = loadConfig(tmp(), tmp());
    expect(describeWorktreeBaseDir(config, {}).origin).toBe("default");

    config.workflow.worktreeBaseDir = "/x";
    expect(describeWorktreeBaseDir(config, {}).origin).toBe("config");
    expect(describeWorktreeBaseDir(config, { PI_SUBAGENTS_WORKTREE_DIR: "/y" }).origin).toBe("env");
  });
});

describe("applyWorktreeBaseDir", () => {
  it("creates the dir and exports it as PI_SUBAGENTS_WORKTREE_DIR", () => {
    const base = tmp();
    const target = path.join(base, "worktrees");
    const config = loadConfig(tmp(), tmp());
    config.workflow.worktreeBaseDir = target;
    const env: NodeJS.ProcessEnv = {};

    const result = applyWorktreeBaseDir(config, env);

    expect(result.path).toBe(target);
    expect(env.PI_SUBAGENTS_WORKTREE_DIR).toBe(target);
    expect(fs.existsSync(target)).toBe(true);
  });
});
