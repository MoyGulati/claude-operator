import type Database from 'better-sqlite3';
import type { Guardrail, GuardrailScope } from '../types.js';

interface GetGuardrailsInput {
  scope?: GuardrailScope;
  project_path?: string;
  active_only?: boolean;
}

export function getGuardrails(db: Database.Database, input: GetGuardrailsInput): Guardrail[] {
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];

  if (input.active_only !== false) {
    conditions.push('active = 1');
  }
  if (input.scope) {
    conditions.push('scope = ?');
    params.push(input.scope);
  }
  if (input.project_path) {
    conditions.push("(project_path = ? OR scope = 'global')");
    params.push(input.project_path);
  }

  const rows = db.prepare(
    `SELECT * FROM guardrails WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`
  ).all(...params) as any[];

  return rows.map(r => ({ ...r, active: Boolean(r.active) })) as Guardrail[];
}
