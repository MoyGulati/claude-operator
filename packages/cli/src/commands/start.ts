import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE_DIR = join(homedir(), '.claude-operator');
const PID_PATH = join(BASE_DIR, 'server.pid');

export function runStart(): void {
  mkdirSync(BASE_DIR, { recursive: true });

  const server = spawn('claude-operator-server', [], {
    detached: true,
    stdio: 'ignore',
  });
  server.unref();

  if (server.pid) {
    writeFileSync(PID_PATH, String(server.pid), 'utf8');
  }

  const dashboardBin = require.resolve('claude-operator-dashboard/dist/server.js');
  const dashboard = spawn(process.execPath, [dashboardBin], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  dashboard.unref();

  console.log(`MCP server PID: ${server.pid ?? 'unknown'}`);
  console.log('Dashboard: http://localhost:7373');
}
