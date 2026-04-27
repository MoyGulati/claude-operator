import { describe, it, expect } from 'vitest';
import { withTimeout } from '../src/timeout.js';

describe('withTimeout', () => {
  it('resolves when fn completes before timeout', async () => {
    const result = await withTimeout(() => Promise.resolve(42), 1000);
    expect(result).toBe(42);
  });

  it('rejects with TimeoutError when fn exceeds timeout', async () => {
    const fn = () => new Promise<never>(r => setTimeout(r, 500));
    await expect(withTimeout(fn, 50)).rejects.toThrow('timed out');
  });
});
