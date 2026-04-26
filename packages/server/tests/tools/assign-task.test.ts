import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { assignTask } from '../../src/tools/assign-task.js';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let db: Database.Database;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'op-tools-'));
  db = openDb(join(tmpDir, 'test.db'));
  applySchema(db);
});
afterEach(() => { db.close(); rmSync(tmpDir, { recursive: true }); });

describe('assign_task', () => {
  it('inserts a pending task and returns its id', () => {
    const result = assignTask(db, { goal: 'refactor auth', project_path: '/repo', priority: 1, constraints: 'no breaking changes' });
    expect(result.id).toBeTypeOf('number');
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.id) as any;
    expect(row.status).toBe('pending');
    expect(row.goal).toBe('refactor auth');
  });

  it('throws when project_path is empty', () => {
    expect(() => assignTask(db, { goal: 'x', project_path: '', priority: 1, constraints: '' }))
      .toThrow('project_path is required');
  });
});
