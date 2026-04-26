# claude-operator

## Purpose (WHY)
Open-source TypeScript MCP server that turns any Claude Code session into an autonomous operator — decomposes goals, spawns and coordinates worker sessions across multiple projects, manages persistent two-tier memory, enforces guardrails, and learns from retrospective human review. Target: npm + MCP marketplace.

## Repo Map (WHAT)
```
claude-operator/
├── packages/
│   ├── server/          # TypeScript MCP server — 10 tools, SQLite, worker bus, memory
│   ├── dashboard/       # Express + vanilla JS — localhost:7373
│   └── cli/             # claude-operator init/start/status/retro
├── docs/
│   ├── superpowers/specs/   # Design spec (source of truth)
│   └── superpowers/plans/   # Implementation plan (TODO: write this)
├── examples/
└── package.json         # pnpm workspace
```

## Rules & Commands (HOW)
- **Package manager:** pnpm (workspace monorepo)
- **Language:** TypeScript throughout — never plain JS
- **Test runner:** vitest
- **DB:** better-sqlite3 + WAL mode + FTS5 + sqlite-vec
- **Done =** `pnpm test` passes across all packages
- **No code exists yet** — spec only. Write plan first, then code.

## Key design decisions (don't relitigate)
- File bus is PRIMARY worker state channel — Remote Control is overlay only
- Workers each get isolated git worktree (`operator/<worker-id>` branch)
- Memory classification: operator proposes tier, human confirms in dashboard (`pending_classification=TRUE`)
- All MCP tool calls wrapped with 25s timeout
- SQLite WAL mode + busy_timeout=5000 (multiple concurrent worker writes)
- Embeddings: `@huggingface/transformers` Xenova/all-MiniLM-L6-v2 (384-dim, local, no API key)
- Confidence decay: init 0.5, +0.05 per confirmed use, -0.1/week if not validated for 30d
