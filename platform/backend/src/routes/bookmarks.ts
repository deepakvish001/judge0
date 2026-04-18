import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { pageEnvelope, pagination } from '../lib/pagination.js';

export const bookmarksRouter = Router();

bookmarksRouter.use(authRequired);

bookmarksRouter.get('/', async (req, res, next) => {
  try {
    const p = pagination(req, 20);
    const [items, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.limit,
        include: {
          problem: {
            select: {
              id: true,
              slug: true,
              title: true,
              difficulty: true,
              tags: {
                select: { tag: { select: { slug: true, name: true } } },
              },
            },
          },
        },
      }),
      prisma.bookmark.count({ where: { userId: req.user!.id } }),
    ]);
    const bookmarks = items.map((b) => ({
      createdAt: b.createdAt,
      problem: {
        ...b.problem,
        tags: b.problem.tags.map((t) => t.tag),
      },
    }));
    res.json({ ...pageEnvelope(bookmarks, total, p), bookmarks });
  } catch (e) {
    next(e);
  }
});
