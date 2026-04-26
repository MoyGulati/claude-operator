import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkerHeartbeat } from '../types.js';

export function writeHeartbeat(busDir: string, workerId: string, heartbeat: WorkerHeartbeat): void {
  if (!existsSync(busDir)) mkdirSync(busDir, { recursive: true });
  const filePath = join(busDir, `${workerId}.json`);
  writeFileSync(filePath, JSON.stringify(heartbeat), 'utf8');
}
