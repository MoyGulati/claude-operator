import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { injectInstruction } from '../../src/tools/inject-instruction.js';
import { writeHeartbeat } from '../../src/bus/writer.js';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let busDir: string;

beforeEach(() => { busDir = mkdtempSync(join(tmpdir(), 'op-inj-')); });
afterEach(() => { rmSync(busDir, { recursive: true }); });

describe('inject_instruction', () => {
  it('writes instruction file to bus dir', () => {
    writeHeartbeat(busDir, 'w-0000aaaa', { worker_id: 'w-0000aaaa', status: 'blocked', last_output: '', updated_at: new Date().toISOString() });
    injectInstruction(busDir, { worker_id: 'w-0000aaaa', instruction: 'try a different approach' });
    const instr = JSON.parse(readFileSync(join(busDir, 'w-0000aaaa.instruction.json'), 'utf8'));
    expect(instr.instruction).toBe('try a different approach');
    expect(typeof instr.sent_at).toBe('string');
  });
});
