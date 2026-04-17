import { Router } from 'express';
import { judge0 } from '../lib/judge0.js';

export const languagesRouter = Router();

let cache: { at: number; data: any[] } | null = null;
const TTL_MS = 5 * 60_000;

languagesRouter.get('/', async (_req, res, next) => {
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      const langs = await judge0.listLanguages();
      cache = {
        at: Date.now(),
        data: langs.filter((l) => !l.is_archived),
      };
    }
    res.json({ languages: cache.data });
  } catch (e) {
    next(e);
  }
});
