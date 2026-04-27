# WORKING-CONTEXT — claude-operator

## Current Sprint Goal
Finish packaging + test infra. Ship dashboard bundle, E2E test, CI.

## Current Focus
**Smoke test complete. Two bugs fixed (shebang, dashboard resolve). Plan approved.**
Next: execute 6-task plan via subagent-driven-development: build order fix → env var → start.ts fix → E2E test → CI → verify+push.

## Current Branch & State
- Branch: `main`
- Status: clean — all committed
- Tests: 39 passing (42 after E2E task)
- npm: `claude-operator@0.1.1` live

## Spec Location
`docs/superpowers/specs/2026-04-26-operator-agent-design.md` — 329 lines, finalized.

## Sprint Queue (ordered by what's left)
1. **[IN PROGRESS] Execute packaging/E2E/CI plan** — plan at `docs/superpowers/plans/2026-04-26-packaging-e2e-ci.md`, 6 tasks
2. **Dashboard auth UX** — document `OPERATOR_TOKEN` in README + `init` output
3. **sqlite-vec hybrid search** (v2) — embeddings via `@huggingface/transformers` Xenova/all-MiniLM-L6-v2

## Implementation Notes (what was built)
- `packages/server/` — MCP server with 10 tools, SQLite WAL, FTS5 memory, file bus, monitor loop, OTel opt-in
- `packages/dashboard/` — Express :7373 with task board, guardrail editor, memory browser, judgment call inbox, SSE log stream (binds 127.0.0.1, OPERATOR_TOKEN write auth)
- `packages/cli/` — `claude-operator init/start/status/retro` via commander
- All tools: `assign_task`, `spawn_worker`, `inject_instruction`, `get_worker_status`, `set_guardrail`, `get_guardrails`, `update_memory`, `search_memory`, `log_judgment_call`, `complete_task`

## Learned Patterns
- (2026-04-26) Server bin needs `#!/usr/bin/env node` shebang via postbuild — tsc strips it from source. Postbuild: `printf '#!/usr/bin/env node\n' | cat - dist/server.js > tmp && mv tmp dist/server.js && chmod +x`.
- (2026-04-26) `pnpm -r build` order: dashboard builds after server (dashboard depends on server types). To bundle dashboard INTO server, split server build (`build:ts` + `build:postbuild`) and use explicit root build order via `--filter`.
- (2026-04-26) `spawn_worker type:named` skips claude spawn — use in E2E tests to avoid ENOENT in CI.
- (2026-04-26) MCP server JSON-RPC verified over stdio: pipe newline-delimited JSON to node process, read responses line-by-line matched by `id`.


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
