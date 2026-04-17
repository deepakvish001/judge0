import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { pageEnvelope, pagination } from '../lib/pagination.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', async (req, res, next) => {
  try {
    const p = pagination(req, 25, 100);
    const grouped = await prisma.submission.groupBy({
      by: ['userId'],
      where: { status: 'AC' },
      _count: { problemId: true },
    });
    const all = await Promise.all(
      grouped
        .sort((a, b) => b._count.problemId - a._count.problemId)
        .map(async (g) => {
          const distinct = await prisma.submission.findMany({
            where: { userId: g.userId, status: 'AC' },
            distinct: ['problemId'],
            select: { problemId: true },
          });
          const u = await prisma.user.findUnique({
            where: { id: g.userId },
            select: { username: true, rating: true },
          });
          return {
            username: u?.username ?? 'unknown',
            rating: u?.rating ?? 1500,
            solved: distinct.length,
          };
        }),
    );
    all.sort((a, b) => b.solved - a.solved);
    const total = all.length;
    const page = all
      .slice(p.skip, p.skip + p.limit)
      .map((r, i) => ({ rank: p.skip + i + 1, ...r }));
    res.json({ ...pageEnvelope(page, total, p), leaderboard: page });
  } catch (e) {
    next(e);
  }
});
