import type { Issue, BlockingRelation, Tier } from "./types.js";

export type { Issue, BlockingRelation, Tier };

export function computeTiers(issues: Issue[], relations: BlockingRelation[]): Tier[] {
  const active = issues.filter(i => i.status !== "Done");
  const activeIds = new Set(active.map(i => i.id));
  const issueMap = new Map(active.map(i => [i.id, i]));

  const doneIds = new Set(issues.filter(i => i.status === "Done").map(i => i.id));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const id of activeIds) {
    inDegree.set(id, 0);
    dependents.set(id, []);
  }

  for (const rel of relations) {
    if (doneIds.has(rel.blocker)) continue;
    if (!activeIds.has(rel.blocker) || !activeIds.has(rel.blocked)) continue;

    inDegree.set(rel.blocked, (inDegree.get(rel.blocked) ?? 0) + 1);
    dependents.get(rel.blocker)!.push(rel.blocked);
  }

  const tiers: Tier[] = [];
  let remaining = new Set(activeIds);

  while (remaining.size > 0) {
    const ready: string[] = [];
    for (const id of remaining) {
      if ((inDegree.get(id) ?? 0) === 0) {
        ready.push(id);
      }
    }

    if (ready.length === 0) {
      const cycleIds = [...remaining].join(", ");
      throw new Error(`Dependency cycle detected among issues: ${cycleIds}`);
    }

    const tier: Tier = { afk: [], hitl: [] };
    for (const id of ready) {
      const issue = issueMap.get(id)!;
      if (issue.type === "HITL") {
        tier.hitl.push(issue);
      } else {
        tier.afk.push(issue);
      }
    }
    tiers.push(tier);

    for (const id of ready) {
      remaining.delete(id);
      for (const dep of dependents.get(id) ?? []) {
        inDegree.set(dep, (inDegree.get(dep) ?? 0) - 1);
      }
    }
  }

  return tiers;
}
