import type Database from 'better-sqlite3';
import type { JudgmentOutcome } from '../types.js';

interface LogJudgmentCallInput {
  task_id: number;
  source: 'memory' | 'internet' | 'operator_reasoning';
  decision: string;
  context: string;
  outcome: JudgmentOutcome;
}

export function logJudgmentCall(db: Database.Database, input: LogJudgmentCallInput): { id: number } {
  const result = db.prepare(`
    INSERT INTO judgment_calls (task_id, source, decision, context, outcome, reviewed)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(input.task_id, input.source, input.decision, input.context, input.outcome);
  return { id: result.lastInsertRowid as number };
}
