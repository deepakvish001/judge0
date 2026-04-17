import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { pageEnvelope, pagination } from '../lib/pagination.js';

export const submissionsRouter = Router();

submissionsRouter.get('/', authRequired, async (req, res, next) => {
  try {
    const p = pagination(req, 20);
    const problemSlug = req.query.problem as string | undefined;
    const mineOnly = req.query.mine === 'true';
    const where: any = {};
    if (mineOnly) where.userId = req.user!.id;
    if (problemSlug) where.problem = { slug: problemSlug };

    const [subs, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.limit,
        include: {
          problem: { select: { slug: true, title: true } },
          user: { select: { username: true } },
        },
      }),
      prisma.submission.count({ where }),
    ]);
    const items = subs.map((s) => ({
      id: s.id,
      problem: s.problem,
      username: s.user.username,
      status: s.status,
      languageId: s.languageId,
      runtimeMs: s.runtimeMs,
      memoryKb: s.memoryKb,
      passedCount: s.passedCount,
      totalCount: s.totalCount,
      createdAt: s.createdAt,
    }));
    res.json({ ...pageEnvelope(items, total, p), submissions: items });
  } catch (e) {
    next(e);
  }
});

submissionsRouter.get('/:id', authRequired, async (req, res, next) => {
  try {
    const sub = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        problem: { select: { slug: true, title: true } },
        user: { select: { username: true } },
        cases: {
          include: {
            testCase: { select: { isSample: true, order: true } },
          },
        },
      },
    });
    if (!sub) throw new HttpError(404, 'submission not found');
    const isOwner = sub.userId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    res.json({
      submission: {
        id: sub.id,
        problem: sub.problem,
        username: sub.user.username,
        status: sub.status,
        languageId: sub.languageId,
        sourceCode: isOwner || isAdmin ? sub.sourceCode : null,
        runtimeMs: sub.runtimeMs,
        memoryKb: sub.memoryKb,
        passedCount: sub.passedCount,
        totalCount: sub.totalCount,
        createdAt: sub.createdAt,
        finishedAt: sub.finishedAt,
        cases: sub.cases.map((c) => ({
          id: c.id,
          status: c.status,
          runtimeMs: c.runtimeMs,
          memoryKb: c.memoryKb,
          isSample: c.testCase.isSample,
          order: c.testCase.order,
          stdout: c.testCase.isSample || isOwner ? c.stdout : null,
          stderr: c.testCase.isSample || isOwner ? c.stderr : null,
          compileOutput:
            c.testCase.isSample || isOwner ? c.compileOutput : null,
        })),
      },
    });
  } catch (e) {
    next(e);
  }
});
