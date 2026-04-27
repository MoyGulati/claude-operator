import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { completeTask } from '../../src/tools/complete-task.js';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let db: Database.Database;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'op-ct-'));
  db = openDb(join(tmpDir, 'test.db'));
  applySchema(db);
  db.prepare("INSERT INTO tasks (goal, project_path, status, retry_count) VALUES ('g', '/r', 'active', 0)").run();
  db.prepare("INSERT INTO workers (id, task_id, type, status, last_output, worktree_path, worktree_branch) VALUES ('w-0000aaaa', 1, 'headless', 'done', 'ok', '/wt', 'operator/w1')").run();
});
afterEach(() => { db.close(); rmSync(tmpDir, { recursive: true }); });

describe('complete_task', () => {
  it('marks task done and records result', () => {
    completeTask(db, { task_id: 1, worker_id: 'w-0000aaaa', result: 'PR merged', skip_worktree_ops: true });
    const task = db.prepare('SELECT * FROM tasks WHERE id = 1').get() as any;
    expect(task.status).toBe('done');
    expect(task.result).toBe('PR merged');
    expect(task.completed_at).toBeTruthy();
  });

  it('marks worker done', () => {
    completeTask(db, { task_id: 1, worker_id: 'w-0000aaaa', result: 'done', skip_worktree_ops: true });
    const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get('w-0000aaaa') as any;
    expect(worker.status).toBe('done');
  });
});
