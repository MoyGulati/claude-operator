import type Database from 'better-sqlite3';
import { mergeWorktreeBranch, removeWorktree } from '../worktree/manager.js';

interface CompleteTaskInput {
  task_id: number;
  worker_id: string;
  result: string;
  skip_worktree_ops?: boolean;
}

export function completeTask(db: Database.Database, input: CompleteTaskInput): void {
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(input.worker_id) as any;
  if (!worker) throw new Error(`Worker ${input.worker_id} not found`);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(input.task_id) as any;
  if (!task) throw new Error(`Task ${input.task_id} not found`);

  if (!input.skip_worktree_ops && worker.worktree_path && worker.worktree_branch) {
    try {
      mergeWorktreeBranch(task.project_path, worker.worktree_branch);
      removeWorktree(task.project_path, worker.worktree_path);
    } catch (e) {
      throw new Error(`Worktree merge failed: ${(e as Error).message}`);
    }
  }

  db.prepare(`
    UPDATE tasks SET status = 'done', result = ?, completed_at = datetime('now') WHERE id = ?
  `).run(input.result, input.task_id);

  db.prepare("UPDATE workers SET status = 'done', updated_at = datetime('now') WHERE id = ?")
    .run(input.worker_id);
}
