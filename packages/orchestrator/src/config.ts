import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";

export interface CreampiConfig {
  linear: { workspace: string; team: string };
  models: { worker: string; reviewer: string };
  workflow: { review: boolean; maxReviewRounds: number };
  branches: { pattern: string };
  notify: { onTierComplete: boolean };
}

const DEFAULTS: CreampiConfig = {
  linear: { workspace: "", team: "" },
  models: { worker: "anthropic/claude-sonnet-4", reviewer: "anthropic/claude-opus-4" },
  workflow: { review: true, maxReviewRounds: 2 },
  branches: { pattern: "feature/{{issue-id}}-{{slug}}" },
  notify: { onTierComplete: true },
};

export function loadConfig(configPath?: string): CreampiConfig {
  if (!configPath || !existsSync(configPath)) {
    return structuredClone(DEFAULTS);
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = parse(raw) ?? {};

  return deepMerge(DEFAULTS, parsed) as CreampiConfig;
}

function deepMerge(defaults: Record<string, any>, overrides: Record<string, any>): Record<string, any> {
  const result = structuredClone(defaults);
  for (const key of Object.keys(overrides)) {
    if (
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key]) &&
      typeof overrides[key] === "object" &&
      overrides[key] !== null &&
      !Array.isArray(overrides[key])
    ) {
      result[key] = deepMerge(result[key], overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}
