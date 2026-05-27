# Worktree isolation without Docker sandboxing

Agents run directly on the host in isolated git worktrees, not inside Docker containers. We use sandcastle's `noSandbox()` provider.

Pi agents are already trusted to run on the host — this is how they're used interactively every day. Worktree isolation solves the file-conflict problem (parallel agents can't step on each other). Docker would add setup cost (Dockerfile per project or per ecosystem), a container runtime dependency, and the question of how to handle projects that already have their own Dockerfiles.

Docker isolation can be added later as an opt-in via the orchestrator config without changing the user interface.
