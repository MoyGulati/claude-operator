import { execSync } from 'node:child_process';
import { join } from 'node:path';

export function addWorktree(projectPath: string, workerId: string): string {
  const branch = `operator/${workerId}`;
  const wtPath = join(projectPath, '.worktrees', workerId);
  execSync(`git worktree add "${wtPath}" -b "${branch}"`, {
    cwd: projectPath,
    stdio: 'pipe',
  });
  return wtPath;
}

export function removeWorktree(projectPath: string, worktreePath: string): void {
  execSync(`git worktree remove "${worktreePath}" --force`, {
    cwd: projectPath,
    stdio: 'pipe',
  });
}

export function mergeWorktreeBranch(projectPath: string, branch: string): void {
  execSync(`git merge "${branch}" --no-ff -m "chore: merge worker branch ${branch}"`, {
    cwd: projectPath,
    stdio: 'pipe',
  });
}
