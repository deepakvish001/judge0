import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const dailyRouter = Router();

dailyRouter.get('/', async (_req, res, next) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    let entry = await prisma.dailyProblem.findUnique({
      where: { date: today },
      include: { problem: true },
    });
    if (!entry) {
      const all = await prisma.problem.findMany({
        where: { isPublished: true },
        select: { id: true, slug: true, title: true, difficulty: true },
      });
      if (all.length === 0) {
        res.json({ daily: null });
        return;
      }
      const idx = Math.floor(today.getTime() / 86_400_000) % all.length;
      const picked = all[idx]!;
      entry = await prisma.dailyProblem.create({
        data: { date: today, problemId: picked.id },
        include: { problem: true },
      });
    }
    res.json({
      daily: {
        date: entry.date,
        problem: {
          slug: entry.problem.slug,
          title: entry.problem.title,
          difficulty: entry.problem.difficulty,
        },
      },
    });
  } catch (e) {
    next(e);
  }
});
