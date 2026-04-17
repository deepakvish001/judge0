import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

export const usersRouter = Router();

usersRouter.get('/:username', async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        username: true,
        avatarUrl: true,
        bio: true,
        rating: true,
        createdAt: true,
      },
    });
    if (!u) throw new HttpError(404, 'user not found');

    const accepted = await prisma.submission.findMany({
      where: { user: { username: req.params.username }, status: 'AC' },
      distinct: ['problemId'],
      select: {
        problem: { select: { slug: true, title: true, difficulty: true } },
      },
    });
    const totalSubs = await prisma.submission.count({
      where: { user: { username: req.params.username } },
    });
    const recent = await prisma.submission.findMany({
      where: { user: { username: req.params.username } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        problem: { select: { slug: true, title: true } },
      },
    });

    res.json({
      user: u,
      stats: {
        solvedCount: accepted.length,
        submissionCount: totalSubs,
        byDifficulty: {
          EASY: accepted.filter((a) => a.problem.difficulty === 'EASY').length,
          MEDIUM: accepted.filter((a) => a.problem.difficulty === 'MEDIUM')
            .length,
          HARD: accepted.filter((a) => a.problem.difficulty === 'HARD').length,
        },
      },
      solved: accepted.map((a) => a.problem),
      recent: recent.map((s) => ({
        id: s.id,
        problem: s.problem,
        status: s.status,
        createdAt: s.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});
