import type { CreampiConfig, WorktreeBaseDirResult } from "./config.js";
import type { Issue, Tier } from "./types.js";

export interface PlanInput {
  parentIssueId: string;
  tiers: Tier[];
  config: CreampiConfig;
  worktreeBaseDir: WorktreeBaseDirResult;
}

// The first tier that isn't fully Done — the one /run-tier would dispatch next.
// Returns the 1-based tier number too, so the preview reads like the skill's
// "Tier N/total" report.
function nextTier(tiers: Tier[]): { tier: Tier; number: number } | null {
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]!;
    if (tier.afk.length > 0 || tier.hitl.length > 0) return { tier, number: i + 1 };
  }
  return null;
}

function issueLine(issue: Issue): string {
  return `    - ${issue.id}  ${issue.title}`;
}

// A tidy, human-readable preview of what a /run-tier invocation will actually
// do BEFORE anything is dispatched: which tier runs, which slices fan out in
// parallel vs. pause for a human, and the environment (models, concurrency,
// where worktrees land) that governs the run. Pure string builder so it stays
// unit-testable and free of any TUI dependency.
export function renderPlan(input: PlanInput): string {
  const { parentIssueId, tiers, config, worktreeBaseDir } = input;
  const lines: string[] = [];

  lines.push(`run-tier plan — ${parentIssueId}`);
  lines.push("");

  const worker = config.models.worker ?? "(pi default)";
  const reviewer = config.models.reviewer ?? "(pi default)";
  const review = config.workflow.review ?? true;
  const maxWorkers = config.workflow.maxParallelWorkers ?? 4;
  const maxRounds = config.workflow.maxReviewRounds ?? 2;

  lines.push("Environment");
  lines.push(`  config source      ${config.source ?? "(built-in defaults)"}`);
  lines.push(`  worker model       ${worker}`);
  lines.push(`  reviewer model     ${reviewer}`);
  lines.push(`  review             ${review ? `on (max ${maxRounds} round${maxRounds === 1 ? "" : "s"})` : "off"}`);
  lines.push(`  max parallel       ${maxWorkers}`);
  lines.push(`  worktree base dir  ${worktreeBaseDir.path}  [${worktreeBaseDir.origin}]`);
  lines.push("");

  if (tiers.length === 0) {
    lines.push("No tiers — the parent has no actionable children.");
    return lines.join("\n");
  }

  const next = nextTier(tiers);
  if (!next) {
    lines.push("All tiers complete — nothing to dispatch.");
    return lines.join("\n");
  }

  lines.push(`Next tier: ${next.number}/${tiers.length}`);
  lines.push(`  ${next.tier.afk.length} AFK slice(s) — dispatched in parallel worktrees`);
  for (const issue of next.tier.afk) lines.push(issueLine(issue));
  lines.push(`  ${next.tier.hitl.length} HITL slice(s) — pause for human input before dispatch`);
  for (const issue of next.tier.hitl) lines.push(issueLine(issue));

  if (next.tier.hitl.length > 0) {
    lines.push("");
    lines.push("Resolve the HITL slice(s) above before the AFK slices dispatch.");
  }

  return lines.join("\n");
}
