# Design: Dashboard Packaging, E2E MCP Test, GitHub Actions CI
Date: 2026-04-26

## 1. Dashboard Packaging

**Approach:** Bundle dashboard dist into server package at build time.

### How it works
- Server build script (`packages/server/package.json`) runs dashboard build first, then copies `packages/dashboard/dist/` → `packages/server/dist/dashboard/`
- Server `files` array updated: `["dist/", "README.md"]` already covers `dist/dashboard/` — no change needed
- `start.ts` resolves dashboard via `require.resolve('claude-operator/dist/dashboard/server.js')`
- `packages/dashboard` stays `private: true` — development only, never published separately

### Build order
```
pnpm build (workspace root)
→ packages/server build: tsc + copy dashboard dist + shebang + chmod
→ packages/dashboard build: tsc + copy public assets (runs independently, server build depends on its output)
```
Root `pnpm build` must build dashboard before server. Add `--filter claude-operator-dashboard` first, then `--filter claude-operator`.

### start.ts change
```ts
const serverPkg = require.resolve('claude-operator/dist/server.js')
  .replace(/\/dist\/server\.js$/, '');
const dashboardBin = path.join(serverPkg, 'dist', 'dashboard', 'server.js');
```
Keep existing try/catch — graceful fallback if dashboard missing.

---

## 2. E2E MCP Integration Test

**Approach:** Vitest test spawns `claude-operator-server`, drives JSON-RPC over stdio.

### Test location
`packages/server/tests/e2e/mcp-flow.test.ts`

### Flow
1. Spawn server as child process (stdio pipes)
2. Send `initialize` handshake — assert `serverInfo.name === 'claude-operator'`
3. Send `tools/call assign_task` with `goal` + `project_path` — assert response has `task_id`
4. Send `tools/call spawn_worker` with that `task_id` — assert response has `worker_id` matching `/^w-[0-9a-f]{8}$/`
5. Kill server, verify DB file created at `~/.claude-operator/operator.db`

### Helpers
- `sendRpc(proc, method, params)` — writes JSON-RPC line, reads response line, parses JSON
- `spawnServer()` — returns child process with stdin/stdout piped

### Constraints
- Timeout 15s per test (server startup + SQLite init)
- Runs in CI — no interactive TTY, no Claude Code dependency
- `spawn_worker` in headless mode must not actually invoke `claude` — mock or skip actual worker spawn, just verify DB row created

---

## 3. GitHub Actions CI

**File:** `.github/workflows/ci.yml`

### Triggers
- `push` to `main`
- `pull_request` targeting `main`

### Jobs
Single job `build-and-test`:
- `ubuntu-latest`
- Node 24 via `actions/setup-node`
- pnpm via `pnpm/action-setup@v4`
- Steps: checkout → setup pnpm → install → build dashboard → build server → build cli → test server

### Notes
- Build order: dashboard → server (server copies dashboard dist) → cli
- No secrets needed — tests use local SQLite only
- Cache pnpm store via `actions/cache` keyed on `pnpm-lock.yaml`
