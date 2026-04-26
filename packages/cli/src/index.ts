#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runStart } from './commands/start.js';
import { runStatus } from './commands/status.js';
import { runRetro } from './commands/retro.js';

const program = new Command();

program
  .name('claude-operator')
  .description('Autonomous multi-worker orchestrator for Claude Code')
  .version('0.1.0');

program.command('init').description('Add claude-operator to ~/.claude/settings.json').action(runInit);
program.command('start').description('Start MCP server + dashboard daemon').action(runStart);
program.command('status').description('Show running status and active workers').action(() => runStatus().catch(console.error));
program.command('retro').description('Start retrospective — surface unreviewed judgment calls').action(runRetro);

program.parse();
