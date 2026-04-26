# Handover — 2026-04-26

## Session Summary
Designed `claude-operator` from scratch: an open-source TypeScript MCP server that turns any Claude Code session into an autonomous orchestrator for multi-worker, multi-project development. Went through full brainstorming → ultraplan critique → spec finalization cycle. All design decisions are committed. Zero code exists yet — implementation plan is the immediate next step.

## Git State
- Branch: `main`
- Uncommitted changes: none (clean)
- Last 2 commits:
  - `392fbec` docs: incorporate ultraplan research — worktrees, file bus primary, FTS5+vec memory, WAL, OTel, expanded error handling
  - `3faa7b7` docs: add operator agent design spec

## Active Problem
No active problem. Session ended cleanly at "write implementation plan" step. The `superpowers:writing-plans` skill was invoked but interrupted before the plan file was written.

## Files Touched This Session
- `docs/superpowers/specs/2026-04-26-operator-agent-design.md` — full design spec, 329 lines, finalized
- `CLAUDE.md` — created this session (project-level)
- `WORKING-CONTEXT.md` — created this session
- `docs/HANDOVER.md` — this file

## Failed Approaches
- Remote Control as primary worker bus — rejected (4 open bugs). File bus is primary.
- Python daemon orchestrator — rejected for OSS (not TS, not MCP-marketplace-compatible).
- LLM auto-classification of memory tier — rejected (non-deterministic). Human confirms via dashboard.
- ultraplan web session tried to commit spec fixes but got stuck on signing server (400 "missing source") — all fixes were already incorporated locally before this happened.

## Learned Patterns
- [High confidence] ultraplan sessions can get stuck on commit signing in cloud environments — always incorporate their findings locally before they try to commit.
- [High confidence] For open source Claude Code tooling, TypeScript MCP server is the right shape — npm-installable, MCP marketplace discoverable, familiar to Claude Code users.

## Next Steps (ordered by dependency)
1. **Write implementation plan** — invoke `superpowers:writing-plans` skill, save to `docs/superpowers/plans/2026-04-26-claude-operator.md`. Read spec first: `docs/superpowers/specs/2026-04-26-operator-agent-design.md`.
2. **Execute Task 1** — pnpm monorepo scaffold: `package.json` (workspace), `pnpm-workspace.yaml`, `tsconfig.base.json`, `packages/server/package.json`, `packages/dashboard/package.json`, `packages/cli/package.json`, `packages/server/src/types.ts` (shared interfaces).
3. **Execute Task 2** — DB layer: `packages/server/src/db/connection.ts` (WAL factory), `packages/server/src/db/schema.ts` (all 6 tables + FTS5 + sqlite-vec).
4. Remaining tasks follow the Sprint Queue in WORKING-CONTEXT.md.

## Key Design Decisions (don't relitigate)
- File bus PRIMARY, Remote Control overlay only
- Workers in isolated git worktrees (`operator/<id>` branch)
- `pending_classification=TRUE` on all new memory — human confirms in dashboard
- 25s timeout wrapper on every MCP tool call
- SQLite WAL + busy_timeout=5000
- Embeddings: `@huggingface/transformers` `Xenova/all-MiniLM-L6-v2` (384-dim, local, no API key)
- Confidence: init 0.5, +0.05/confirmed use, -0.1/week if not validated 30d
- Dashboard: Express + vanilla JS at localhost:7373
- CLI: `commander` package

## Environment Notes
- Node v24.13.0, Python 3.14.3 available
- No tmux installed (but Claude Code has `--tmux` flag for worktrees)
- pnpm must be installed: `npm install -g pnpm`
- sqlite-vec requires native extension loading — test on target platform before publishing

## Resume command
From **any directory**, run `claude` then paste:
`@/Users/am/claude-projects/claude-operator/docs/HANDOVER.md continue from Next Step`
