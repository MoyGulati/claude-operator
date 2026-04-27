import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface InjectInstructionInput {
  worker_id: string;
  instruction: string;
}

export function injectInstruction(busDir: string, input: InjectInstructionInput): void {
  if (!existsSync(busDir)) mkdirSync(busDir, { recursive: true });
  const filePath = join(busDir, `${input.worker_id}.instruction.json`);
  writeFileSync(filePath, JSON.stringify({
    instruction: input.instruction,
    sent_at: new Date().toISOString(),
  }), 'utf8');
}
