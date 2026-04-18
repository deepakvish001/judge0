import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { pageEnvelope, pagination } from '../lib/pagination.js';

export const notificationsRouter = Router();

notificationsRouter.use(authRequired);

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const p = pagination(req, 20);
    const [items, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.notification.count({ where: { userId: req.user!.id } }),
      prisma.notification.count({
        where: { userId: req.user!.id, readAt: null },
      }),
    ]);
    res.json({
      ...pageEnvelope(items, total, p),
      notifications: items,
      unread,
    });
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post('/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
