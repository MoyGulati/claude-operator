import { existsSync, accessSync, constants, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function detectVerifyCommand(projectPath: string): string | null {
  const verifyScript = join(projectPath, 'verify.sh');
  if (existsSync(verifyScript)) {
    try {
      accessSync(verifyScript, constants.X_OK);
      return './verify.sh';
    } catch { /* not executable */ }
  }

  const pkgJson = join(projectPath, 'package.json');
  if (existsSync(pkgJson)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'));
      if (pkg.scripts?.test) return 'npm test';
    } catch { /* invalid JSON */ }
  }

  const pytestCandidates = ['tests/', 'test/', 'pytest.ini', 'pyproject.toml'];
  if (pytestCandidates.some(c => existsSync(join(projectPath, c)))) {
    return 'pytest';
  }

  return null;
}
