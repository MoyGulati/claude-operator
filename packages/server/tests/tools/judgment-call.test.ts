import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logJudgmentCall } from '../../src/tools/log-judgment-call.js';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let db: Database.Database;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'op-jc-'));
  db = openDb(join(tmpDir, 'test.db'));
  applySchema(db);
  db.prepare("INSERT INTO tasks (goal, project_path, status, retry_count) VALUES ('g', '/r', 'active', 0)").run();
});
afterEach(() => { db.close(); rmSync(tmpDir, { recursive: true }); });

describe('log_judgment_call', () => {
  it('inserts unreviewed judgment call', () => {
    const result = logJudgmentCall(db, { task_id: 1, source: 'operator_reasoning', decision: 'skip lint', context: 'urgent fix', outcome: 'success' });
    expect(result.id).toBeTypeOf('number');
    const row = db.prepare('SELECT * FROM judgment_calls WHERE id = ?').get(result.id) as any;
    expect(row.reviewed).toBe(0);
    expect(row.source).toBe('operator_reasoning');
  });
});
