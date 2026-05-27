import { describe, it, expect } from "vitest";
import { computeTiers, type Issue, type BlockingRelation } from "../tier-computer.js";

function issue(id: string, type: "AFK" | "HITL" = "AFK", status: "Backlog" | "Todo" | "InProgress" | "Done" = "Backlog"): Issue {
  return { id, title: `Issue ${id}`, description: "", type, status };
}

describe("computeTiers", () => {
  it("linear chain produces three single-issue tiers in order", () => {
    const issues = [issue("A"), issue("B"), issue("C")];
    const relations: BlockingRelation[] = [
      { blocker: "A", blocked: "B" },
      { blocker: "B", blocked: "C" },
    ];

    const tiers = computeTiers(issues, relations);

    expect(tiers).toHaveLength(3);
    expect(tiers[0].afk.map(i => i.id)).toEqual(["A"]);
    expect(tiers[1].afk.map(i => i.id)).toEqual(["B"]);
    expect(tiers[2].afk.map(i => i.id)).toEqual(["C"]);
  });

  it("diamond graph produces correct tiers: [A], [B, C], [D]", () => {
    const issues = [issue("A"), issue("B"), issue("C"), issue("D")];
    const relations: BlockingRelation[] = [
      { blocker: "A", blocked: "B" },
      { blocker: "A", blocked: "C" },
      { blocker: "B", blocked: "D" },
      { blocker: "C", blocked: "D" },
    ];

    const tiers = computeTiers(issues, relations);

    expect(tiers).toHaveLength(3);
    expect(tiers[0].afk.map(i => i.id)).toEqual(["A"]);
    expect(tiers[1].afk.map(i => i.id).sort()).toEqual(["B", "C"]);
    expect(tiers[2].afk.map(i => i.id)).toEqual(["D"]);
  });

  it("independent issues with no relations land in a single tier", () => {
    const issues = [issue("A"), issue("B"), issue("C")];
    const relations: BlockingRelation[] = [];

    const tiers = computeTiers(issues, relations);

    expect(tiers).toHaveLength(1);
    expect(tiers[0].afk.map(i => i.id).sort()).toEqual(["A", "B", "C"]);
  });

  it("mixed AFK/HITL issues are classified correctly within a tier", () => {
    const issues = [issue("A", "AFK"), issue("B", "HITL"), issue("C", "AFK"), issue("D", "HITL")];
    const relations: BlockingRelation[] = [
      { blocker: "A", blocked: "C" },
      { blocker: "B", blocked: "D" },
    ];

    const tiers = computeTiers(issues, relations);

    expect(tiers).toHaveLength(2);
    expect(tiers[0].afk.map(i => i.id)).toEqual(["A"]);
    expect(tiers[0].hitl.map(i => i.id)).toEqual(["B"]);
    expect(tiers[1].afk.map(i => i.id)).toEqual(["C"]);
    expect(tiers[1].hitl.map(i => i.id)).toEqual(["D"]);
  });

  it("cycle in the dependency graph throws a descriptive error", () => {
    const issues = [issue("A"), issue("B"), issue("C")];
    const relations: BlockingRelation[] = [
      { blocker: "A", blocked: "B" },
      { blocker: "B", blocked: "C" },
      { blocker: "C", blocked: "A" },
    ];

    expect(() => computeTiers(issues, relations)).toThrow(
      /Dependency cycle detected among issues.*A.*B.*C/
    );
  });

  it("issues whose blockers are already Done are treated as unblocked", () => {
    const issues = [issue("A", "AFK", "Done"), issue("B"), issue("C")];
    const relations: BlockingRelation[] = [
      { blocker: "A", blocked: "B" },
      { blocker: "B", blocked: "C" },
    ];

    const tiers = computeTiers(issues, relations);

    expect(tiers).toHaveLength(2);
    expect(tiers[0].afk.map(i => i.id)).toEqual(["B"]);
    expect(tiers[1].afk.map(i => i.id)).toEqual(["C"]);
  });
});
