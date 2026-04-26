import { Router, type Router as ExpressRouter } from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LOG_PATH = join(homedir(), '.claude-operator', 'logs', 'operator.jsonl');

export const logsRouter: ExpressRouter = Router();

logsRouter.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sendTail() {
    if (!existsSync(LOG_PATH)) {
      res.write('data: []\n\n');
      return;
    }
    const lines = readFileSync(LOG_PATH, 'utf8').trim().split('\n').slice(-500);
    res.write(`data: ${JSON.stringify(lines)}\n\n`);
  }

  sendTail();
  const interval = setInterval(sendTail, 2000);
  req.on('close', () => clearInterval(interval));
});
