// src/config.ts
import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
var DEFAULTS = {
  linear: { workspace: "", team: "" },
  models: { worker: "anthropic/claude-sonnet-4", reviewer: "anthropic/claude-opus-4" },
  workflow: { review: true, maxReviewRounds: 2 },
  branches: { pattern: "feature/{{issue-id}}-{{slug}}" },
  notify: { onTierComplete: true }
};
function loadConfig(configPath) {
  if (!configPath || !existsSync(configPath)) {
    return structuredClone(DEFAULTS);
  }
  const raw = readFileSync(configPath, "utf-8");
  const parsed = parse(raw) ?? {};
  return deepMerge(DEFAULTS, parsed);
}
function deepMerge(defaults, overrides) {
  const result = structuredClone(defaults);
  for (const key of Object.keys(overrides)) {
    if (typeof result[key] === "object" && result[key] !== null && !Array.isArray(result[key]) && typeof overrides[key] === "object" && overrides[key] !== null && !Array.isArray(overrides[key])) {
      result[key] = deepMerge(result[key], overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}
export {
  loadConfig
};
//# sourceMappingURL=index.js.map