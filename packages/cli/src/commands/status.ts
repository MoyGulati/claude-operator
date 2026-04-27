import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PID_PATH = join(homedir(), '.claude-operator', 'server.pid');

export async function runStatus(): Promise<void> {
  if (!existsSync(PID_PATH)) {
    console.log('claude-operator is not running (no PID file)');
    return;
  }

  const pid = readFileSync(PID_PATH, 'utf8').trim();
  try {
    process.kill(Number(pid), 0);
    console.log(`MCP server running (PID ${pid})`);
  } catch {
    console.log(`MCP server not running (stale PID ${pid})`);
  }

  try {
    const res = await fetch('http://localhost:7373/health');
    const data = await res.json() as any;
    console.log(`Dashboard: ok (${data.ts})`);
  } catch {
    console.log('Dashboard: not reachable');
  }
}
