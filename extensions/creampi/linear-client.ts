import type { Issue, BlockingRelation, IssueStatus, SliceType } from "./types.js";

export type { IssueStatus, SliceType, Issue, BlockingRelation };

export interface RawIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  statusType: string;
  labels: string[];
}

export interface RawRelations {
  blocks: { id: string }[];
  blockedBy: { id: string }[];
}

export interface LinearApi {
  getIssue(id: string): Promise<RawIssue>;
  listChildIssues(parentId: string): Promise<RawIssue[]>;
  getIssueRelations(id: string): Promise<RawRelations>;
  updateIssueStatus(id: string, status: IssueStatus): Promise<void>;
}

const HITL_LABEL = "hitl";

export class LinearClient {
  constructor(private api: LinearApi) {}

  async getParentIssue(id: string): Promise<Issue> {
    const raw = await this.api.getIssue(id);
    return this.toIssue(raw);
  }

  async getChildIssues(parentId: string): Promise<Issue[]> {
    const raw = await this.api.listChildIssues(parentId);
    return raw.map((r) => this.toIssue(r));
  }

  async getBlockingRelations(issueIds: string[]): Promise<BlockingRelation[]> {
    const relations: BlockingRelation[] = [];
    const seen = new Set<string>();

    for (const id of issueIds) {
      const raw = await this.api.getIssueRelations(id);
      for (const blocker of raw.blockedBy) {
        const key = `${blocker.id}->${id}`;
        if (!seen.has(key) && issueIds.includes(blocker.id)) {
          seen.add(key);
          relations.push({ blocker: blocker.id, blocked: id });
        }
      }
    }

    return relations;
  }

  async updateStatus(issueId: string, status: IssueStatus): Promise<void> {
    await this.api.updateIssueStatus(issueId, status);
  }

  private toIssue(raw: RawIssue): Issue {
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      status: raw.status,
      type: raw.labels.some((l) => l.toLowerCase() === HITL_LABEL) ? "HITL" : "AFK",
    };
  }
}
