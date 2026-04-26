import type Database from 'better-sqlite3';
import type { GuardrailScope } from '../types.js';

interface SetGuardrailInput {
  rule: string;
  scope: GuardrailScope;
  created_by: 'human' | 'operator';
  project_path?: string;
  source_judgment_call_id?: number;
  max_concurrent_workers?: number;
  max_tokens_per_task?: number;
  cost_alert_threshold_usd?: number;
  worker_permission_level?: string;
}

export function setGuardrail(db: Database.Database, input: SetGuardrailInput): { id: number } {
  if (!input.rule) throw new Error('rule is required');
  const result = db.prepare(`
    INSERT INTO guardrails
      (rule, scope, project_path, created_by, source_judgment_call_id,
       max_concurrent_workers, max_tokens_per_task, cost_alert_threshold_usd, worker_permission_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.rule,
    input.scope,
    input.project_path ?? null,
    input.created_by,
    input.source_judgment_call_id ?? null,
    input.max_concurrent_workers ?? 3,
    input.max_tokens_per_task ?? null,
    input.cost_alert_threshold_usd ?? null,
    input.worker_permission_level ?? 'standard',
  );
  return { id: result.lastInsertRowid as number };
}
