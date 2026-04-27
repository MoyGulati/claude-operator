import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeHeartbeat } from '../../src/bus/writer.js';
import { readHeartbeat } from '../../src/bus/reader.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let busDir: string;

beforeEach(() => { busDir = mkdtempSync(join(tmpdir(), 'op-bus-')); });
afterEach(() => { rmSync(busDir, { recursive: true }); });

describe('bus writer', () => {
  it('writes heartbeat JSON file', () => {
    writeHeartbeat(busDir, 'w-0000aaaa', { status: 'running', last_output: 'ok', worker_id: 'w-0000aaaa', updated_at: new Date().toISOString() });
    const h = readHeartbeat(busDir, 'w-0000aaaa');
    expect(h?.status).toBe('running');
    expect(h?.worker_id).toBe('w-0000aaaa');
  });
});
