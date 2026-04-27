import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

function git(args: string[], cwd: string): void {
  const result = spawnSync('git', args, { cwd, stdio: 'pipe' });
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() ?? `git ${args[0]} failed`);
  }
}

export function addWorktree(projectPath: string, workerId: string): string {
  const branch = `operator/${workerId}`;
  const wtPath = join(projectPath, '.worktrees', workerId);
  git(['worktree', 'add', wtPath, '-b', branch], projectPath);
  return wtPath;
}

export function removeWorktree(projectPath: string, worktreePath: string): void {
  git(['worktree', 'remove', worktreePath, '--force'], projectPath);
}

export function mergeWorktreeBranch(projectPath: string, branch: string): void {
  git(['merge', branch, '--no-ff', '-m', `chore: merge worker branch ${branch}`], projectPath);
}
