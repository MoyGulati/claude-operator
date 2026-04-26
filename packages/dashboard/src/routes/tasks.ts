import { Router, type Router as ExpressRouter } from 'express';
import type Database from 'better-sqlite3';

export function createTasksRouter(db: Database.Database): ExpressRouter {
  const router = Router();

  router.get('/', (_req, res) => {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100').all();
    res.json(tasks);
  });

  return router;
}
