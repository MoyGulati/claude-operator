import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { addWorktree } from '../worktree/manager.js';

interface SpawnWorkerInput {
  task_id: number;
  type: 'named' | 'headless';
  allowed_tools: string;
  session_name?: string;
}

export function spawnWorker(db: Database.Database, busDir: string, input: SpawnWorkerInput): { worker_id: string } {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(input.task_id) as any;
  if (!task) throw new Error(`Task ${input.task_id} not found`);

  const workerId = `w-${randomUUID().slice(0, 8)}`;
  const branch = `operator/${workerId}`;
  let worktreePath = '';

  try {
    worktreePath = addWorktree(task.project_path, workerId);
  } catch {
    worktreePath = '';
  }

  let pid: number | null = null;

  if (input.type === 'headless') {
    const child = spawn('claude', [
      '-p', task.goal,
      '--allowedTools', input.allowed_tools,
      '--output-format', 'stream-json',
    ], {
      cwd: worktreePath || task.project_path,
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        CLAUDE_OPERATOR_BUS_DIR: busDir,
        CLAUDE_OPERATOR_WORKER_ID: workerId,
      },
    });
    child.unref();
    pid = child.pid ?? null;
  }

  db.prepare(`
    INSERT INTO workers (id, task_id, type, session_name, pid, status, last_output, worktree_path, worktree_branch)
    VALUES (?, ?, ?, ?, ?, 'running', '', ?, ?)
  `).run(workerId, input.task_id, input.type, input.session_name ?? null, pid, worktreePath, branch);

  db.prepare("UPDATE tasks SET status = 'active', worker_id = ? WHERE id = ?").run(workerId, input.task_id);

  return { worker_id: workerId };
}
