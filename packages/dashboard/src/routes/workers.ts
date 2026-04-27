import { Router, type Router as ExpressRouter } from 'express';
import type Database from 'better-sqlite3';

export function createWorkersRouter(db: Database.Database): ExpressRouter {
  const router = Router();

  router.get('/', (_req, res) => {
    const workers = db.prepare('SELECT * FROM workers ORDER BY updated_at DESC').all();
    res.json(workers);
  });

  return router;
}
