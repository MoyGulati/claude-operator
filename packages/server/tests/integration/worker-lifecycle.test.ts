import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import { assignTask } from '../../src/tools/assign-task.js';
import { getWorkerStatus } from '../../src/tools/get-worker-status.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import type Database from 'better-sqlite3';

const claudeAvailable = (() => {
  try { execSync('which claude', { stdio: 'pipe' }); return true; } catch { return false; }
})();

describe.skipIf(!claudeAvailable)('worker lifecycle integration', () => {
  let db: Database.Database;
  let tmpDir: string;
  let busDir: string;
  let repoDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'op-int-'));
    busDir = join(tmpDir, 'bus');
    repoDir = join(tmpDir, 'repo');
    execSync(`mkdir -p "${repoDir}"`);
    execSync('git init -b main', { cwd: repoDir });
    execSync('git config user.email "t@t.com"', { cwd: repoDir });
    execSync('git config user.name "T"', { cwd: repoDir });
    execSync('git commit -m "init" --allow-empty', { cwd: repoDir });
    db = openDb(join(tmpDir, 'test.db'));
    applySchema(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true });
  });

  it('assigns task and no workers exist before spawn', () => {
    const { id } = assignTask(db, { goal: 'echo hello', project_path: repoDir, priority: 1, constraints: '' });
    expect(id).toBeTypeOf('number');
    const workers = getWorkerStatus(db, busDir, {});
    expect(workers.length).toBe(0);
  });
});

describe('worker lifecycle (always-run)', () => {
  let db: Database.Database;
  let tmpDir: string;
  let busDir: string;
  let repoDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'op-int2-'));
    busDir = join(tmpDir, 'bus');
    repoDir = join(tmpDir, 'repo');
    execSync(`mkdir -p "${repoDir}"`);
    execSync('git init -b main', { cwd: repoDir });
    execSync('git config user.email "t@t.com"', { cwd: repoDir });
    execSync('git config user.name "T"', { cwd: repoDir });
    execSync('git commit -m "init" --allow-empty', { cwd: repoDir });
    db = openDb(join(tmpDir, 'test.db'));
    applySchema(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true });
  });

  it('task is inserted and retrievable', () => {
    const { id } = assignTask(db, { goal: 'fix the bug', project_path: repoDir, priority: 1, constraints: '' });
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    expect(task.goal).toBe('fix the bug');
    expect(task.status).toBe('pending');
  });

  it('task transitions to active after worker is assigned manually', () => {
    const { id } = assignTask(db, { goal: 'refactor', project_path: repoDir, priority: 1, constraints: '' });
    db.prepare("INSERT INTO workers (id, task_id, type, status, last_output, worktree_path, worktree_branch) VALUES ('w-manual', ?, 'headless', 'running', '', '/wt', 'operator/w-manual')").run(id);
    db.prepare("UPDATE tasks SET status = 'active', worker_id = 'w-manual' WHERE id = ?").run(id);
    const workers = getWorkerStatus(db, busDir, {});
    expect(workers[0].bus_status).toBe('stalled');
  });
});
