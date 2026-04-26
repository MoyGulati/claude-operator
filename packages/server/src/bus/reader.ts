import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkerHeartbeat } from '../types.js';

export function readHeartbeat(busDir: string, workerId: string): WorkerHeartbeat | null {
  const filePath = join(busDir, `${workerId}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as WorkerHeartbeat;
  } catch {
    return null;
  }
}

export function isStale(heartbeat: WorkerHeartbeat, thresholdMs: number): boolean {
  const age = Date.now() - new Date(heartbeat.updated_at).getTime();
  return age > thresholdMs;
}
