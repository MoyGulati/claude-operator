import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectVerifyCommand } from '../../src/verify/detector.js';
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'op-vfy-')); });
afterEach(() => { rmSync(dir, { recursive: true }); });

describe('detectVerifyCommand', () => {
  it('prefers verify.sh if executable', () => {
    writeFileSync(join(dir, 'verify.sh'), '#!/bin/sh\nexit 0');
    chmodSync(join(dir, 'verify.sh'), 0o755);
    expect(detectVerifyCommand(dir)).toBe('./verify.sh');
  });

  it('falls back to npm test via package.json', () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'vitest run' } }));
    expect(detectVerifyCommand(dir)).toBe('npm test');
  });

  it('returns null when nothing found', () => {
    expect(detectVerifyCommand(dir)).toBeNull();
  });
});
