import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMonitorLoop } from '../../src/monitor/loop.js';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import { writeHeartbeat } from '../../src/bus/writer.js';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let db: Database.Database;
let tmpDir: string;
let busDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'op-mon-'));
  busDir = join(tmpDir, 'bus');
  db = openDb(join(tmpDir, 'test.db'));
  applySchema(db);
  db.prepare("INSERT INTO tasks (goal, project_path, status, retry_count) VALUES ('g', '/r', 'active', 0)").run();
  db.prepare("INSERT INTO workers (id, task_id, type, status, last_output, worktree_path, worktree_branch) VALUES ('w-0000aaaa', 1, 'headless', 'running', '', '/wt', 'operator/w1')").run();
});
afterEach(() => { db.close(); rmSync(tmpDir, { recursive: true }); });

describe('monitor loop tick', () => {
  it('marks worker stalled when heartbeat is missing', async () => {
    const loop = createMonitorLoop(db, busDir, { intervalMs: 100, staleThresholdMs: 1000 });
    await loop.tick();
    const w = db.prepare("SELECT * FROM workers WHERE id = 'w-0000aaaa'").get() as any;
    expect(w.status).toBe('stalled');
  });

  it('keeps worker running when fresh heartbeat present', async () => {
    writeHeartbeat(busDir, 'w-0000aaaa', { worker_id: 'w-0000aaaa', status: 'running', last_output: 'ok', updated_at: new Date().toISOString() });
    const loop = createMonitorLoop(db, busDir, { intervalMs: 100, staleThresholdMs: 30_000 });
    await loop.tick();
    const w = db.prepare("SELECT * FROM workers WHERE id = 'w-0000aaaa'").get() as any;
    expect(w.status).toBe('running');
  });
});
