import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { LinearClient } from "./linear-client.js";
import { createLinearSdkApi } from "./linear-sdk-api.js";
import { computeTiers } from "./tier-computer.js";
import { openPr, checkCi, checkMerge } from "./pr-manager.js";
import { applyWorktreeBaseDir, loadConfig } from "./config.js";
import { renderPlan } from "./plan.js";

export default function creampiExtension(pi: ExtensionAPI) {
  // LinearClient backed by @linear/sdk
  const api = createLinearSdkApi();
  const client = new LinearClient(api);

  // Point pi-subagents at a stable worktree base dir at activation. creampi
  // owns the config surface (.creampi.yaml -> workflow.worktreeBaseDir);
  // pi-subagents owns the worktree mechanism and reads our value through its
  // published PI_SUBAGENTS_WORKTREE_DIR override. Without this it falls back to
  // the OS temp dir, the fragile case where isolation silently degrades. See
  // ADR 0005.
  const worktreeBaseDir = applyWorktreeBaseDir(loadConfig());

  pi.registerTool({
    name: "linear_fetch_issues",
    label: "Linear Fetch Issues",
    description:
      "Fetch a parent issue's children from Linear with their blocking relations and AFK/HITL classification. Returns issues and relations for use with compute_tiers.",
    promptSnippet: "Fetch child issues and blocking relations from a Linear parent issue",
    promptGuidelines: [
      "Use linear_fetch_issues when orchestrating tier-based execution to read the current state of issues from Linear.",
    ],
    parameters: Type.Object({
      parentIssueId: Type.String({ description: "The Linear issue identifier (e.g. ENG-363)" }),
    }),
    async execute(_toolCallId, params) {
      const parent = await client.getParentIssue(params.parentIssueId);
      const children = await client.getChildIssues(params.parentIssueId);
      const issueIds = children.map((c) => c.id);
      const relations = await client.getBlockingRelations(issueIds);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ parent, children, relations }, null, 2),
          },
        ],
        details: { parent, children, relations },
      };
    },
  });

  pi.registerTool({
    name: "compute_tiers",
    label: "Compute Tiers",
    description:
      "Compute execution tiers from issues and blocking relations using deterministic topological sort. Returns ordered tiers with AFK and HITL classification.",
    promptSnippet: "Compute deterministic execution tiers from issues and blocking relations",
    promptGuidelines: [
      "Use compute_tiers after linear_fetch_issues to determine which issues can be worked in parallel.",
    ],
    parameters: Type.Object({
      issues: Type.Array(
        Type.Object({
          id: Type.String(),
          title: Type.String(),
          description: Type.String(),
          status: Type.String(),
          type: Type.Union([Type.Literal("AFK"), Type.Literal("HITL")]),
        }),
        { description: "Array of issues from linear_fetch_issues" }
      ),
      relations: Type.Array(
        Type.Object({
          blocker: Type.String(),
          blocked: Type.String(),
        }),
        { description: "Array of blocking relations from linear_fetch_issues" }
      ),
    }),
    async execute(_toolCallId, params) {
      const tiers = computeTiers(params.issues, params.relations);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ tiers, totalTiers: tiers.length }, null, 2),
          },
        ],
        details: { tiers },
      };
    },
  });

  pi.registerTool({
    name: "open_pr",
    label: "Open PR",
    description:
      "Open a pull request for a branch, referencing a Linear issue in the title and body.",
    promptSnippet: "Open a PR for a completed agent worktree branch",
    promptGuidelines: [
      "Use open_pr after a worker agent completes on a worktree branch to create a reviewable PR.",
      "Pass a Markdown body with reviewer context (Why / What changed / Testing / Reviewer notes) assembled from the issue, diff, and review findings you already hold. 'Closes <issueId>' is appended automatically.",
    ],
    parameters: Type.Object({
      branch: Type.String({ description: "The git branch name to create the PR from" }),
      issueId: Type.String({ description: "The Linear issue identifier (e.g. ENG-365)" }),
      issueTitle: Type.String({ description: "The issue title for the PR title" }),
      body: Type.Optional(
        Type.String({
          description:
            "Markdown PR body with reviewer context (Why / What changed / Testing / Reviewer notes). 'Closes <issueId>' is appended automatically.",
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      const result = await openPr(params.branch, params.issueId, params.issueTitle, params.body);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "check_ci",
    label: "Check CI",
    description: "Check CI status for a pull request. Returns whether all checks are passing.",
    promptSnippet: "Poll CI status for a pull request",
    promptGuidelines: [
      "Use check_ci after open_pr to verify that CI passes before notifying the developer for review.",
    ],
    parameters: Type.Object({
      prNumber: Type.Number({ description: "The PR number to check" }),
    }),
    async execute(_toolCallId, params) {
      const result = await checkCi(params.prNumber);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "check_merges",
    label: "Check Merges",
    description: "Check whether a pull request has been merged.",
    promptSnippet: "Check if a PR has been merged by the developer",
    promptGuidelines: [
      "Use check_merges to determine if the developer has merged a PR before proceeding to the next tier.",
    ],
    parameters: Type.Object({
      prNumber: Type.Number({ description: "The PR number to check" }),
    }),
    async execute(_toolCallId, params) {
      const result = await checkMerge(params.prNumber);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "linear_update_status",
    label: "Linear Update Status",
    description: "Update the status of a Linear issue (e.g. to In Progress, In Review, Done).",
    promptSnippet: "Update a Linear issue's workflow status",
    promptGuidelines: [
      "Use linear_update_status to keep Linear in sync as issues move through the orchestration pipeline.",
    ],
    parameters: Type.Object({
      issueId: Type.String({ description: "The Linear issue identifier (e.g. ENG-365)" }),
      status: Type.Union(
        [
          Type.Literal("Backlog"),
          Type.Literal("Todo"),
          Type.Literal("In Progress"),
          Type.Literal("In Review"),
          Type.Literal("Done"),
          Type.Literal("Canceled"),
        ],
        { description: "The target status" }
      ),
    }),
    async execute(_toolCallId, params) {
      await client.updateStatus(params.issueId, params.status as any);

      return {
        content: [
          {
            type: "text",
            text: `Updated ${params.issueId} to ${params.status}`,
          },
        ],
        details: { issueId: params.issueId, status: params.status },
      };
    },
  });

  pi.registerTool({
    name: "run_tier_plan",
    label: "Run Tier Plan",
    description:
      "Preview what /run-tier will do for a parent issue BEFORE dispatching: the resolved environment (models, review, concurrency, worktree base dir) and the next tier's AFK/HITL slices. Read-only — fetches Linear and computes tiers but launches nothing.",
    promptSnippet: "Preview the next run-tier dispatch (environment + next tier) without launching",
    promptGuidelines: [
      "Use run_tier_plan at the start of a run-tier invocation to show the developer the resolved config and the tier that will run before any worker is dispatched.",
    ],
    parameters: Type.Object({
      parentIssueId: Type.String({ description: "The Linear parent issue identifier (e.g. ENG-1428)" }),
    }),
    async execute(_toolCallId, params) {
      const config = loadConfig();
      const children = await client.getChildIssues(params.parentIssueId);
      const relations = await client.getBlockingRelations(children.map((c) => c.id));
      const tiers = computeTiers(children, relations);
      const text = renderPlan({ parentIssueId: params.parentIssueId, tiers, config, worktreeBaseDir });

      return {
        content: [{ type: "text", text }],
        details: { parentIssueId: params.parentIssueId, tiers, worktreeBaseDir, configSource: config.source },
      };
    },
  });

  pi.registerCommand("creampi-doctor", {
    description: "Show the resolved creampi environment (config source, models, worktree base dir)",
    handler: async (_args, ctx) => {
      const config = loadConfig();
      const worker = config.models.worker ?? "(pi default)";
      const reviewer = config.models.reviewer ?? "(pi default)";
      const review = config.workflow.review ?? true;
      const maxWorkers = config.workflow.maxParallelWorkers ?? 4;
      const lines = [
        `config source      ${config.source ?? "(built-in defaults)"}`,
        `worker model       ${worker}`,
        `reviewer model     ${reviewer}`,
        `review             ${review ? "on" : "off"}`,
        `max parallel       ${maxWorkers}`,
        `worktree base dir  ${worktreeBaseDir.path}  [${worktreeBaseDir.origin}]`,
      ];
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
