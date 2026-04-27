import { Router, type Router as ExpressRouter } from 'express';
import type Database from 'better-sqlite3';
import { setGuardrail, getGuardrails } from 'claude-operator';

export function createGuardrailsRouter(db: Database.Database): ExpressRouter {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(getGuardrails(db, { active_only: req.query.all !== 'true' }));
  });

  router.post('/', (req, res) => {
    try {
      const result = setGuardrail(db, req.body);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put('/:id/deactivate', (req, res) => {
    db.prepare('UPDATE guardrails SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
}
