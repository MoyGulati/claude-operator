import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setGuardrail } from '../../src/tools/set-guardrail.js';
import { getGuardrails } from '../../src/tools/get-guardrails.js';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import type Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let db: Database.Database;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'op-gr-'));
  db = openDb(join(tmpDir, 'test.db'));
  applySchema(db);
});
afterEach(() => { db.close(); rmSync(tmpDir, { recursive: true }); });

describe('set_guardrail', () => {
  it('inserts active guardrail', () => {
    const result = setGuardrail(db, { rule: 'no force push', scope: 'global', created_by: 'human' });
    expect(result.id).toBeTypeOf('number');
    const rows = getGuardrails(db, {});
    expect(rows.length).toBe(1);
    expect(rows[0].rule).toBe('no force push');
    expect(rows[0].active).toBe(true);
  });

  it('filters by scope', () => {
    setGuardrail(db, { rule: 'global rule', scope: 'global', created_by: 'human' });
    setGuardrail(db, { rule: 'project rule', scope: 'project', created_by: 'human', project_path: '/repo' });
    const global = getGuardrails(db, { scope: 'global' });
    expect(global.length).toBe(1);
    expect(global[0].rule).toBe('global rule');
  });
});
