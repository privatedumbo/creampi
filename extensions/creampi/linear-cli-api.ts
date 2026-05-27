import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LinearApi, RawIssue, RawRelations, IssueStatus } from "./linear-client.js";

const exec = promisify(execFile);

const STATUS_TO_STATE: Record<IssueStatus, string> = {
  Backlog: "Backlog",
  Todo: "Todo",
  "In Progress": "In Progress",
  "In Review": "In Review",
  Done: "Done",
  Canceled: "Canceled",
};

export function createLinearCliApi(cliPath?: string): LinearApi {
  const cli = cliPath ?? "linear-cli";

  async function run(...args: string[]): Promise<any> {
    const { stdout } = await exec(cli, args);
    const result = JSON.parse(stdout);
    if (!result.ok) {
      throw new Error(`Linear CLI error: ${result.error?.message ?? "unknown"}`);
    }
    return result;
  }

  return {
    async getIssue(id: string): Promise<RawIssue> {
      const result = await run("issue", "get", "--id", id);
      return mapIssue(result.issue);
    },

    async listChildIssues(parentId: string): Promise<RawIssue[]> {
      const parent = await run("issue", "get", "--id", parentId);
      const parentUuid = parent.issue.id;

      const isUuid = parentId.includes("-") && parentId.length > 10;
      const filterUuid = isUuid ? parentId : parentUuid;

      const result = await run("issue", "list", "--team", parent.issue.team, "--parent-id", filterUuid);
      return (result.issues ?? []).map(mapIssue);
    },

    async getIssueRelations(id: string): Promise<RawRelations> {
      const result = await run("issue", "get", "--id", id, "--include-relations");
      const relations = result.issue.relations ?? {};
      return {
        blocks: (relations.blocks ?? []).map((r: any) => ({ id: r.id })),
        blockedBy: (relations.blockedBy ?? []).map((r: any) => ({ id: r.id })),
      };
    },

    async updateIssueStatus(id: string, status: IssueStatus): Promise<void> {
      const state = STATUS_TO_STATE[status];
      await run("issue", "save", "--id", id, "--state", state);
    },
  };
}

function mapIssue(raw: any): RawIssue {
  return {
    id: raw.id,
    title: raw.title ?? "",
    description: raw.description ?? "",
    status: raw.status ?? "Backlog",
    statusType: raw.statusType ?? "backlog",
    labels: (raw.labels ?? []).map((l: any) => (typeof l === "string" ? l : l.name ?? "")),
  };
}
