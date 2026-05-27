export type SliceType = "AFK" | "HITL";
export type IssueStatus = "Backlog" | "Todo" | "In Progress" | "In Review" | "Done" | "Canceled";

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: string;
  type: SliceType;
}

export interface BlockingRelation {
  blocker: string;
  blocked: string;
}

export interface Tier {
  afk: Issue[];
  hitl: Issue[];
}
