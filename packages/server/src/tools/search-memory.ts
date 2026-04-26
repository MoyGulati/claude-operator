import type Database from 'better-sqlite3';

interface SearchMemoryInput {
  query: string;
  project_path?: string;
  limit?: number;
}

export function searchMemory(db: Database.Database, input: SearchMemoryInput) {
  const limit = input.limit ?? 10;
  const results: any[] = [];

  try {
    const globalRows = db.prepare(`
      SELECT mg.*, 'global' as tier
      FROM memory_global_fts fts
      JOIN memory_global mg ON mg.id = fts.rowid
      WHERE memory_global_fts MATCH ?
        AND mg.pending_classification = 0
        AND mg.confidence >= 0.2
      LIMIT ?
    `).all(input.query, limit) as any[];
    results.push(...globalRows);
  } catch { /* FTS error — no results */ }

  if (input.project_path) {
    try {
      const projectRows = db.prepare(`
        SELECT mp.*, 'project' as tier
        FROM memory_project_fts fts
        JOIN memory_project mp ON mp.id = fts.rowid
        WHERE memory_project_fts MATCH ?
          AND mp.project_path = ?
          AND mp.confidence >= 0.2
        LIMIT ?
      `).all(input.query, input.project_path, limit) as any[];
      results.push(...projectRows);
    } catch { /* FTS error */ }
  }

  return results.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
}
