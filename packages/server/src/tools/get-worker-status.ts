import type Database from 'better-sqlite3';
import { readHeartbeat, isStale } from '../bus/reader.js';

interface GetWorkerStatusInput {
  worker_id?: string;
}

export function getWorkerStatus(db: Database.Database, busDir: string, input: GetWorkerStatusInput) {
  const query = input.worker_id
    ? 'SELECT * FROM workers WHERE id = ?'
    : "SELECT * FROM workers WHERE status NOT IN ('done', 'failed')";
  const params = input.worker_id ? [input.worker_id] : [];
  const workers = db.prepare(query).all(...params) as any[];

  return workers.map(w => {
    const heartbeat = readHeartbeat(busDir, w.id);
    const busStatus = heartbeat
      ? (isStale(heartbeat, 30_000) ? 'stalled' : heartbeat.status)
      : 'stalled';

    return {
      ...w,
      bus_status: busStatus,
      bus_output: heartbeat?.last_output ?? '',
    };
  });
}
