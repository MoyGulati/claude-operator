# WORKING-CONTEXT — claude-operator

## Current Focus
v0.1.2 shipped. Dashboard bundled, E2E tests added, CI wired, npm published. No active sprint. Next logical work: make CLI public + write README.

## Current Branch & State
- Branch: `main` (clean, pushed)
- Last release: `claude-operator@0.1.2` on npm
- Tests: 42 passing (verify.sh exits 0)

## Sprint Queue
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | CLI package — publish to npm | pending | Remove `private: true` from `packages/cli/package.json` |
| 2 | README.md | pending | Install instructions, MCP config, CLI commands |
| 3 | CHANGELOG | pending | Document v0.1.2 changes |
| 4 | CI badge in README | pending | After first CI run succeeds |

## Architecture Decisions (stable — don't relitigate)
- Dashboard is `private: true` — bundled into server at build time, not published separately
- CLI is `private: true` — not yet published to npm (pending decision)
- Build order: server:ts → dashboard → rm/cp into server → server:postbuild → cli
- `CLAUDE_OPERATOR_BASE_DIR` env var overrides DB path (default `~/.claude-operator`)
- E2E tests use `type: 'named'` workers to skip real claude invocation in CI

## Learned Patterns (with dates)
- [2026-04-26, High] Root build uses `rm -rf packages/server/dist/dashboard` before `cp -r` — prevents nested dir on incremental builds
- [2026-04-26, High] `spawn_worker type: 'named'` skips claude invocation — safe for CI E2E
- [2026-04-26, High] `CLAUDE_OPERATOR_BASE_DIR` + `mkdtempSync` = DB isolation in tests (`mcp-flow.test.ts:24`)
- [2026-04-26, High] Subagent reviewers need full worktree path `.worktrees/feature/<name>` — gitdir entry name strips slashes

## Failed Approaches (with dates)
- [2026-04-26] `cp -r src dst` without prior `rm -rf dst` — nests on incremental builds when dst exists
- [2026-04-25] `npm install -g .` from workspace root — installs root package (no bin), not CLI
- [2026-04-25] `require.resolve('claude-operator-dashboard/...')` — fails outside pnpm workspace (private pkg)
