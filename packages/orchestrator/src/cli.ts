import { resolve } from "node:path";
import { loadConfig } from "./config.js";

const args = process.argv.slice(2);
const command = args[0];
const issueId = args[1];

if (command !== "run" || !issueId) {
  console.error("Usage: creampi run <issue-id>");
  console.error("Example: creampi run ENG-42");
  process.exit(1);
}

const configPath = resolve(process.cwd(), ".creampi", "config.yaml");
const config = loadConfig(configPath);

console.log(`\n🍦 creampi v0.1.0\n`);
console.log(`Issue:  ${issueId}`);
console.log(`Config: ${JSON.stringify(config, null, 2)}\n`);
console.log("Orchestrator not yet implemented. Coming soon.");
