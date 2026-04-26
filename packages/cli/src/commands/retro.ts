import { openDb, applySchema } from 'claude-operator';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function runRetro(): void {
  const db = openDb(join(homedir(), '.claude-operator', 'operator.db'));
  applySchema(db);

  const unreviewed = db.prepare(
    'SELECT jc.*, t.goal FROM judgment_calls jc JOIN tasks t ON t.id = jc.task_id WHERE jc.reviewed = 0 ORDER BY jc.created_at DESC'
  ).all() as any[];

  if (unreviewed.length === 0) {
    console.log('No unreviewed judgment calls. Nothing to retro.');
    db.close();
    return;
  }

  console.log(`\n${unreviewed.length} unreviewed judgment calls:\n`);
  for (const jc of unreviewed) {
    console.log(`[${jc.id}] Task: "${jc.goal}"`);
    console.log(`  Source: ${jc.source} | Outcome: ${jc.outcome}`);
    console.log(`  Decision: ${jc.decision}`);
    console.log('  Open dashboard at http://localhost:7373 (Judgment Calls tab) to review.\n');
  }

  db.close();
}
