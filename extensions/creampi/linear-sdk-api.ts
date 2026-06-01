import { LinearClient as SdkClient } from "@linear/sdk";
import type { LinearApi, RawIssue, RawRelations, IssueStatus } from "./linear-client.js";

export function createLinearSdkApi(apiKey?: string): LinearApi {
  const key = apiKey ?? process.env.LINEAR_API_KEY;
  if (!key) {
    throw new Error(
      "Missing Linear API key. Set LINEAR_API_KEY environment variable or pass apiKey to createLinearSdkApi.",
    );
  }

  const sdk = new SdkClient({ apiKey: key });

  return {
    async getIssue(id: string): Promise<RawIssue> {
      const issue = await sdk.issue(id);
      return toRawIssue(issue);
    },

    async listChildIssues(parentId: string): Promise<RawIssue[]> {
      const parent = await sdk.issue(parentId);
      const children = await parent.children();
      return Promise.all(children.nodes.map(toRawIssue));
    },

    async getIssueRelations(id: string): Promise<RawRelations> {
      const issue = await sdk.issue(id);

      // relations: this issue is the source (e.g. this issue blocks relatedIssue)
      const relations = await issue.relations();
      // inverseRelations: this issue is the target (e.g. relatedIssue blocks this issue)
      const inverseRelations = await issue.inverseRelations();

      const blocks: { id: string }[] = [];
      const blockedBy: { id: string }[] = [];

      for (const r of relations.nodes) {
        if (r.type === "blocks") {
          const related = await r.relatedIssue;
          blocks.push({ id: related.identifier });
        }
      }

      for (const r of inverseRelations.nodes) {
        if (r.type === "blocks") {
          const related = await r.issue;
          blockedBy.push({ id: related.identifier });
        }
      }

      return { blocks, blockedBy };
    },

    async updateIssueStatus(id: string, status: IssueStatus): Promise<void> {
      const issue = await sdk.issue(id);
      const team = await issue.team;
      if (!team) {
        throw new Error(`Issue ${id} has no team`);
      }

      const states = await team.states();
      const targetState = states.nodes.find((s) => s.name === status);
      if (!targetState) {
        throw new Error(
          `Workflow state "${status}" not found for team ${team.key}. Available: ${states.nodes.map((s) => s.name).join(", ")}`,
        );
      }

      await sdk.updateIssue(issue.id, { stateId: targetState.id });
    },
  };
}

async function toRawIssue(issue: any): Promise<RawIssue> {
  const state = await issue.state;
  const labels = await issue.labels();

  return {
    id: issue.identifier,
    title: issue.title ?? "",
    description: issue.description ?? "",
    status: state?.name ?? "Backlog",
    statusType: state?.type ?? "backlog",
    labels: (labels?.nodes ?? []).map((l: any) => l.name ?? ""),
  };
}
