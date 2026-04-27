import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDb } from '../../src/db/connection.js';
import { applySchema } from '../../src/db/schema.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('WAL mode', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'op-wal-')); });
  afterEach(() => { rmSync(tmpDir, { recursive: true }); });

  it('opens with WAL journal mode', () => {
    const db = openDb(join(tmpDir, 'wal.db'));
    applySchema(db);
    const row = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
    expect(row.journal_mode).toBe('wal');
    db.close();
  });

  it('busy_timeout is set', () => {
    const db = openDb(join(tmpDir, 'bt.db'));
    applySchema(db);
    const row = db.prepare("PRAGMA busy_timeout").get() as { timeout: number };
    expect(row.timeout).toBe(5000);
    db.close();
  });
});
