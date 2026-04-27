import { execSync } from 'node:child_process';

export interface VerifyResult {
  success: boolean;
  output: string;
  command: string | null;
}

export function runVerify(projectPath: string, command: string | null, timeoutMs = 60_000): VerifyResult {
  if (!command) {
    return { success: false, output: 'No verify command found', command: null };
  }
  try {
    const output = execSync(command, {
      cwd: projectPath,
      timeout: timeoutMs,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { success: true, output, command };
  } catch (e: any) {
    return { success: false, output: e.stdout ?? e.message, command };
  }
}
