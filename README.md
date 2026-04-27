# claude-operator

TypeScript MCP server that turns any Claude Code session into an autonomous operator — decomposes goals, spawns and coordinates worker sessions across multiple projects, manages persistent two-tier memory, enforces guardrails, and learns from retrospective human review.

## Install

```bash
npm install -g claude-operator
claude-operator init
claude-operator start
```

`init` scaffolds `~/.claude-operator/` (SQLite DB, bus dir, config).  
`start` launches the MCP server on stdio + dashboard at `http://localhost:7373`.

## Wire into Claude Code

Add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "claude-operator": {
      "command": "claude-operator",
      "args": ["start", "--mcp"]
    }
  }
}
```

Or point at the local dev build:

```json
{
  "mcpServers": {
    "claude-operator": {
      "command": "node",
      "args": ["/path/to/claude-operator/packages/server/dist/server.js"]
    }
  }
}
```

## Architecture

```
Operator session (Claude Code)
        │  MCP tools (10)
        ▼
┌─────────────────────────────────┐
│  claude-operator MCP server     │
│  ┌──────────┐  ┌─────────────┐ │
│  │  SQLite  │  │  File bus   │ │
│  │  WAL+FTS5│  │  heartbeat  │ │
│  └──────────┘  └─────────────┘ │
│  ┌──────────────────────────┐  │
│  │  Monitor loop (30s poll) │  │
│  └──────────────────────────┘  │
└────────────┬────────────────────┘
             │  spawn / bus read-write
    ┌────────┴────────┐
    ▼                 ▼
Worker A          Worker B
(git worktree)    (git worktree)
operator/w-abc    operator/w-def
```

**Two-tier memory** — tier-1 (volatile, auto-expire 30d) and tier-2 (durable, human-confirmed). Operator proposes classification; human confirms in dashboard (`pending_classification=TRUE`).

**File bus** — primary worker↔operator state channel. Workers write heartbeats to `<bus-dir>/<worker-id>.json`; monitor loop detects stale workers (no heartbeat >2min) and marks them failed.

**Guardrails** — JSON rules enforced before any tool call. Set via `set_guardrail`, inspected via `get_guardrails`.

## Tool Reference

| Tool | Description |
|------|-------------|
| `assign_task` | Create a task with goal, project path, priority, constraints |
| `spawn_worker` | Launch a Claude Code worker (named or headless) on an isolated git worktree |
| `get_worker_status` | Poll worker state, heartbeat age, current task |
| `complete_task` | Mark task done, merge worktree branch, clean up |
| `search_memory` | FTS5 full-text search across operator memory |
| `update_memory` | Write/update a memory entry with tier + confidence |
| `set_guardrail` | Add or update a guardrail rule |
| `get_guardrails` | List active guardrail rules |
| `inject_instruction` | Send an instruction to a running worker via file bus |
| `log_judgment_call` | Record a human judgment call for retrospective learning |

## Dashboard

`http://localhost:7373` — task board, worker status, guardrail editor, memory browser, judgment call log, SSE log stream.

## CLI

```
claude-operator init          # scaffold config + DB
claude-operator start         # start MCP server + dashboard
claude-operator status        # print active workers + tasks
claude-operator retro         # open judgment call log
```

## Dev

```bash
git clone https://github.com/MoyGulati/claude-operator
cd claude-operator
pnpm install
pnpm build
pnpm test        # 39 tests
./verify.sh      # full gate (build + test)
```

**Requirements:** Node 24+, pnpm 10+.

## License

MIT
