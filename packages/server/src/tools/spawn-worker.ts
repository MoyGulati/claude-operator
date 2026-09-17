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
  if (input.allowed_tools && !/^[a-zA-Z0-9_,*() ]+$/.test(input.allowed_tools)) {
    throw new Error('allowed_tools contains invalid characters');
  }
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
    // The binary is overridable so this is testable without the real CLI on
    // PATH. Default unchanged, so production behaviour is identical.
    const claudeBin = process.env.CLAUDE_OPERATOR_CLAUDE_BIN ?? 'claude';
    const child = spawn(claudeBin, [
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
    // Without this, a missing/unspawnable binary surfaces as an UNHANDLED

    // error rather than a handled one. On a machine without the CLI on PATH

    // that failed a CI run in which all 42 tests passed, and the message

    // named no cause. `stdio: 'ignore'` means this is the only channel.

    child.on('error', (err) => {

      console.error(`[spawn-worker] failed to spawn "${claudeBin}": ${err.message}`);

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
