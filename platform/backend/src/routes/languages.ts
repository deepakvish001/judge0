import { Router } from 'express';
import { listRuntimes } from '../lib/runtime.js';

export const languagesRouter = Router();

languagesRouter.get('/', (_req, res) => {
  res.json({ languages: listRuntimes() });
});
