import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { openDb } from './db/connection.js';
import { applySchema } from './db/schema.js';
import { createLogger } from './logger/jsonl.js';
import { createMonitorLoop } from './monitor/loop.js';
import { initOtel, shutdownOtel } from './otel/tracer.js';
import { assignTask } from './tools/assign-task.js';
import { spawnWorker } from './tools/spawn-worker.js';
import { injectInstruction } from './tools/inject-instruction.js';
import { getWorkerStatus } from './tools/get-worker-status.js';
import { setGuardrail } from './tools/set-guardrail.js';
import { getGuardrails } from './tools/get-guardrails.js';
import { updateMemory } from './tools/update-memory.js';
import { searchMemory } from './tools/search-memory.js';
import { logJudgmentCall } from './tools/log-judgment-call.js';
import { completeTask } from './tools/complete-task.js';

const BASE_DIR = process.env['CLAUDE_OPERATOR_BASE_DIR'] ?? join(homedir(), '.claude-operator');
const DB_PATH = join(BASE_DIR, 'operator.db');
const BUS_DIR = join(BASE_DIR, 'bus');
const LOG_PATH = join(BASE_DIR, 'logs', 'operator.jsonl');

async function main() {
  initOtel();

  const db = openDb(DB_PATH);
  applySchema(db);
  const log = createLogger(LOG_PATH);

  const monitor = createMonitorLoop(db, BUS_DIR, { intervalMs: 30_000, staleThresholdMs: 30_000 });
  monitor.start();

  const server = new McpServer({ name: 'claude-operator', version: '0.1.0' });

  function wrap<T>(name: string, fn: () => T): T {
    const start = Date.now();
    try {
      const result = fn();
      log({ event: 'tool_call', tool: name, duration_ms: Date.now() - start, result: 'ok' });
      return result;
    } catch (e: any) {
      log({ event: 'tool_call', tool: name, duration_ms: Date.now() - start, result: 'error', error: e.message });
      throw e;
    }
  }

  server.tool('assign_task',
    { goal: z.string(), project_path: z.string(), priority: z.number().default(1), constraints: z.string().default('') },
    async (input) => ({ content: [{ type: 'text' as const, text: JSON.stringify(wrap('assign_task', () => assignTask(db, input))) }] }),
  );

  server.tool('spawn_worker',
    { task_id: z.number(), type: z.enum(['named', 'headless']).default('headless'), allowed_tools: z.string().default('Edit,Bash,Read'), session_name: z.string().optional() },
    async (input) => ({ content: [{ type: 'text' as const, text: JSON.stringify(wrap('spawn_worker', () => spawnWorker(db, BUS_DIR, input))) }] }),
  );

  server.tool('inject_instruction',
    { worker_id: z.string(), instruction: z.string() },
    async (input) => { wrap('inject_instruction', () => injectInstruction(BUS_DIR, input)); return { content: [{ type: 'text' as const, text: 'ok' }] }; },
  );

  server.tool('get_worker_status',
    { worker_id: z.string().optional() },
    async (input) => ({ content: [{ type: 'text' as const, text: JSON.stringify(wrap('get_worker_status', () => getWorkerStatus(db, BUS_DIR, input))) }] }),
  );

  server.tool('set_guardrail',
    { rule: z.string(), scope: z.enum(['global', 'project']).default('global'), created_by: z.enum(['human', 'operator']).default('human'), project_path: z.string().optional(), source_judgment_call_id: z.number().optional(), max_concurrent_workers: z.number().default(3), max_tokens_per_task: z.number().optional(), cost_alert_threshold_usd: z.number().optional(), worker_permission_level: z.enum(['standard', 'elevated', 'sandboxed']).default('standard') },
    async (input) => ({ content: [{ type: 'text' as const, text: JSON.stringify(wrap('set_guardrail', () => setGuardrail(db, input))) }] }),
  );

  server.tool('get_guardrails',
    { scope: z.enum(['global', 'project']).optional(), project_path: z.string().optional(), active_only: z.boolean().default(true) },
    async (input) => ({ content: [{ type: 'text' as const, text: JSON.stringify(wrap('get_guardrails', () => getGuardrails(db, input))) }] }),
  );

  server.tool('update_memory',
    { tier: z.enum(['global', 'project']), pattern: z.string(), context: z.string().default(''), outcome: z.string().default(''), project_path: z.string().optional() },
    async (input) => ({ content: [{ type: 'text' as const, text: JSON.stringify(wrap('update_memory', () => updateMemory(db, input))) }] }),
  );

  server.tool('search_memory',
    { query: z.string(), project_path: z.string().optional(), limit: z.number().default(10) },
    async (input) => ({ content: [{ type: 'text' as const, text: JSON.stringify(wrap('search_memory', () => searchMemory(db, input))) }] }),
  );

  server.tool('log_judgment_call',
    { task_id: z.number(), source: z.enum(['memory', 'internet', 'operator_reasoning']), decision: z.string(), context: z.string().default(''), outcome: z.enum(['success', 'failure', 'unknown']).default('unknown') },
    async (input) => ({ content: [{ type: 'text' as const, text: JSON.stringify(wrap('log_judgment_call', () => logJudgmentCall(db, input))) }] }),
  );

  server.tool('complete_task',
    { task_id: z.number(), worker_id: z.string(), result: z.string().default(''), skip_worktree_ops: z.boolean().default(false) },
    async (input) => { wrap('complete_task', () => completeTask(db, input)); return { content: [{ type: 'text' as const, text: 'ok' }] }; },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on('SIGINT', async () => {
    await shutdownOtel();
    db.close();
    process.exit(0);
  });
}

main().catch(console.error);
