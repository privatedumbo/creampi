import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface PrResult {
  url: string;
  number: number;
}

export interface CiStatus {
  pr: number;
  passing: boolean;
  checks: { name: string; status: string; conclusion: string }[];
}

export interface MergeStatus {
  pr: number;
  merged: boolean;
  state: string;
}

async function gh(...args: string[]): Promise<string> {
  const { stdout } = await exec("gh", args);
  return stdout.trim();
}

export async function openPr(branch: string, issueId: string, issueTitle: string): Promise<PrResult> {
  const title = `${issueId}: ${issueTitle}`;
  const body = `Closes ${issueId}`;
  // `gh pr create` does not support --json; on success it prints the new PR URL to stdout.
  const createOutput = await gh("pr", "create", "--head", branch, "--title", title, "--body", body);
  const url = createOutput.split("\n").map((line) => line.trim()).filter(Boolean).pop() ?? createOutput;
  // Read back structured metadata for the PR we just created.
  const output = await gh("pr", "view", url, "--json", "url,number");
  const parsed = JSON.parse(output);
  return { url: parsed.url, number: parsed.number };
}

export async function checkCi(prNumber: number): Promise<CiStatus> {
  try {
    const output = await gh("pr", "checks", String(prNumber), "--json", "name,state,conclusion");
    const checks = JSON.parse(output);
    const passing = checks.length > 0 && checks.every((c: any) => c.conclusion === "SUCCESS" || c.state === "SUCCESS");
    return {
      pr: prNumber,
      passing,
      checks: checks.map((c: any) => ({
        name: c.name ?? "",
        status: c.state ?? "",
        conclusion: c.conclusion ?? "",
      })),
    };
  } catch {
    return { pr: prNumber, passing: false, checks: [] };
  }
}

export async function checkMerge(prNumber: number): Promise<MergeStatus> {
  const output = await gh("pr", "view", String(prNumber), "--json", "state,merged");
  const parsed = JSON.parse(output);
  return {
    pr: prNumber,
    merged: parsed.merged === true || parsed.state === "MERGED",
    state: parsed.state ?? "OPEN",
  };
}
