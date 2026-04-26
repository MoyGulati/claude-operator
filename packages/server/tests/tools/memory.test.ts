import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateMemory } from '../../src/tools/update-memory.js';
import { searchMemory } from '../../src/tools/search-memory.js';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let db: Database.Database;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'op-mem-'));
  db = openDb(join(tmpDir, 'test.db'));
  applySchema(db);
});
afterEach(() => { db.close(); rmSync(tmpDir, { recursive: true }); });

describe('update_memory', () => {
  it('inserts global memory with pending_classification=true', () => {
    const result = updateMemory(db, { tier: 'global', pattern: 'use pnpm not npm', context: 'monorepo', outcome: 'success' });
    expect(result.id).toBeTypeOf('number');
    const row = db.prepare('SELECT * FROM memory_global WHERE id = ?').get(result.id) as any;
    expect(row.pending_classification).toBe(1);
    expect(row.confidence).toBe(0.5);
  });

  it('inserts project memory with project_path', () => {
    const result = updateMemory(db, { tier: 'project', pattern: 'use tsx for dev', context: 'shawt', outcome: 'ok', project_path: '/repo' });
    const row = db.prepare('SELECT * FROM memory_project WHERE id = ?').get(result.id) as any;
    expect(row.project_path).toBe('/repo');
  });
});

describe('search_memory', () => {
  it('finds confirmed memory by FTS keyword', () => {
    const { id } = updateMemory(db, { tier: 'global', pattern: 'use pnpm workspace for monorepo', context: 'setup', outcome: 'success' });
    // confirm it (remove pending_classification)
    db.prepare('UPDATE memory_global SET pending_classification = 0 WHERE id = ?').run(id);
    const results = searchMemory(db, { query: 'pnpm' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].pattern).toContain('pnpm');
  });

  it('returns empty array when no match', () => {
    const results = searchMemory(db, { query: 'nonexistent_xyz_abc' });
    expect(results).toHaveLength(0);
  });
});
