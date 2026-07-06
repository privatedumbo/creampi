import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";

// Where isolated worktrees live when the user hasn't chosen. A stable dir under
// $HOME, not the OS temp dir — temp-dir worktrees are the fragile case where
// isolation silently degrades (cleanup races, tmp reaping), which is exactly the
// failure this default exists to prevent.
export const DEFAULT_WORKTREE_BASE_DIR = "~/creampi-worktrees";

export interface CreampiModels {
  worker?: string;
  reviewer?: string;
}

export interface CreampiWorkflow {
  review?: boolean;
  maxReviewRounds?: number;
  maxParallelWorkers?: number;
  // Base directory for pi-subagents worktree isolation. creampi owns this
  // config surface (the value the user sets); pi-subagents owns the mechanism
  // (creating/cleaning the worktrees). We bridge the two by exporting the
  // resolved value as PI_SUBAGENTS_WORKTREE_DIR, the published override that
  // pi-subagents reads. See ADR 0005.
  worktreeBaseDir?: string;
}

export interface CreampiConfig {
  models: CreampiModels;
  workflow: CreampiWorkflow;
  // Absolute path the config was loaded from, or null when defaults were used.
  source: string | null;
}

const CONFIG_FILENAME = ".creampi.yaml";

function expandHome(dir: string): string {
  if (dir === "~") return os.homedir();
  if (dir.startsWith("~/")) return path.join(os.homedir(), dir.slice(2));
  return dir;
}

function readYamlIfPresent(filePath: string): Record<string, unknown> | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const parsed = parseYaml(fs.readFileSync(filePath, "utf-8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${filePath} must be a YAML mapping`);
  }
  return parsed as Record<string, unknown>;
}

// Project config wins over home config (nearest to the work), matching the
// run-tier skill's own project → home → defaults fallback.
export function resolveConfigPath(cwd: string, home: string): string | null {
  const projectConfig = path.join(cwd, CONFIG_FILENAME);
  if (fs.existsSync(projectConfig)) return projectConfig;
  const homeConfig = path.join(home, CONFIG_FILENAME);
  if (fs.existsSync(homeConfig)) return homeConfig;
  return null;
}

export function loadConfig(cwd: string = process.cwd(), home: string = os.homedir()): CreampiConfig {
  const source = resolveConfigPath(cwd, home);
  const raw = source ? readYamlIfPresent(source) ?? {} : {};
  const models = (raw.models as CreampiModels | undefined) ?? {};
  const workflow = (raw.workflow as CreampiWorkflow | undefined) ?? {};
  return { models, workflow, source };
}

// The base dir creampi will hand to pi-subagents, fully resolved to an absolute
// path. Precedence: an already-set PI_SUBAGENTS_WORKTREE_DIR (an explicit
// operator override) wins, then .creampi.yaml, then the built-in default.
export function resolveWorktreeBaseDir(config: CreampiConfig, env: NodeJS.ProcessEnv = process.env): string {
  const chosen = env.PI_SUBAGENTS_WORKTREE_DIR?.trim() || config.workflow.worktreeBaseDir?.trim() || DEFAULT_WORKTREE_BASE_DIR;
  return path.resolve(expandHome(chosen));
}

export interface WorktreeBaseDirResult {
  path: string;
  origin: "env" | "config" | "default";
}

export function describeWorktreeBaseDir(config: CreampiConfig, env: NodeJS.ProcessEnv = process.env): WorktreeBaseDirResult {
  const origin: WorktreeBaseDirResult["origin"] = env.PI_SUBAGENTS_WORKTREE_DIR?.trim()
    ? "env"
    : config.workflow.worktreeBaseDir?.trim()
      ? "config"
      : "default";
  return { path: resolveWorktreeBaseDir(config, env), origin };
}

// Point pi-subagents at the resolved base dir by exporting its published
// override, and create the directory so the first parallel dispatch doesn't
// race on mkdir. Idempotent: safe to call once per session at activation.
export function applyWorktreeBaseDir(config: CreampiConfig, env: NodeJS.ProcessEnv = process.env): WorktreeBaseDirResult {
  const result = describeWorktreeBaseDir(config, env);
  fs.mkdirSync(result.path, { recursive: true });
  env.PI_SUBAGENTS_WORKTREE_DIR = result.path;
  return result;
}
