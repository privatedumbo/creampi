import { describe, it, expect } from "vitest";
import { LinearClient, type LinearApi, type IssueStatus } from "../linear-client.js";

function createMockApi(overrides: Partial<LinearApi> = {}): LinearApi {
  return {
    getIssue: async () => ({ id: "ENG-1", title: "Test", description: "", status: "Backlog", statusType: "backlog", labels: [] }),
    listChildIssues: async () => [],
    getIssueRelations: async () => ({ blocks: [], blockedBy: [] }),
    updateIssueStatus: async () => {},
    ...overrides,
  };
}

describe("LinearClient", () => {
  describe("getChildIssues", () => {
    it("returns typed child issues with AFK classification by default", async () => {
      const api = createMockApi({
        getIssue: async () => ({
          id: "ENG-1",
          title: "Parent",
          description: "The parent PRD",
          status: "In Progress",
          statusType: "started",
          labels: [],
        }),
        listChildIssues: async () => [
          { id: "ENG-2", title: "Child A", description: "Do A", status: "Backlog", statusType: "backlog", labels: [] },
          { id: "ENG-3", title: "Child B", description: "Do B", status: "Todo", statusType: "unstarted", labels: [] },
        ],
      });

      const client = new LinearClient(api);
      const children = await client.getChildIssues("ENG-1");

      expect(children).toEqual([
        { id: "ENG-2", title: "Child A", description: "Do A", status: "Backlog", type: "AFK" },
        { id: "ENG-3", title: "Child B", description: "Do B", status: "Todo", type: "AFK" },
      ]);
    });

    it("classifies issues with hitl label as HITL slices", async () => {
      const api = createMockApi({
        listChildIssues: async () => [
          { id: "ENG-2", title: "AFK task", description: "", status: "Backlog", statusType: "backlog", labels: ["feature"] },
          { id: "ENG-3", title: "HITL task", description: "", status: "Backlog", statusType: "backlog", labels: ["hitl"] },
          { id: "ENG-4", title: "Also HITL", description: "", status: "Backlog", statusType: "backlog", labels: ["HITL", "feature"] },
        ],
      });

      const client = new LinearClient(api);
      const children = await client.getChildIssues("ENG-1");

      expect(children[0].type).toBe("AFK");
      expect(children[1].type).toBe("HITL");
      expect(children[2].type).toBe("HITL");
    });
  });

  describe("getBlockingRelations", () => {
    it("returns blocking relations between the given issues", async () => {
      const api = createMockApi({
        getIssueRelations: async (id: string) => {
          if (id === "ENG-3") return { blocks: [], blockedBy: [{ id: "ENG-2" }] };
          if (id === "ENG-4") return { blocks: [], blockedBy: [{ id: "ENG-2" }, { id: "ENG-3" }] };
          return { blocks: [], blockedBy: [] };
        },
      });

      const client = new LinearClient(api);
      const relations = await client.getBlockingRelations(["ENG-2", "ENG-3", "ENG-4"]);

      expect(relations).toEqual([
        { blocker: "ENG-2", blocked: "ENG-3" },
        { blocker: "ENG-2", blocked: "ENG-4" },
        { blocker: "ENG-3", blocked: "ENG-4" },
      ]);
    });

    it("excludes relations involving issues outside the given set", async () => {
      const api = createMockApi({
        getIssueRelations: async () => {
          return { blocks: [], blockedBy: [{ id: "ENG-99" }] };
        },
      });

      const client = new LinearClient(api);
      const relations = await client.getBlockingRelations(["ENG-2", "ENG-3"]);

      expect(relations).toEqual([]);
    });
  });

  describe("getParentIssue", () => {
    it("returns a typed parent issue", async () => {
      const api = createMockApi({
        getIssue: async () => ({
          id: "ENG-1",
          title: "Parent PRD",
          description: "The big feature",
          status: "In Progress",
          statusType: "started",
          labels: [],
        }),
      });

      const client = new LinearClient(api);
      const issue = await client.getParentIssue("ENG-1");

      expect(issue).toEqual({
        id: "ENG-1",
        title: "Parent PRD",
        description: "The big feature",
        status: "In Progress",
        type: "AFK",
      });
    });
  });

  describe("updateStatus", () => {
    it("delegates to the API with the correct status", async () => {
      const calls: { id: string; status: IssueStatus }[] = [];
      const api = createMockApi({
        updateIssueStatus: async (id: string, status: IssueStatus) => {
          calls.push({ id, status });
        },
      });

      const client = new LinearClient(api);
      await client.updateStatus("ENG-5", "In Progress");
      await client.updateStatus("ENG-5", "Done");

      expect(calls).toEqual([
        { id: "ENG-5", status: "In Progress" },
        { id: "ENG-5", status: "Done" },
      ]);
    });
  });
});
