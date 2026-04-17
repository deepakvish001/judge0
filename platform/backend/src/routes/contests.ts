import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const contestsRouter = Router();

contestsRouter.get('/', async (_req, res, next) => {
  try {
    const contests = await prisma.contest.findMany({
      orderBy: { startsAt: 'desc' },
      include: {
        _count: { select: { participants: true, problems: true } },
      },
    });
    const now = new Date();
    res.json({
      contests: contests.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        participantCount: c._count.participants,
        problemCount: c._count.problems,
        state:
          now < c.startsAt
            ? 'UPCOMING'
            : now > c.endsAt
              ? 'ENDED'
              : 'LIVE',
      })),
    });
  } catch (e) {
    next(e);
  }
});

contestsRouter.get('/:slug', async (req, res, next) => {
  try {
    const c = await prisma.contest.findUnique({
      where: { slug: req.params.slug },
      include: {
        problems: {
          orderBy: { order: 'asc' },
          include: {
            problem: {
              select: { slug: true, title: true, difficulty: true },
            },
          },
        },
        participants: {
          orderBy: [{ score: 'desc' }, { lastSubmissionAt: 'asc' }],
          take: 100,
          include: { user: { select: { username: true } } },
        },
      },
    });
    if (!c) throw new HttpError(404, 'contest not found');
    res.json({
      contest: {
        id: c.id,
        slug: c.slug,
        title: c.title,
        descriptionMd: c.descriptionMd,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        problems: c.problems.map((cp) => ({
          slug: cp.problem.slug,
          title: cp.problem.title,
          difficulty: cp.problem.difficulty,
          points: cp.points,
          order: cp.order,
        })),
        leaderboard: c.participants.map((p, i) => ({
          rank: i + 1,
          username: p.user.username,
          score: p.score,
          lastSubmissionAt: p.lastSubmissionAt,
        })),
      },
    });
  } catch (e) {
    next(e);
  }
});

contestsRouter.post(
  '/:slug/register',
  authRequired,
  async (req, res, next) => {
    try {
      const c = await prisma.contest.findUnique({
        where: { slug: req.params.slug },
      });
      if (!c) throw new HttpError(404, 'contest not found');
      await prisma.contestParticipant.upsert({
        where: { contestId_userId: { contestId: c.id, userId: req.user!.id } },
        create: { contestId: c.id, userId: req.user!.id, score: 0 },
        update: {},
      });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);
