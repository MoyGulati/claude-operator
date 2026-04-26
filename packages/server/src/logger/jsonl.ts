import { appendFileSync, statSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export function createLogger(logPath: string) {
  const dir = dirname(logPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  return function log(fields: Record<string, unknown>): void {
    try {
      if (existsSync(logPath) && statSync(logPath).size > MAX_BYTES) {
        renameSync(logPath, `${logPath}.${Date.now()}.bak`);
      }
      const entry = JSON.stringify({ ts: new Date().toISOString(), ...fields });
      appendFileSync(logPath, entry + '\n', 'utf8');
    } catch {
      // logger must never throw
    }
  };
}
