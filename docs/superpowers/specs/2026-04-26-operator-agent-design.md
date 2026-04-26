# claude-operator: Operator Agent Design
_Date: 2026-04-26_

## Summary

`claude-operator` is an open-source TypeScript MCP server that turns any Claude Code session into an autonomous operator capable of decomposing goals, spawning and coordinating worker sessions across multiple projects, managing persistent memory, enforcing guardrails, and learning from retrospective human review.

---

## Goals

- Fully autonomous once triggered — operator decomposes, assigns, monitors, ships
- Open source, mass adoption: `npm install -g claude-operator` → MCP marketplace listing
- Works with existing Claude Code sessions (no new UX paradigm)
- Human-modifiable guardrails that grow organically from real decisions
- Two-tier memory: global (project-agnostic) + project-level

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  OPERATOR SESSION                    │
│         (any Claude Code terminal window)            │
│   You: "ship the shawt scraper refactor"             │
│   Operator decomposes → assigns → monitors → ships   │
└──────────────────┬──────────────────────────────────┘
                   │ MCP tools (25s timeout on every call)
                   ▼
┌─────────────────────────────────────────────────────┐
│              claude-operator MCP SERVER              │
│  • Task queue      • Memory store (SQLite + WAL)     │
│  • Guardrails DB   • Worker registry                 │
│  • Judgment log    • Express dashboard :7373         │
│  • JSONL log       • OTel spans (opt-in)             │
└──────┬────────────────────────┬─────────────────────┘
       │ File bus (PRIMARY)     │ Remote Control (overlay,
       │ heartbeat + state      │ named sessions only)
       ▼                        ▼
┌───────────────────────────────────────────────────┐
│  Workers (each in isolated git worktree + branch) │
│  Named sessions  │  Headless: claude -p            │
│  (existing terms)│  --allowedTools per guardrail   │
└───────────────────────────────────────────────────┘
```

**Core principle:** Operator is not a new app — it's a Claude Code session with superpowers. Workers are either existing named sessions or headless `claude -p` subprocesses, each isolated in a git worktree.

---

## Components

### 1. MCP Server (`packages/server/`)

TypeScript, `@modelcontextprotocol/sdk`. Exposes:

| Tool | Purpose |
|---|---|
| `assign_task` | Add task to queue with project, goal, priority, constraints |
| `spawn_worker` | Launch `claude -p` subprocess in isolated git worktree for a task |
| `inject_instruction` | Send message to session via file bus (primary) or Remote Control (overlay) |
| `get_worker_status` | Poll all active workers — status, last output, blockers (timeout-wrapped) |
| `set_guardrail` | Write/update a guardrail rule (human or operator-invoked) |
| `get_guardrails` | Read active guardrails before any decision |
| `update_memory` | Persist a learned pattern after task completion |
| `search_memory` | Retrieve relevant past learnings via FTS5 + vector hybrid search |
| `log_judgment_call` | Record an out-of-guardrails decision for retrospective review |
| `complete_task` | Mark done, merge worktree branch, prune worktree, trigger next queued task |

### 2. SQLite Schema

**`tasks`**
```sql
id, goal, project_path, status, worker_id, created_at, completed_at, result, retry_count
```

**`guardrails`**
```sql
id, rule TEXT, scope TEXT (global|project), project_path, created_by TEXT (human|operator),
source_judgment_call_id, active BOOLEAN, created_at,
max_concurrent_workers INTEGER DEFAULT 3,
max_tokens_per_task INTEGER,        -- NULL = no cap
cost_alert_threshold_usd REAL,      -- surface to human if estimated cost exceeds this
worker_permission_level TEXT DEFAULT 'standard'  -- standard | elevated | sandboxed
```

**`memory_global`**
```sql
id, pattern TEXT, context TEXT, outcome TEXT, confidence REAL, used_count INTEGER,
created_at, last_validated_at,      -- confidence decays if not validated for >30 days
pending_classification BOOLEAN DEFAULT TRUE  -- human confirms global vs project in dashboard
```

**`memory_project`**
```sql
id, project_path TEXT, pattern TEXT, context TEXT, outcome TEXT, confidence REAL,
used_count INTEGER, created_at, last_validated_at
```

**`judgment_calls`**
```sql
id, task_id, source TEXT (memory|internet|operator_reasoning), decision TEXT,
context TEXT, outcome TEXT (success|failure|unknown), reviewed BOOLEAN, created_at
```

**`workers`**
```sql
id, task_id, type TEXT (named|headless), session_name, pid, status, last_output,
updated_at, worktree_path TEXT,     -- path of git worktree for this worker
worktree_branch TEXT,               -- operator/<worker-id>
last_heartbeat_at                   -- from bus file; stale >30s = BLOCKED
```

### 3. Dashboard (`packages/dashboard/`)

Express + vanilla JS at `localhost:7373`:
- Live task board (pending / active / done) with worker stream (last 20 lines per worker)
- Guardrails editor (CRUD)
- Memory browser (global + project tabs, confidence scores, pending classification queue)
- Judgment call inbox (unreviewed decisions, pending retro)
- Log stream (last 500 lines of operator.jsonl)

### 4. CLI (`packages/cli/`)

```bash
claude-operator init       # writes MCP entry to ~/.claude/settings.json
claude-operator start      # starts MCP server + dashboard daemon
claude-operator status     # show active workers + task queue
claude-operator retro      # start retrospective session
```

### 5. Worker Bus — Dual Channel

**Primary channel (all worker types):** `~/.claude-operator/bus/<worker-id>.json` poll loop.
- Worker writes heartbeat every 10s: `{status, last_output, updated_at}`
- Operator reads bus file to detect blocked/stalled/done state — no dependency on Remote Control uptime
- Worker absent from heartbeat for >30s → treated as STALLED regardless of Remote Control state
- All operator state decisions are owned by the bus file

**Overlay channel (named interactive sessions only):** Remote Control `inject_instruction`.
- Used to send unblocking guidance to a named session mid-task
- Not a required path — if Remote Control drops (documented: GitHub #34255, #51267), bus file remains authoritative
- Operator never waits on Remote Control acknowledgement

---

## Autonomy Loop

When goal received:

```
1. LOAD CONTEXT
   get_guardrails() → active rules
   search_memory() → relevant global + project patterns (FTS5 + vector hybrid)

2. DECOMPOSE
   Operator reasons using: guardrails → memory → internet (context7 / web search)
   Produces: [{goal, project_path, constraints, priority}]

3. FAN OUT
   For each task (respect max_concurrent_workers guardrail):
     Estimate token cost; if above cost_alert_threshold_usd → surface to human before proceeding
     git worktree add <project_path>/.worktrees/<worker-id> -b operator/<worker-id>
     named session available? → inject_instruction() via file bus (+ Remote Control overlay)
     no session?              → spawn_worker() → claude -p subprocess with --allowedTools
                                per worker_permission_level guardrail

4. MONITOR LOOP (every 30s)
   All MCP tool calls wrapped with 25s timeout; timeout → log stall, skip worker this tick
   Read bus file for each worker (direct FS read, not MCP call — avoids MCP hang):
     HEARTBEAT_MISSING >30s → treat as BLOCKED
     BLOCKED  → inject_instruction() with unblocking guidance
     FAILED   → retry (up to guardrail-defined limit) with different approach
     DONE     → complete_task() → merge worktree branch → prune worktree → update_memory()
   Deadlock check: if 2+ workers BLOCKED with no progress >15min → surface to human

5. SHIP GATE
   All tasks done → auto-detect verify command:
     verify.sh exists?          → run it (60s timeout)
     package.json scripts.test? → npm test (60s timeout)
     pytest discoverable?       → pytest (60s timeout)
     none found?                → alert human via dashboard, do not auto-ship
   Passes → commit + PR via commit-commands
   Fails  → re-assign fix task, do not mark original complete

6. LEARN
   update_memory(): propose tier (global/project), write with pending_classification=TRUE
   Human confirms classification in dashboard before pattern is used
   Increment confidence on patterns confirmed successful
   Log all out-of-guardrails decisions to judgment_calls
```

**Decision hierarchy (operator system prompt):**
1. Active guardrails — hard rules, never violated
2. Memory patterns — global first, then project-level (confidence ≥ 0.2 only)
3. Internet research — `mcp__context7__query-docs` or web search

---

## Two-Tier Memory

| Tier | Scope | Promotion rule |
|---|---|---|
| `memory_global` | All projects | Pattern contains no project-specific names/paths |
| `memory_project` | One repo | Project-specific facts, filenames, stack choices |

**Classification:** At `update_memory()`, operator proposes a tier based on pattern text, but the record is written with `pending_classification = TRUE`. Dashboard surfaces all pending items for human confirmation before the memory is used in future decisions. This prevents non-deterministic LLM auto-classification from silently corrupting the memory store.

**Retrieval (`search_memory`):** FTS5 full-text search + `sqlite-vec` vector similarity hybrid (Reciprocal Rank Fusion). `sqlite-vec` is a zero-dependency SQLite extension — no external vector DB required.

**Confidence decay:**
- Initialized at 0.5
- Each confirmed successful use → +0.05 (cap: 1.0)
- Not validated within 30 days → -0.1/week
- Confidence < 0.2 → flagged in dashboard before use, not applied automatically

---

## Retrospective Guardrail Loop

Opt-in, human-triggered (`claude-operator retro` or `/retro` in operator session).

1. Operator surfaces all unreviewed `judgment_calls`, grouped:
   - **Succeeded** — candidate to promote to guardrail
   - **Failed** — candidate for blocking guardrail
   - **Outcome unknown** — human assesses

2. For each, human responds:
   - `"yes, make it a rule"` → `set_guardrail()`, scope inferred from context
   - `"no, one-off"` → mark reviewed, stays in memory only
   - `"always X except when Y"` → writes scoped guardrail with condition

3. Guardrails grow organically from real decisions — not upfront configuration.

---

## Error Handling

| Scenario | Response |
|---|---|
| Worker stuck >10min | Inject unblocking instruction via bus file; if no progress in 5min → kill + requeue |
| Worker fails 3× same task | Halt task, surface to human via dashboard alert, pause queue |
| Remote Control session drops | Bus file remains authoritative; RC drop has no operational impact |
| MCP tool call hangs | 25s timeout wrapper fires; operator logs stall, continues monitor loop |
| MCP subagent silent write failure | Worker bus heartbeat will eventually show no progress → treated as BLOCKED |
| Verify command fails post-task | Re-assign fix as new task; original stays incomplete |
| Verify command not found | Alert human in dashboard; do not auto-ship |
| Verify command hangs | 60s hard timeout; treated as failure |
| Guardrail conflict detected | Halt operator, surface conflict to human before proceeding |
| Worker role drift | Detected via judgment_call log; pattern promoted to blocking guardrail in retro |
| Deadlock (A blocked on B, B blocked on A) | Monitor loop detects both BLOCKED >15min → surface to human |
| Worktree merge conflict at complete_task | Re-assign conflict-resolution as new task on same worktree branch |
| MCP server crash | Daemon supervisor auto-restarts within 5s; operator session reconnects |
| Cost threshold exceeded mid-fanout | Pause queue, surface projected cost to human, wait for approval |

---

## Observability

### SQLite WAL Mode
All connections: `PRAGMA journal_mode=WAL` + `PRAGMA busy_timeout=5000`. Allows concurrent reads during writes — critical when multiple workers write heartbeats simultaneously.

### Structured Logging
Every MCP tool call, worker spawn, bus read, and memory retrieval emits to `~/.claude-operator/logs/operator.jsonl`:
```json
{"ts": "...", "event": "tool_call", "tool": "get_worker_status", "duration_ms": 240, "result": "ok"}
```
Log rotation at 50 MB. Dashboard streams last 500 lines.

### OpenTelemetry (opt-in)
When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, server emits spans for:
- `operator.task.lifecycle` (assign → fanout → complete)
- `operator.worker.monitor_tick`
- `operator.memory.retrieve` + `operator.memory.update`
- `operator.guardrail.check`

Must be wired at span instrumentation layer before v1 launch — costly to retrofit.

### Daemon Supervision
`claude-operator start` spawns MCP server + dashboard under a supervisor loop. PID written to `~/.claude-operator/server.pid`. `claude-operator status` reads PID and health-checks `localhost:7373/health`.

---

## Repo Structure

```
claude-operator/
├── packages/
│   ├── server/          # TypeScript MCP server (publishable: claude-operator)
│   ├── dashboard/       # Express + vanilla JS dashboard
│   └── cli/             # claude-operator init/start/status/retro
├── docs/
│   └── superpowers/specs/
├── examples/
│   ├── guardrails-starter.json
│   └── memory-seeds.json
├── README.md
└── package.json         # pnpm workspace
```

---

## Distribution Milestones

1. `npm install -g claude-operator` — week 1
2. MCP marketplace listing — week 2
3. GitHub Actions worker mode (CI integration) — future

---

## Testing

- **Unit:** MCP tool handlers with vitest; SQLite operations including WAL concurrency
- **Integration:** spin up real `claude -p` worker against fixture task, assert SQLite state transitions
- **No mocks for worker bus** — real filesystem, real subprocess
- **E2E:** operator session completes a fixture goal end-to-end against a test repo
- **Chaos:** kill MCP server mid-task, verify daemon restarts and operator reconnects

---

## Install Story

```bash
npm install -g claude-operator
claude-operator init      # patches ~/.claude/settings.json with MCP entry
claude-operator start     # starts daemon (MCP server + dashboard)
claude                    # any session is now operator-capable
```
