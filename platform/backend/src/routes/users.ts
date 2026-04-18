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
        problem: {
          select: {
            slug: true,
            title: true,
            difficulty: true,
            tags: { select: { tag: { select: { slug: true, name: true } } } },
          },
        },
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

    // Heatmap: submissions per day over last 365 days.
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 364);
    const subs = await prisma.submission.findMany({
      where: {
        user: { username: req.params.username },
        createdAt: { gte: since },
      },
      select: { createdAt: true, status: true },
    });
    const heatmap: Record<string, { total: number; ac: number }> = {};
    for (const s of subs) {
      const d = s.createdAt.toISOString().slice(0, 10);
      const cell = heatmap[d] ?? { total: 0, ac: 0 };
      cell.total++;
      if (s.status === 'AC') cell.ac++;
      heatmap[d] = cell;
    }

    const tagCounts: Record<string, { slug: string; name: string; count: number }> = {};
    for (const a of accepted) {
      for (const tt of a.problem.tags) {
        const key = tt.tag.slug;
        const cell = tagCounts[key] ?? {
          slug: tt.tag.slug,
          name: tt.tag.name,
          count: 0,
        };
        cell.count++;
        tagCounts[key] = cell;
      }
    }

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
        byTag: Object.values(tagCounts).sort((a, b) => b.count - a.count),
      },
      heatmap: { since: since.toISOString().slice(0, 10), days: heatmap },
      solved: accepted.map((a) => ({
        slug: a.problem.slug,
        title: a.problem.title,
        difficulty: a.problem.difficulty,
      })),
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
