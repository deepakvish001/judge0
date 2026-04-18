import { Router } from 'express';

export const internalRouter = Router();

// The Judge0 callback path is no longer used in native mode. Kept so
// older deployments don't 404, but explicitly signals it's gone.
internalRouter.put('/judge0-callback', (_req, res) => {
  res.status(410).json({ error: 'native executor: callbacks removed' });
});
