import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SERVER_BIN = join(import.meta.dirname, '../../dist/server.js');

let proc: ChildProcessWithoutNullStreams;
let baseDir: string;
let idCounter = 0;
const pending = new Map<number, (r: unknown) => void>();

function sendRpc(method: string, params: unknown): Promise<unknown> {
  const id = ++idCounter;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

beforeAll(async () => {
  baseDir = mkdtempSync(join(tmpdir(), 'op-e2e-'));

  proc = spawn(process.execPath, [SERVER_BIN], {
    env: { ...process.env, CLAUDE_OPERATOR_BASE_DIR: baseDir },
    stdio: ['pipe', 'pipe', 'pipe'],
  }) as ChildProcessWithoutNullStreams;

  const rl = createInterface({ input: proc.stdout });
  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        const resolve = pending.get(msg.id)!;
        pending.delete(msg.id);
        resolve(msg);
      }
    } catch {
      // non-JSON line (e.g. MCP protocol preamble) — ignore
    }
  });

  // Handshake
  await sendRpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'e2e-test', version: '0.0.1' },
  });
}, 15_000);

afterAll(() => {
  proc.kill();
  rmSync(baseDir, { recursive: true });
});

describe('MCP flow: assign_task → spawn_worker', () => {
  it('initialize returns correct serverInfo', async () => {
    const resp = await sendRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'e2e-test', version: '0.0.1' },
    }) as any;
    expect(resp.result.serverInfo.name).toBe('claude-operator');
  });

  it('assign_task creates a task and returns numeric id', async () => {
    const resp = await sendRpc('tools/call', {
      name: 'assign_task',
      arguments: {
        goal: 'e2e smoke test goal',
        project_path: baseDir,
      },
    }) as any;
    const result = JSON.parse(resp.result.content[0].text);
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
  });

  it('spawn_worker (named) creates worker row and returns valid worker_id', async () => {
    // First create a task to reference
    const assignResp = await sendRpc('tools/call', {
      name: 'assign_task',
      arguments: { goal: 'worker test goal', project_path: baseDir },
    }) as any;
    const { id: taskId } = JSON.parse(assignResp.result.content[0].text);

    // Spawn named worker (type: 'named' skips claude invocation)
    const spawnResp = await sendRpc('tools/call', {
      name: 'spawn_worker',
      arguments: { task_id: taskId, type: 'named', allowed_tools: 'Edit,Bash' },
    }) as any;
    const result = JSON.parse(spawnResp.result.content[0].text);
    expect(result.worker_id).toMatch(/^w-[0-9a-f]{8}$/);
  });
});
