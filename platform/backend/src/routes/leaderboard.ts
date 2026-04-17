import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', async (_req, res, next) => {
  try {
    const grouped = await prisma.submission.groupBy({
      by: ['userId'],
      where: { status: 'AC' },
      _count: { problemId: true },
    });
    const ranked = await Promise.all(
      grouped
        .sort((a, b) => b._count.problemId - a._count.problemId)
        .slice(0, 100)
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
    ranked.sort((a, b) => b.solved - a.solved);
    res.json({
      leaderboard: ranked.map((r, i) => ({ rank: i + 1, ...r })),
    });
  } catch (e) {
    next(e);
  }
});
