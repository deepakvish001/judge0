import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const solutionsRouter = Router();

solutionsRouter.get('/:id', async (req, res, next) => {
  try {
    const s = await prisma.solution.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { username: true, avatarUrl: true } },
        problem: { select: { slug: true, title: true } },
      },
    });
    if (!s) throw new HttpError(404, 'solution not found');
    let myVote = false;
    if (req.user) {
      const v = await prisma.solutionVote.findUnique({
        where: {
          userId_solutionId: { userId: req.user.id, solutionId: s.id },
        },
      });
      myVote = !!v;
    }
    res.json({ solution: { ...s, myVote } });
  } catch (e) {
    next(e);
  }
});

solutionsRouter.post('/:id/upvote', authRequired, async (req, res, next) => {
  try {
    const s = await prisma.solution.findUnique({
      where: { id: req.params.id },
      select: { id: true, upvotes: true },
    });
    if (!s) throw new HttpError(404, 'solution not found');
    const existing = await prisma.solutionVote.findUnique({
      where: {
        userId_solutionId: { userId: req.user!.id, solutionId: s.id },
      },
    });
    if (existing) {
      await prisma.$transaction([
        prisma.solutionVote.delete({
          where: {
            userId_solutionId: {
              userId: req.user!.id,
              solutionId: s.id,
            },
          },
        }),
        prisma.solution.update({
          where: { id: s.id },
          data: { upvotes: { decrement: 1 } },
        }),
      ]);
      res.json({ upvoted: false, upvotes: Math.max(0, s.upvotes - 1) });
    } else {
      await prisma.$transaction([
        prisma.solutionVote.create({
          data: { userId: req.user!.id, solutionId: s.id },
        }),
        prisma.solution.update({
          where: { id: s.id },
          data: { upvotes: { increment: 1 } },
        }),
      ]);
      res.json({ upvoted: true, upvotes: s.upvotes + 1 });
    }
  } catch (e) {
    next(e);
  }
});
