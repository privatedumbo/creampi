#!/usr/bin/env node

// src/cli.ts
import { resolve } from "path";

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
function loadConfig(configPath2) {
  if (!configPath2 || !existsSync(configPath2)) {
    return structuredClone(DEFAULTS);
  }
  const raw = readFileSync(configPath2, "utf-8");
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

// src/cli.ts
var args = process.argv.slice(2);
var command = args[0];
var issueId = args[1];
if (command !== "run" || !issueId) {
  console.error("Usage: creampi run <issue-id>");
  console.error("Example: creampi run ENG-42");
  process.exit(1);
}
var configPath = resolve(process.cwd(), ".creampi", "config.yaml");
var config = loadConfig(configPath);
console.log(`
\u{1F366} creampi v0.1.0
`);
console.log(`Issue:  ${issueId}`);
console.log(`Config: ${JSON.stringify(config, null, 2)}
`);
console.log("Orchestrator not yet implemented. Coming soon.");
//# sourceMappingURL=cli.js.map