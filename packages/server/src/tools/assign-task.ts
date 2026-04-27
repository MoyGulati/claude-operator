import type Database from 'better-sqlite3';

interface AssignTaskInput {
  goal: string;
  project_path: string;
  priority: number;
  constraints: string;
}

export function assignTask(db: Database.Database, input: AssignTaskInput): { id: number } {
  if (!input.project_path) throw new Error('project_path is required');
  if (!input.goal) throw new Error('goal is required');

  const result = db.prepare(
    "INSERT INTO tasks (goal, project_path, status, retry_count) VALUES (?, ?, 'pending', 0)"
  ).run(input.goal, input.project_path);

  return { id: result.lastInsertRowid as number };
}
