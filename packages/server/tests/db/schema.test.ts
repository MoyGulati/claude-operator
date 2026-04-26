import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tmpDir: string;
let db: Database.Database;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'op-test-'));
  db = openDb(join(tmpDir, 'test.db'));
  applySchema(db);
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true });
});

describe('schema', () => {
  it('creates all 6 tables', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('tasks');
    expect(names).toContain('workers');
    expect(names).toContain('guardrails');
    expect(names).toContain('memory_global');
    expect(names).toContain('memory_project');
    expect(names).toContain('judgment_calls');
  });

  it('inserts and retrieves a task', () => {
    db.prepare(
      "INSERT INTO tasks (goal, project_path, status, retry_count) VALUES (?, ?, 'pending', 0)"
    ).run('fix bug', '/repo');
    const row = db.prepare("SELECT * FROM tasks WHERE goal = ?").get('fix bug') as any;
    expect(row.status).toBe('pending');
    expect(row.retry_count).toBe(0);
  });

  it('memory_global has pending_classification default TRUE', () => {
    db.prepare(
      "INSERT INTO memory_global (pattern, context, outcome, confidence, used_count) VALUES (?, ?, ?, 0.5, 0)"
    ).run('test pattern', 'ctx', 'ok');
    const row = db.prepare("SELECT * FROM memory_global").get() as any;
    expect(row.pending_classification).toBe(1);
  });

  it('guardrails has max_concurrent_workers default 3', () => {
    db.prepare(
      "INSERT INTO guardrails (rule, scope, created_by, active) VALUES (?, 'global', 'human', 1)"
    ).run('no deletes');
    const row = db.prepare("SELECT * FROM guardrails").get() as any;
    expect(row.max_concurrent_workers).toBe(3);
    expect(row.worker_permission_level).toBe('standard');
  });
});
