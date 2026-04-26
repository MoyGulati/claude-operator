import type Database from 'better-sqlite3';
import { readHeartbeat, isStale } from '../bus/reader.js';
import { withTimeout } from '../timeout.js';

interface MonitorLoopOptions {
  intervalMs: number;
  staleThresholdMs: number;
}

export function createMonitorLoop(db: Database.Database, busDir: string, opts: MonitorLoopOptions) {
  async function tick(): Promise<void> {
    const activeWorkers = db.prepare(
      "SELECT * FROM workers WHERE status IN ('running', 'blocked', 'stalled')"
    ).all() as any[];

    for (const worker of activeWorkers) {
      await withTimeout(async () => {
        const heartbeat = readHeartbeat(busDir, worker.id);

        if (!heartbeat || isStale(heartbeat, opts.staleThresholdMs)) {
          db.prepare("UPDATE workers SET status = 'stalled', updated_at = datetime('now') WHERE id = ?")
            .run(worker.id);
          return;
        }

        if (heartbeat.status !== worker.status || heartbeat.last_output !== worker.last_output) {
          db.prepare("UPDATE workers SET status = ?, last_output = ?, last_heartbeat_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
            .run(heartbeat.status, heartbeat.last_output, worker.id);
        }
      }, 25_000).catch(() => {
        // timeout — skip this worker this tick
      });
    }
  }

  function start(): NodeJS.Timeout {
    return setInterval(() => { tick().catch(() => {}); }, opts.intervalMs);
  }

  return { tick, start };
}
