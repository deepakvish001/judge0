import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { pageEnvelope, pagination } from '../lib/pagination.js';

export const discussionsRouter = Router();

discussionsRouter.get('/', async (req, res, next) => {
  try {
    const p = pagination(req, 20);
    const slug = req.query.problem as string | undefined;
    const where = slug ? { problem: { slug } } : {};
    const [items, total] = await Promise.all([
      prisma.discussion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.limit,
        include: {
          user: { select: { username: true } },
          problem: { select: { slug: true, title: true } },
          _count: { select: { replies: true } },
        },
      }),
      prisma.discussion.count({ where }),
    ]);
    res.json({ ...pageEnvelope(items, total, p), discussions: items });
  } catch (e) {
    next(e);
  }
});

discussionsRouter.get('/:id', async (req, res, next) => {
  try {
    const d = await prisma.discussion.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { username: true } },
        problem: { select: { slug: true, title: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { username: true } } },
        },
      },
    });
    if (!d) throw new HttpError(404, 'discussion not found');
    res.json({ discussion: d });
  } catch (e) {
    next(e);
  }
});

const createSchema = z.object({
  problemSlug: z.string().min(1),
  title: z.string().min(3).max(200),
  bodyMd: z.string().min(1).max(20_000),
});

discussionsRouter.post('/', authRequired, async (req, res, next) => {
  try {
    const { problemSlug, title, bodyMd } = createSchema.parse(req.body);
    const problem = await prisma.problem.findUnique({
      where: { slug: problemSlug },
    });
    if (!problem) throw new HttpError(404, 'problem not found');
    const d = await prisma.discussion.create({
      data: {
        problemId: problem.id,
        userId: req.user!.id,
        title,
        bodyMd,
      },
    });
    res.status(201).json({ discussion: d });
  } catch (e) {
    next(e);
  }
});

const replySchema = z.object({ bodyMd: z.string().min(1).max(20_000) });

discussionsRouter.post(
  '/:id/replies',
  authRequired,
  async (req, res, next) => {
    try {
      const { bodyMd } = replySchema.parse(req.body);
      const d = await prisma.discussion.findUnique({
        where: { id: req.params.id },
        include: { user: { select: { id: true, username: true } } },
      });
      if (!d) throw new HttpError(404, 'discussion not found');
      const reply = await prisma.discussionReply.create({
        data: { discussionId: d.id, userId: req.user!.id, bodyMd },
      });
      if (d.user.id !== req.user!.id) {
        await prisma.notification.create({
          data: {
            userId: d.user.id,
            type: 'discussion_reply',
            title: `New reply from ${req.user!.username}`,
            body: `on "${d.title}"`,
            href: `/discussions/${d.id}`,
          },
        });
      }
      res.status(201).json({ reply });
    } catch (e) {
      next(e);
    }
  },
);

discussionsRouter.post(
  '/:id/upvote',
  authRequired,
  async (req, res, next) => {
    try {
      const d = await prisma.discussion.update({
        where: { id: req.params.id },
        data: { upvotes: { increment: 1 } },
      });
      res.json({ upvotes: d.upvotes });
    } catch (e) {
      next(e);
    }
  },
);
