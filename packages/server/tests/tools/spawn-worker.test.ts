import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnWorker } from '../../src/tools/spawn-worker.js';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

let db: Database.Database;
let tmpDir: string;
let busDir: string;
let repoDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'op-spawn-'));
  busDir = join(tmpDir, 'bus');
  repoDir = join(tmpDir, 'repo');
  execSync(`mkdir -p "${repoDir}"`);
  execSync('git init -b main', { cwd: repoDir });
  execSync('git config user.email "t@t.com"', { cwd: repoDir });
  execSync('git config user.name "T"', { cwd: repoDir });
  execSync('git commit -m "init" --allow-empty', { cwd: repoDir });
  db = openDb(join(tmpDir, 'test.db'));
  applySchema(db);
  db.prepare("INSERT INTO tasks (goal, project_path, status, retry_count) VALUES ('test goal', ?, 'pending', 0)").run(repoDir);
});
afterEach(() => { db.close(); rmSync(tmpDir, { recursive: true }); });

describe('spawn_worker', () => {
  it('inserts worker row with worktree_branch set', () => {
    const result = spawnWorker(db, busDir, { task_id: 1, type: 'headless', allowed_tools: 'Edit,Bash' });
    expect(result.worker_id).toMatch(/^w-/);
    const row = db.prepare('SELECT * FROM workers WHERE id = ?').get(result.worker_id) as any;
    expect(row.worktree_branch).toMatch(/^operator\//);
    expect(row.status).toBe('running');
  });
});
