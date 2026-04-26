# WORKING-CONTEXT — claude-operator

## Current Sprint Goal
Ship `claude-operator` v0.1.0: pnpm monorepo with MCP server, dashboard, and CLI — installable via `npm install -g claude-operator`.

## Current Focus
**Writing the implementation plan.** Design spec is finalized and committed. No code exists yet. Next action: write `docs/superpowers/plans/2026-04-26-claude-operator.md` using the `superpowers:writing-plans` skill, then execute it.

## Current Branch & State
- Branch: `main`
- Status: clean (no uncommitted changes)
- Commits: 2 (spec only)
- Zero code written

## Spec Location
`docs/superpowers/specs/2026-04-26-operator-agent-design.md` — 329 lines, fully finalized. Source of truth.

## Active Issue
None — pre-implementation. Plan must be written before any code.

## Sprint Queue (ordered)
1. **Write implementation plan** → `docs/superpowers/plans/2026-04-26-claude-operator.md`
2. **Task 1:** Monorepo scaffold (pnpm workspace, tsconfig, package.jsons, shared types)
3. **Task 2:** DB layer (better-sqlite3 WAL, schema with all 6 tables, FTS5 virtual table, sqlite-vec)
4. **Task 3:** Core CRUD MCP tools (assign_task, get_guardrails, set_guardrail, log_judgment_call)
5. **Task 4:** File bus + timeout wrapper
6. **Task 5:** Git worktree management
7. **Task 6:** Worker spawner + permission mapping
8. **Task 7:** inject_instruction + Remote Control overlay
9. **Task 8:** Monitor loop (30s, deadlock detection)
10. **Task 9:** complete_task (merge worktree, prune, trigger next)
11. **Task 10:** Memory embedder + FTS5 + sqlite-vec hybrid search (RRF)
12. **Task 11:** update_memory + search_memory tools + confidence decay
13. **Task 12:** Observability (JSONL logger, OTel stubs)
14. **Task 13:** MCP server entry + tool registration (index.ts)
15. **Task 14:** Dashboard Express server + API routes
16. **Task 15:** Dashboard frontend (HTML + vanilla JS + CSS)
17. **Task 16:** CLI — init + start + status
18. **Task 17:** CLI — retro command
19. **Task 18:** Daemon supervisor (PID file, restart loop)
20. **Task 19:** Integration test (full autonomy loop against fixture repo)
21. **Task 20:** Examples + README + npm publish config

## Learned Patterns
- (2026-04-26) ultraplan session reviewed design, found 8 issues — all fixed and committed locally. Remote session's branch `docs/operator-spec-critique-and-fixes` got stuck on signing server (400 "missing source") — can be ignored, our local spec is authoritative.

## Failed Approaches
- (2026-04-26) Considered Remote Control as primary worker bus — rejected (4 open bugs in Claude Code RC). File bus is primary, RC is overlay.
- (2026-04-26) Considered Python daemon as operator — rejected for open source (not TS-first, not MCP-marketplace-compatible).
- (2026-04-26) Considered auto-classifying memory tier via LLM — rejected (non-deterministic). Now uses `pending_classification=TRUE` + human confirmation.
