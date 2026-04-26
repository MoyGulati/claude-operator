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
                   │ MCP tools
                   ▼
┌─────────────────────────────────────────────────────┐
│              claude-operator MCP SERVER              │
│  • Task queue      • Memory store (SQLite)           │
│  • Guardrails DB   • Worker registry                 │
│  • Judgment log    • Express dashboard :7373         │
└──────┬────────────────────────┬─────────────────────┘
       │ Remote Control API     │ File bus
       ▼                        ▼
┌──────────────┐     ┌──────────────────────────────┐
│ Named session│     │ Headless workers              │
│ (existing    │     │ claude -p --mcp-config ...    │
│  terminals)  │     │ (spawned by operator)         │
└──────────────┘     └──────────────────────────────┘
```

**Core principle:** Operator is not a new app — it's a Claude Code session with superpowers. Workers are either existing named sessions or headless `claude -p` subprocesses.

---

## Components

### 1. MCP Server (`packages/server/`)

TypeScript, `@modelcontextprotocol/sdk`. Exposes:

| Tool | Purpose |
|---|---|
| `assign_task` | Add task to queue with project, goal, priority, constraints |
| `spawn_worker` | Launch `claude -p` subprocess for a task |
| `inject_instruction` | Send message to named session via Remote Control API |
| `get_worker_status` | Poll all active workers — status, last output, blockers |
| `set_guardrail` | Write/update a guardrail rule (human or operator-invoked) |
| `get_guardrails` | Read active guardrails before any decision |
| `update_memory` | Persist a learned pattern after task completion |
| `search_memory` | Retrieve relevant past learnings for current goal |
| `log_judgment_call` | Record an out-of-guardrails decision for retrospective review |
| `complete_task` | Mark done, store outcome, trigger next queued task |

### 2. SQLite Schema

**`tasks`**
```sql
id, goal, project_path, status, worker_id, created_at, completed_at, result, retry_count
```

**`guardrails`**
```sql
id, rule TEXT, scope TEXT (global|project), project_path, created_by TEXT (human|operator),
source_judgment_call_id, active BOOLEAN, created_at
```

**`memory_global`**
```sql
id, pattern TEXT, context TEXT, outcome TEXT, confidence REAL, used_count INTEGER, created_at
```

**`memory_project`**
```sql
id, project_path TEXT, pattern TEXT, context TEXT, outcome TEXT, confidence REAL,
used_count INTEGER, created_at
```

**`judgment_calls`**
```sql
id, task_id, source TEXT (memory|internet|operator_reasoning), decision TEXT,
context TEXT, outcome TEXT (success|failure|unknown), reviewed BOOLEAN, created_at
```

**`workers`**
```sql
id, task_id, type TEXT (named|headless), session_name, pid, status, last_output, updated_at
```

### 3. Dashboard (`packages/dashboard/`)

Express + vanilla JS at `localhost:7373`:
- Live task board (pending / active / done) with worker stream (last 20 lines)
- Guardrails editor (CRUD)
- Memory browser (global + project tabs, confidence scores)
- Judgment call inbox (unreviewed decisions, pending retro)

### 4. CLI (`packages/cli/`)

```bash
claude-operator init       # writes MCP entry to ~/.claude/settings.json
claude-operator start      # starts MCP server + dashboard daemon
claude-operator status     # show active workers + task queue
claude-operator retro      # start retrospective session
```

### 5. Worker Bus — Dual Channel

- **Named interactive sessions** → `RemoteTrigger` API (Claude Code native)
- **Headless spawned workers** → `~/.claude-operator/bus/<worker-id>.json` poll loop
- Operator detects session type automatically; falls back to file bus if Remote Control drops

---

## Autonomy Loop

When goal received:

```
1. LOAD CONTEXT
   get_guardrails() → active rules
   search_memory() → relevant global + project patterns

2. DECOMPOSE
   Operator reasons using: guardrails → memory → internet (context7 / web search)
   Produces: [{goal, project_path, constraints, priority}]

3. FAN OUT
   For each task:
     named session available? → inject_instruction() via Remote Control
     no session?              → spawn_worker() → claude -p subprocess

4. MONITOR LOOP (every 30s)
   get_worker_status() for each worker:
     BLOCKED  → inject_instruction() with unblocking guidance
     FAILED   → retry (up to guardrail-defined limit) with different approach
     DONE     → complete_task() → update_memory()

5. SHIP GATE
   All tasks done → run verify.sh per project
   Passes → commit + PR via commit-commands
   Fails  → re-assign fix task, do not mark original complete

6. LEARN
   update_memory(): classify as global (project-agnostic) or project-level
   Increment confidence on patterns that led to success
   Log all out-of-guardrails decisions to judgment_calls
```

**Decision hierarchy (operator system prompt):**
1. Active guardrails — hard rules, never violated
2. Memory patterns — global first, then project-level
3. Internet research — `mcp__context7__query-docs` or web search

---

## Two-Tier Memory

| Tier | Scope | Promotion rule |
|---|---|---|
| `memory_global` | All projects | Pattern contains no project-specific names/paths — auto-classified |
| `memory_project` | One repo | Project-specific facts, filenames, stack choices |

Auto-classification at `update_memory()`: operator inspects pattern text. If project-specific identifiers detected → `memory_project`. Otherwise → `memory_global`. Human can override via dashboard.

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
| Worker stuck >10min | Inject unblocking instruction; if no progress in 5min → kill + requeue |
| Worker fails 3× same task | Halt task, surface to human via dashboard alert, pause queue |
| Remote Control session drops | Auto-fallback to file bus |
| `verify.sh` fails post-task | Re-assign fix as new task; original stays incomplete |
| Guardrail conflict detected | Halt operator, surface conflict to human before proceeding |

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

- **Unit:** MCP tool handlers with vitest; SQLite operations
- **Integration:** spin up real `claude -p` worker against fixture task, assert SQLite state transitions
- **No mocks for worker bus** — real filesystem, real subprocess
- **E2E:** operator session completes a fixture goal end-to-end against a test repo

---

## Install Story

```bash
npm install -g claude-operator
claude-operator init      # patches ~/.claude/settings.json with MCP entry
claude-operator start     # starts daemon (MCP server + dashboard)
claude                    # any session is now operator-capable
```
