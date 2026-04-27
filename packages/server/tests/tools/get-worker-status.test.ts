import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getWorkerStatus } from '../../src/tools/get-worker-status.js';
import { writeHeartbeat } from '../../src/bus/writer.js';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let db: Database.Database;
let busDir: string;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'op-gws-'));
  busDir = join(tmpDir, 'bus');
  db = openDb(join(tmpDir, 'test.db'));
  applySchema(db);
  db.prepare("INSERT INTO tasks (goal, project_path, status, retry_count) VALUES ('g', '/r', 'active', 0)").run();
  db.prepare("INSERT INTO workers (id, task_id, type, status, last_output, worktree_path, worktree_branch) VALUES ('w1', 1, 'headless', 'running', 'hello', '/wt', 'operator/w1')").run();
});
afterEach(() => { db.close(); rmSync(tmpDir, { recursive: true }); });

describe('get_worker_status', () => {
  it('returns running status from heartbeat', () => {
    writeHeartbeat(busDir, 'w1', { worker_id: 'w1', status: 'running', last_output: 'latest output', updated_at: new Date().toISOString() });
    const workers = getWorkerStatus(db, busDir, {});
    expect(workers[0].bus_status).toBe('running');
    expect(workers[0].bus_output).toBe('latest output');
  });

  it('marks worker as stalled when no heartbeat', () => {
    const workers = getWorkerStatus(db, busDir, {});
    expect(workers[0].bus_status).toBe('stalled');
  });
});
