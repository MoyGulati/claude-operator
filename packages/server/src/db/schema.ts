import type Database from 'better-sqlite3';

export function applySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      goal            TEXT NOT NULL,
      project_path    TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending',
      worker_id       TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at    TEXT,
      result          TEXT,
      retry_count     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workers (
      id                  TEXT PRIMARY KEY,
      task_id             INTEGER NOT NULL REFERENCES tasks(id),
      type                TEXT NOT NULL,
      session_name        TEXT,
      pid                 INTEGER,
      status              TEXT NOT NULL DEFAULT 'running',
      last_output         TEXT NOT NULL DEFAULT '',
      updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
      worktree_path       TEXT NOT NULL DEFAULT '',
      worktree_branch     TEXT NOT NULL DEFAULT '',
      last_heartbeat_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS guardrails (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      rule                        TEXT NOT NULL,
      scope                       TEXT NOT NULL DEFAULT 'global',
      project_path                TEXT,
      created_by                  TEXT NOT NULL DEFAULT 'human',
      source_judgment_call_id     INTEGER,
      active                      INTEGER NOT NULL DEFAULT 1,
      created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
      max_concurrent_workers      INTEGER NOT NULL DEFAULT 3,
      max_tokens_per_task         INTEGER,
      cost_alert_threshold_usd    REAL,
      worker_permission_level     TEXT NOT NULL DEFAULT 'standard'
    );

    CREATE TABLE IF NOT EXISTS memory_global (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern                 TEXT NOT NULL,
      context                 TEXT NOT NULL DEFAULT '',
      outcome                 TEXT NOT NULL DEFAULT '',
      confidence              REAL NOT NULL DEFAULT 0.5,
      used_count              INTEGER NOT NULL DEFAULT 0,
      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      last_validated_at       TEXT,
      pending_classification  INTEGER NOT NULL DEFAULT 1,
      embedding               BLOB
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS memory_global_fts USING fts5(
      pattern, context, outcome,
      content='memory_global', content_rowid='id'
    );

    CREATE TABLE IF NOT EXISTS memory_project (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path        TEXT NOT NULL,
      pattern             TEXT NOT NULL,
      context             TEXT NOT NULL DEFAULT '',
      outcome             TEXT NOT NULL DEFAULT '',
      confidence          REAL NOT NULL DEFAULT 0.5,
      used_count          INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      last_validated_at   TEXT,
      embedding           BLOB
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS memory_project_fts USING fts5(
      pattern, context, outcome,
      content='memory_project', content_rowid='id'
    );

    CREATE TABLE IF NOT EXISTS judgment_calls (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id     INTEGER NOT NULL REFERENCES tasks(id),
      source      TEXT NOT NULL,
      decision    TEXT NOT NULL,
      context     TEXT NOT NULL DEFAULT '',
      outcome     TEXT NOT NULL DEFAULT 'unknown',
      reviewed    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
