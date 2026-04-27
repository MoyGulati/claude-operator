# WORKING-CONTEXT — claude-operator

## Current Sprint Goal
Ship `claude-operator` v0.1.0: pnpm monorepo with MCP server, dashboard, and CLI — installable via `npm install -g claude-operator`.

## Current Focus
**Implementation complete on `feat/implementation`.** 39 tests green, `verify.sh` exits 0. Ready for: README, merge to main, npm publish prep, MCP marketplace listing.

## Current Branch & State
- Branch: `feat/implementation`
- Status: clean (all implementation committed in 8 commits)
- Tests: 39 passing (`packages/server` — DB, bus, tools, monitor, verify, worktree, integration)
- Untracked: `.npmrc`, `pnpm.json` (intermediate artifacts — gitignore or delete)

## Spec Location
`docs/superpowers/specs/2026-04-26-operator-agent-design.md` — 329 lines, finalized.

## Plan Location
`docs/superpowers/plans/2026-04-26-claude-operator.md` — 17-task implementation plan, all tasks complete.

## Sprint Queue (ordered by what's left)
1. **Clean up** `.npmrc`, `pnpm.json` — add to `.gitignore` or delete
2. **Write README.md** — install story, architecture diagram, tool reference
3. **Merge `feat/implementation` → `main`** — `git merge --no-ff`
4. **npm publish prep** — `"files"` field in server/package.json, `"publishConfig": {"access":"public"}`
5. **MCP marketplace listing** — `mcp.json` at repo root
6. **Examples** — `examples/guardrails-starter.json`, `examples/memory-seeds.json`
7. **sqlite-vec hybrid search** (v2, deferred) — FTS5 alone in v1

## Implementation Notes (what was built)
- `packages/server/` — MCP server with 10 tools, SQLite WAL, FTS5 memory, file bus, monitor loop, OTel opt-in
- `packages/dashboard/` — Express :7373 with task board, guardrail editor, memory browser, judgment call inbox, SSE log stream
- `packages/cli/` — `claude-operator init/start/status/retro` via commander
- All tools: `assign_task`, `spawn_worker`, `inject_instruction`, `get_worker_status`, `set_guardrail`, `get_guardrails`, `update_memory`, `search_memory`, `log_judgment_call`, `complete_task`

## Learned Patterns
- (2026-04-26) ultraplan session reviewed design, found 8 issues — all fixed and committed locally.
- (2026-04-26) better-sqlite3 v12+ required for Node v24 (v9 fails native build).
- (2026-04-26) pnpm v10 native build approval via `pnpm.onlyBuiltDependencies` in root package.json — `approve-builds` is interactive.
- (2026-04-26) Express Router factory return type must be explicit (`Router`) when `declaration: true` in tsconfig — TS2742.
- (2026-04-26) `import.meta.url` unavailable in `module: Node16` CJS output — use `__dirname`.
- (2026-04-26) vitest `--passWithNoTests` needed for packages without tests (dashboard, CLI).

## Failed Approaches
- (2026-04-26) Remote Control as primary worker bus — rejected (RC has 4 open bugs).
- (2026-04-26) Python daemon orchestrator — rejected (not TS, not MCP-marketplace-compatible).
- (2026-04-26) LLM auto-classification of memory tier — rejected (non-deterministic). Uses `pending_classification=TRUE`.
- (2026-04-26) better-sqlite3@9.x — fails on Node v24 with `make` exit code 2. Use v12+.
