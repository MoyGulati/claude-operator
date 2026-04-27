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

  // Resolve dashboard relative to the claude-operator server package install
  let dashboardStarted = false;
  try {
    const serverPkgDir = require.resolve('claude-operator/dist/server.js').replace(/\/dist\/server\.js$/, '');
    const dashboardBin = join(serverPkgDir, 'dist', 'dashboard', 'server.js');
    const dashboard = spawn(process.execPath, [dashboardBin], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });
    dashboard.unref();
    dashboardStarted = true;
  } catch {
    // dashboard not found — MCP server still works
  }

  console.log(`MCP server PID: ${server.pid ?? 'unknown'}`);
  if (dashboardStarted) {
    console.log('Dashboard: http://localhost:7373');
  } else {
    console.log('Dashboard not found — install claude-operator-dashboard globally to enable.');
  }
}
