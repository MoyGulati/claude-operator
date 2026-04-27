import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkerHeartbeat } from '../types.js';

function assertWorkerIdSafe(workerId: string): void {
  if (!/^w-[0-9a-f]{8}$/.test(workerId)) throw new Error(`invalid worker_id: ${workerId}`);
}

export function writeHeartbeat(busDir: string, workerId: string, heartbeat: WorkerHeartbeat): void {
  assertWorkerIdSafe(workerId);
  if (!existsSync(busDir)) mkdirSync(busDir, { recursive: true });
  const filePath = join(busDir, `${workerId}.json`);
  writeFileSync(filePath, JSON.stringify(heartbeat), 'utf8');
}
