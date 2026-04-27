import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readHeartbeat, isStale } from '../../src/bus/reader.js';
import { writeHeartbeat } from '../../src/bus/writer.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let busDir: string;

beforeEach(() => { busDir = mkdtempSync(join(tmpdir(), 'op-bus-')); });
afterEach(() => { rmSync(busDir, { recursive: true }); });

describe('bus reader', () => {
  it('returns null for missing worker', () => {
    expect(readHeartbeat(busDir, 'nonexistent')).toBeNull();
  });

  it('detects stale heartbeat (>30s old)', () => {
    const oldTime = new Date(Date.now() - 35_000).toISOString();
    writeHeartbeat(busDir, 'w-0000bbbb', { status: 'running', last_output: '', worker_id: 'w-0000bbbb', updated_at: oldTime });
    const h = readHeartbeat(busDir, 'w-0000bbbb')!;
    expect(isStale(h, 30_000)).toBe(true);
  });

  it('fresh heartbeat is not stale', () => {
    writeHeartbeat(busDir, 'w-0000cccc', { status: 'running', last_output: '', worker_id: 'w-0000cccc', updated_at: new Date().toISOString() });
    const h = readHeartbeat(busDir, 'w-0000cccc')!;
    expect(isStale(h, 30_000)).toBe(false);
  });
});
