import { describe, it, expect } from "vitest";
import { renderPlan } from "../plan.js";
import type { CreampiConfig, WorktreeBaseDirResult } from "../config.js";
import type { Issue, Tier } from "../types.js";

function issue(id: string, type: "AFK" | "HITL" = "AFK"): Issue {
  return { id, title: `Issue ${id}`, description: "", type, status: "Backlog" };
}

function tier(afk: Issue[], hitl: Issue[] = []): Tier {
  return { afk, hitl };
}

const config: CreampiConfig = {
  models: { worker: "sonnet", reviewer: "opus" },
  workflow: { review: true, maxReviewRounds: 2, maxParallelWorkers: 4 },
  source: "/repo/.creampi.yaml",
};

const baseDir: WorktreeBaseDirResult = { path: "/home/dev/creampi-worktrees", origin: "config" };

describe("renderPlan", () => {
  it("shows the environment and the next actionable tier", () => {
    const tiers = [tier([issue("A"), issue("B")]), tier([issue("C")])];

    const text = renderPlan({ parentIssueId: "ENG-1", tiers, config, worktreeBaseDir: baseDir });

    expect(text).toContain("run-tier plan — ENG-1");
    expect(text).toContain("worktree base dir  /home/dev/creampi-worktrees  [config]");
    expect(text).toContain("Next tier: 1/2");
    expect(text).toContain("2 AFK slice(s)");
    expect(text).toContain("ENG-1"); // parent header; slice ids below
    expect(text).toContain("- A  Issue A");
    expect(text).toContain("- B  Issue B");
  });

  it("skips fully-done leading tiers and points at the first actionable one", () => {
    const tiers = [tier([], []), tier([issue("C")])];

    const text = renderPlan({ parentIssueId: "ENG-2", tiers, config, worktreeBaseDir: baseDir });

    expect(text).toContain("Next tier: 2/2");
    expect(text).toContain("- C  Issue C");
  });

  it("flags a HITL slice with a pause instruction", () => {
    const tiers = [tier([issue("A")], [issue("H", "HITL")])];

    const text = renderPlan({ parentIssueId: "ENG-3", tiers, config, worktreeBaseDir: baseDir });

    expect(text).toContain("1 HITL slice(s)");
    expect(text).toContain("- H  Issue H");
    expect(text).toContain("Resolve the HITL slice(s) above before the AFK slices dispatch.");
  });

  it("reports completion when every tier is empty", () => {
    const text = renderPlan({ parentIssueId: "ENG-4", tiers: [tier([], [])], config, worktreeBaseDir: baseDir });
    expect(text).toContain("All tiers complete");
  });

  it("labels a default-origin base dir and pi-default models", () => {
    const bareConfig: CreampiConfig = { models: {}, workflow: {}, source: null };
    const bareDir: WorktreeBaseDirResult = { path: "/home/dev/creampi-worktrees", origin: "default" };

    const text = renderPlan({ parentIssueId: "ENG-5", tiers: [tier([issue("A")])], config: bareConfig, worktreeBaseDir: bareDir });

    expect(text).toContain("config source      (built-in defaults)");
    expect(text).toContain("worker model       (pi default)");
    expect(text).toContain("[default]");
  });
});
