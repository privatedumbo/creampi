# Linear as the state machine for orchestration

The orchestrator does not maintain its own state. Linear is the single source of truth for issue status, blocking relations, and the dependency graph. Every time the orchestrator needs to decide what to do next, it queries Linear.

This means the orchestrator process can crash and restart without losing progress. It re-reads Linear, sees which issues are Done, which are In Progress, and which are newly unblocked, and picks up where it left off. No local database, no state file, no reconciliation logic.

The dependency graph is computed deterministically from Linear's native blocking relations (set by `/to-issues`), not inferred by an AI agent. This eliminates hallucinated dependencies.
