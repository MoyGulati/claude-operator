import { Router, type Router as ExpressRouter } from 'express';
import type Database from 'better-sqlite3';

export function createJudgmentCallsRouter(db: Database.Database): ExpressRouter {
  const router = Router();

  router.get('/', (req, res) => {
    const rows = req.query.unreviewed === 'true'
      ? db.prepare('SELECT * FROM judgment_calls WHERE reviewed = 0 ORDER BY created_at DESC').all()
      : db.prepare('SELECT * FROM judgment_calls ORDER BY created_at DESC LIMIT 100').all();
    res.json(rows);
  });

  router.put('/:id/review', (req, res) => {
    db.prepare('UPDATE judgment_calls SET reviewed = 1 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
}
