import { Router, type Router as ExpressRouter } from 'express';
import { existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
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
    const MAX_BYTES = 65536; // read last 64KB max
    const stat = statSync(LOG_PATH);
    const start = Math.max(0, stat.size - MAX_BYTES);
    const buf = Buffer.alloc(stat.size - start);
    const fd = openSync(LOG_PATH, 'r');
    readSync(fd, buf, 0, buf.length, start);
    closeSync(fd);
    const lines = buf.toString('utf8').split('\n').filter(Boolean).slice(-500);
    res.write(`data: ${JSON.stringify(lines)}\n\n`);
  }

  sendTail();
  const interval = setInterval(sendTail, 2000);
  req.on('close', () => clearInterval(interval));
});
