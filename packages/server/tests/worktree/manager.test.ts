import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { addWorktree, removeWorktree } from '../../src/worktree/manager.js';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let repoDir: string;

beforeEach(() => {
  repoDir = mkdtempSync(join(tmpdir(), 'op-wt-'));
  execSync('git init -b main', { cwd: repoDir });
  execSync('git config user.email "test@test.com"', { cwd: repoDir });
  execSync('git config user.name "Test"', { cwd: repoDir });
  execSync('git commit -m "init" --allow-empty', { cwd: repoDir });
});

afterEach(() => { rmSync(repoDir, { recursive: true }); });

describe('worktree manager', () => {
  it('adds a worktree on a new branch', () => {
    const wtPath = addWorktree(repoDir, 'w-test-1');
    expect(wtPath).toContain('w-test-1');
    const branches = execSync('git branch', { cwd: repoDir }).toString();
    expect(branches).toContain('operator/w-test-1');
    removeWorktree(repoDir, wtPath);
  });

  it('removes a worktree cleanly', () => {
    const wtPath = addWorktree(repoDir, 'w-test-2');
    removeWorktree(repoDir, wtPath);
    const wts = execSync('git worktree list', { cwd: repoDir }).toString();
    expect(wts).not.toContain('w-test-2');
  });
});
