import express from 'express';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { openDb, applySchema } from 'claude-operator';
import { healthRouter } from './routes/health.js';
import { createTasksRouter } from './routes/tasks.js';
import { createWorkersRouter } from './routes/workers.js';
import { createGuardrailsRouter } from './routes/guardrails.js';
import { createMemoryRouter } from './routes/memory.js';
import { createJudgmentCallsRouter } from './routes/judgment-calls.js';
import { logsRouter } from './routes/logs.js';

const DB_PATH = join(homedir(), '.claude-operator', 'operator.db');
const PORT = parseInt(process.env.DASHBOARD_PORT ?? '7373', 10);
const db = openDb(DB_PATH);
applySchema(db);

const OPERATOR_TOKEN = process.env.OPERATOR_TOKEN;

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

app.use('/health', healthRouter);

// Require token for all write (non-GET) API requests when OPERATOR_TOKEN is set
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  if (OPERATOR_TOKEN && req.headers['x-operator-token'] !== OPERATOR_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
});

app.use('/api/tasks', createTasksRouter(db));
app.use('/api/workers', createWorkersRouter(db));
app.use('/api/guardrails', createGuardrailsRouter(db));
app.use('/api/memory', createMemoryRouter(db));
app.use('/api/judgment-calls', createJudgmentCallsRouter(db));
app.use('/api/logs', logsRouter);

app.listen(PORT, '127.0.0.1', () => {
  console.log(`claude-operator dashboard running at http://localhost:${PORT}`);
});
