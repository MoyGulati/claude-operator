import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function runInit(): void {
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  let settings: any = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch {
      console.error('Could not parse ~/.claude/settings.json');
      process.exit(1);
    }
  }

  settings.mcpServers ??= {};

  if (settings.mcpServers['claude-operator']) {
    console.log('claude-operator MCP entry already present in ~/.claude/settings.json');
    return;
  }

  settings.mcpServers['claude-operator'] = {
    command: 'claude-operator-server',
    args: [],
  };

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  console.log('claude-operator added to ~/.claude/settings.json');
  console.log('Run "claude-operator start" then open a new Claude Code session.');
}
