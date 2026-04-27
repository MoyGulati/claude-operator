import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../../src/logger/jsonl.js';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tmpDir: string;

beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'op-log-')); });
afterEach(() => { rmSync(tmpDir, { recursive: true }); });

describe('jsonl logger', () => {
  it('writes a log entry as valid JSON line', () => {
    const log = createLogger(join(tmpDir, 'operator.jsonl'));
    log({ event: 'tool_call', tool: 'assign_task', duration_ms: 10 });
    const content = readFileSync(join(tmpDir, 'operator.jsonl'), 'utf8');
    const parsed = JSON.parse(content.trim());
    expect(parsed.event).toBe('tool_call');
    expect(parsed.tool).toBe('assign_task');
    expect(typeof parsed.ts).toBe('string');
  });

  it('appends multiple entries', () => {
    const log = createLogger(join(tmpDir, 'operator.jsonl'));
    log({ event: 'a' });
    log({ event: 'b' });
    const lines = readFileSync(join(tmpDir, 'operator.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1]).event).toBe('b');
  });
});
