import { Router, type Router as ExpressRouter } from 'express';
import type Database from 'better-sqlite3';

export function createMemoryRouter(db: Database.Database): ExpressRouter {
  const router = Router();

  router.get('/global', (_req, res) => {
    res.json(db.prepare('SELECT * FROM memory_global ORDER BY created_at DESC LIMIT 200').all());
  });

  router.get('/project', (req, res) => {
    const { path } = req.query;
    const rows = path
      ? db.prepare('SELECT * FROM memory_project WHERE project_path = ? ORDER BY created_at DESC').all(path as string)
      : db.prepare('SELECT * FROM memory_project ORDER BY created_at DESC LIMIT 200').all();
    res.json(rows);
  });

  router.post('/global/:id/confirm', (req, res) => {
    db.prepare('UPDATE memory_global SET pending_classification = 0 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
}
