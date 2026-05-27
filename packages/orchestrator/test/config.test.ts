import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../src/config.js";

function withTempConfig(yaml: string, fn: (path: string) => void) {
  const dir = join(tmpdir(), `creampi-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "config.yaml");
  writeFileSync(path, yaml);
  try {
    fn(path);
  } finally {
    rmSync(dir, { recursive: true });
  }
}

describe("loadConfig", () => {
  it("returns full defaults when no config file exists", () => {
    const config = loadConfig("/nonexistent/path/config.yaml");

    expect(config).toEqual({
      linear: { workspace: "", team: "" },
      models: { worker: "anthropic/claude-sonnet-4", reviewer: "anthropic/claude-opus-4" },
      workflow: { review: true, maxReviewRounds: 2 },
      branches: { pattern: "feature/{{issue-id}}-{{slug}}" },
      notify: { onTierComplete: true },
    });
  });

  it("loads and parses a valid YAML config file", () => {
    const yaml = `
linear:
  workspace: "beyond-data-consulting"
  team: "Engineering"
models:
  worker: "anthropic/claude-opus-4"
  reviewer: "anthropic/claude-opus-4"
workflow:
  review: false
  maxReviewRounds: 3
branches:
  pattern: "eng/{{issue-id}}"
notify:
  onTierComplete: false
`;
    withTempConfig(yaml, (path) => {
      const config = loadConfig(path);
      expect(config).toEqual({
        linear: { workspace: "beyond-data-consulting", team: "Engineering" },
        models: { worker: "anthropic/claude-opus-4", reviewer: "anthropic/claude-opus-4" },
        workflow: { review: false, maxReviewRounds: 3 },
        branches: { pattern: "eng/{{issue-id}}" },
        notify: { onTierComplete: false },
      });
    });
  });

  it("merges partial config with defaults", () => {
    const yaml = `
models:
  worker: "anthropic/claude-opus-4"
`;
    withTempConfig(yaml, (path) => {
      const config = loadConfig(path);
      expect(config.models.worker).toBe("anthropic/claude-opus-4");
      expect(config.models.reviewer).toBe("anthropic/claude-opus-4");
      expect(config.linear).toEqual({ workspace: "", team: "" });
      expect(config.workflow).toEqual({ review: true, maxReviewRounds: 2 });
      expect(config.branches).toEqual({ pattern: "feature/{{issue-id}}-{{slug}}" });
      expect(config.notify).toEqual({ onTierComplete: true });
    });
  });

  it("deep merges nested partial config", () => {
    const yaml = `
workflow:
  maxReviewRounds: 5
`;
    withTempConfig(yaml, (path) => {
      const config = loadConfig(path);
      expect(config.workflow.review).toBe(true);
      expect(config.workflow.maxReviewRounds).toBe(5);
    });
  });
});
