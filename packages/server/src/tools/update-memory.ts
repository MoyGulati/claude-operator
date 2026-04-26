import type Database from 'better-sqlite3';
import type { MemoryTier } from '../types.js';

interface UpdateMemoryInput {
  tier: MemoryTier;
  pattern: string;
  context: string;
  outcome: string;
  project_path?: string;
}

export function updateMemory(db: Database.Database, input: UpdateMemoryInput): { id: number } {
  if (input.tier === 'global') {
    const result = db.prepare(`
      INSERT INTO memory_global (pattern, context, outcome, confidence, used_count, pending_classification)
      VALUES (?, ?, ?, 0.5, 0, 1)
    `).run(input.pattern, input.context, input.outcome);

    const id = result.lastInsertRowid as number;
    db.prepare(`INSERT INTO memory_global_fts(rowid, pattern, context, outcome) VALUES (?, ?, ?, ?)`)
      .run(id, input.pattern, input.context, input.outcome);

    return { id };
  } else {
    if (!input.project_path) throw new Error('project_path required for project-tier memory');
    const result = db.prepare(`
      INSERT INTO memory_project (project_path, pattern, context, outcome, confidence, used_count)
      VALUES (?, ?, ?, ?, 0.5, 0)
    `).run(input.project_path, input.pattern, input.context, input.outcome);

    const id = result.lastInsertRowid as number;
    db.prepare(`INSERT INTO memory_project_fts(rowid, pattern, context, outcome) VALUES (?, ?, ?, ?)`)
      .run(id, input.pattern, input.context, input.outcome);

    return { id };
  }
}
