# WORKING-CONTEXT — claude-operator

## Current Sprint Goal
v1 shipped. Focus: end-to-end smoke test, then v2 features.

## Current Focus
**v0.1.1 published on npm. main is clean, all security issues fixed, 39 tests green.**
Next: end-to-end smoke test (install globally, run `init` + `start`, wire into Claude Code, execute one real task cycle).

## Current Branch & State
- Branch: `main`
- Status: clean — all committed and pushed to github.com/MoyGulati/claude-operator
- Tests: 39 passing
- npm: `claude-operator@0.1.1` live

## Spec Location
`docs/superpowers/specs/2026-04-26-operator-agent-design.md` — 329 lines, finalized.

## Sprint Queue (ordered by what's left)
1. **End-to-end smoke test** — `npm install -g claude-operator && claude-operator init && claude-operator start`, one real task cycle
2. **Dashboard auth UX** — document `OPERATOR_TOKEN` in README + `init` output
3. **sqlite-vec hybrid search** (v2) — embeddings via `@huggingface/transformers` Xenova/all-MiniLM-L6-v2
4. **GitHub Actions CI** — build + test on push to main

## Implementation Notes (what was built)
- `packages/server/` — MCP server with 10 tools, SQLite WAL, FTS5 memory, file bus, monitor loop, OTel opt-in
- `packages/dashboard/` — Express :7373 with task board, guardrail editor, memory browser, judgment call inbox, SSE log stream (binds 127.0.0.1, OPERATOR_TOKEN write auth)
- `packages/cli/` — `claude-operator init/start/status/retro` via commander
- All tools: `assign_task`, `spawn_worker`, `inject_instruction`, `get_worker_status`, `set_guardrail`, `get_guardrails`, `update_memory`, `search_memory`, `log_judgment_call`, `complete_task`

## Learned Patterns
- (2026-04-26) better-sqlite3 v12+ required for Node v24 (v9 fails native build).
- (2026-04-26) pnpm v10 native build approval via `pnpm.onlyBuiltDependencies` in root package.json.
- (2026-04-26) Express Router factory return type must be explicit when `declaration: true` in tsconfig — TS2742.
- (2026-04-26) `import.meta.url` unavailable in `module: Node16` CJS output — use `__dirname`.
- (2026-04-27) `gh repo create --source --push` silently no-ops in this gh version. Create repo first, then `git remote add + push` separately.
- (2026-04-27) `execSync` shell string interpolation = shell injection even with "safe-looking" args. Always `spawnSync` with args array.
- (2026-04-27) `join(dir, userInput + '.json')` doesn't sanitize `..` — validate input format first.
- (2026-04-27) npm automation tokens bypass 2FA for publish — create at npmjs.com → Access Tokens → Granular → Read+Write.

## Failed Approaches
- (2026-04-26) Remote Control as primary worker bus — rejected (RC has 4 open bugs).
- (2026-04-26) Python daemon orchestrator — rejected (not TS, not MCP-marketplace-compatible).
- (2026-04-26) LLM auto-classification of memory tier — rejected (non-deterministic).
- (2026-04-26) better-sqlite3@9.x — fails on Node v24. Use v12+.
- (2026-04-27) `gh repo create MoyGulati/name --public --source=. --push` — silently fails. Split into two commands.
