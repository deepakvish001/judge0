import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { judge0 } from '../lib/judge0.js';
import { authRequired } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { pageEnvelope, pagination } from '../lib/pagination.js';

export const problemsRouter = Router();

problemsRouter.get('/', async (req, res, next) => {
  try {
    const p = pagination(req, 20);
    const difficulty = req.query.difficulty as string | undefined;
    const tag = req.query.tag as string | undefined;
    const search = req.query.search as string | undefined;
    const where: any = { isPublished: true };
    if (difficulty) where.difficulty = difficulty.toUpperCase();
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (tag) where.tags = { some: { tag: { slug: tag } } };

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: p.skip,
        take: p.limit,
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          createdAt: true,
          tags: { select: { tag: { select: { slug: true, name: true } } } },
          _count: { select: { submissions: true, ratings: true } },
          ratings: { select: { value: true } },
        },
      }),
      prisma.problem.count({ where }),
    ]);

    let acceptedByProblem: Record<string, boolean> = {};
    let bookmarkedByProblem: Record<string, boolean> = {};
    if (req.user) {
      const [accepted, bookmarks] = await Promise.all([
        prisma.submission.findMany({
          where: { userId: req.user.id, status: 'AC' },
          select: { problemId: true },
          distinct: ['problemId'],
        }),
        prisma.bookmark.findMany({
          where: { userId: req.user.id },
          select: { problemId: true },
        }),
      ]);
      acceptedByProblem = Object.fromEntries(
        accepted.map((a) => [a.problemId, true]),
      );
      bookmarkedByProblem = Object.fromEntries(
        bookmarks.map((b) => [b.problemId, true]),
      );
    }

    const items = problems.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      tags: p.tags.map((t) => t.tag),
      submissionCount: p._count.submissions,
      ratingCount: p._count.ratings,
      ratingAvg:
        p.ratings.length === 0
          ? 0
          : p.ratings.reduce((s, r) => s + r.value, 0) / p.ratings.length,
      solved: !!acceptedByProblem[p.id],
      bookmarked: !!bookmarkedByProblem[p.id],
    }));

    res.json({ ...pageEnvelope(items, total, p), problems: items });
  } catch (e) {
    next(e);
  }
});

problemsRouter.get('/:slug', async (req, res, next) => {
  try {
    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.slug },
      include: {
        starterCodes: true,
        tags: { include: { tag: true } },
        testCases: {
          where: { isSample: true },
          orderBy: { order: 'asc' },
          select: { id: true, input: true, expectedOutput: true },
        },
        ratings: { select: { value: true } },
      },
    });
    if (!problem) throw new HttpError(404, 'problem not found');

    let myRating: number | null = null;
    let bookmarked = false;
    let hintCount = 0;
    if (req.user) {
      const [r, bm, hc] = await Promise.all([
        prisma.problemRating.findUnique({
          where: {
            userId_problemId: { userId: req.user.id, problemId: problem.id },
          },
        }),
        prisma.bookmark.findUnique({
          where: {
            userId_problemId: { userId: req.user.id, problemId: problem.id },
          },
        }),
        prisma.hint.count({ where: { problemId: problem.id } }),
      ]);
      myRating = r?.value ?? null;
      bookmarked = !!bm;
      hintCount = hc;
    } else {
      hintCount = await prisma.hint.count({ where: { problemId: problem.id } });
    }

    res.json({
      problem: {
        id: problem.id,
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        statementMd: problem.statementMd,
        constraintsMd: problem.constraintsMd,
        starterCodes: problem.starterCodes.map((s) => ({
          languageId: s.languageId,
          code: s.code,
        })),
        tags: problem.tags.map((t) => t.tag),
        sampleTestCases: problem.testCases,
        ratingCount: problem.ratings.length,
        ratingAvg:
          problem.ratings.length === 0
            ? 0
            : problem.ratings.reduce((s, r) => s + r.value, 0) /
              problem.ratings.length,
        myRating,
        bookmarked,
        hintCount,
      },
    });
  } catch (e) {
    next(e);
  }
});

const rateSchema = z.object({ value: z.number().int().min(1).max(5) });

problemsRouter.post('/:slug/rate', authRequired, async (req, res, next) => {
  try {
    const { value } = rateSchema.parse(req.body);
    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.slug },
    });
    if (!problem) throw new HttpError(404, 'problem not found');
    await prisma.problemRating.upsert({
      where: {
        userId_problemId: { userId: req.user!.id, problemId: problem.id },
      },
      create: { userId: req.user!.id, problemId: problem.id, value },
      update: { value },
    });
    const ratings = await prisma.problemRating.findMany({
      where: { problemId: problem.id },
      select: { value: true },
    });
    const avg =
      ratings.length === 0
        ? 0
        : ratings.reduce((s, r) => s + r.value, 0) / ratings.length;
    res.json({ ratingCount: ratings.length, ratingAvg: avg, myRating: value });
  } catch (e) {
    next(e);
  }
});

problemsRouter.get('/:slug/editorial', async (req, res, next) => {
  try {
    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.slug },
      include: { editorial: true },
    });
    if (!problem) throw new HttpError(404, 'problem not found');
    let unlocked = !!req.user?.role && req.user.role === 'ADMIN';
    if (!unlocked && req.user) {
      const ac = await prisma.submission.findFirst({
        where: {
          userId: req.user.id,
          problemId: problem.id,
          status: 'AC',
        },
        select: { id: true },
      });
      unlocked = !!ac;
    }
    res.json({
      editorial: problem.editorial
        ? {
            bodyMd: unlocked ? problem.editorial.bodyMd : null,
            locked: !unlocked,
            updatedAt: problem.editorial.updatedAt,
          }
        : null,
    });
  } catch (e) {
    next(e);
  }
});

const runSchema = z.object({
  languageId: z.number().int().positive(),
  sourceCode: z.string().min(1).max(64_000),
  stdin: z.string().max(64_000).optional(),
});

problemsRouter.post('/:slug/run', authRequired, async (req, res, next) => {
  try {
    const { languageId, sourceCode, stdin } = runSchema.parse(req.body);
    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.slug },
      include: {
        testCases: {
          where: { isSample: true },
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
    });
    if (!problem) throw new HttpError(404, 'problem not found');
    const inputToUse = stdin ?? problem.testCases[0]?.input ?? '';
    const result = await judge0.runSync({
      language_id: languageId,
      source_code: sourceCode,
      stdin: inputToUse,
    });
    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compile_output,
      time: result.time,
      memory: result.memory,
      status: result.status,
    });
  } catch (e) {
    next(e);
  }
});

const submitSchema = z.object({
  languageId: z.number().int().positive(),
  sourceCode: z.string().min(1).max(64_000),
  contestId: z.string().optional(),
});

problemsRouter.post(
  '/:slug/bookmark',
  authRequired,
  async (req, res, next) => {
    try {
      const problem = await prisma.problem.findUnique({
        where: { slug: req.params.slug },
      });
      if (!problem) throw new HttpError(404, 'problem not found');
      const existing = await prisma.bookmark.findUnique({
        where: {
          userId_problemId: {
            userId: req.user!.id,
            problemId: problem.id,
          },
        },
      });
      if (existing) {
        await prisma.bookmark.delete({
          where: {
            userId_problemId: {
              userId: req.user!.id,
              problemId: problem.id,
            },
          },
        });
        res.json({ bookmarked: false });
      } else {
        await prisma.bookmark.create({
          data: { userId: req.user!.id, problemId: problem.id },
        });
        res.json({ bookmarked: true });
      }
    } catch (e) {
      next(e);
    }
  },
);

problemsRouter.get('/:slug/hints', async (req, res, next) => {
  try {
    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    });
    if (!problem) throw new HttpError(404, 'problem not found');
    const hints = await prisma.hint.findMany({
      where: { problemId: problem.id },
      orderBy: { order: 'asc' },
      select: { id: true, order: true, content: true },
    });
    res.json({ hints });
  } catch (e) {
    next(e);
  }
});

problemsRouter.get('/:slug/solutions', async (req, res, next) => {
  try {
    const p = pagination(req, 10);
    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    });
    if (!problem) throw new HttpError(404, 'problem not found');
    const [items, total] = await Promise.all([
      prisma.solution.findMany({
        where: { problemId: problem.id },
        orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
        skip: p.skip,
        take: p.limit,
        select: {
          id: true,
          title: true,
          languageId: true,
          upvotes: true,
          createdAt: true,
          user: { select: { username: true, avatarUrl: true } },
        },
      }),
      prisma.solution.count({ where: { problemId: problem.id } }),
    ]);
    res.json({ ...pageEnvelope(items, total, p), solutions: items });
  } catch (e) {
    next(e);
  }
});

const solutionSchema = z.object({
  languageId: z.number().int().positive(),
  title: z.string().min(3).max(200),
  bodyMd: z.string().min(1).max(50_000),
  code: z.string().min(1).max(64_000),
});

problemsRouter.post(
  '/:slug/solutions',
  authRequired,
  async (req, res, next) => {
    try {
      const data = solutionSchema.parse(req.body);
      const problem = await prisma.problem.findUnique({
        where: { slug: req.params.slug },
      });
      if (!problem) throw new HttpError(404, 'problem not found');
      const ac = await prisma.submission.findFirst({
        where: {
          userId: req.user!.id,
          problemId: problem.id,
          status: 'AC',
        },
        select: { id: true },
      });
      if (!ac && req.user!.role !== 'ADMIN')
        throw new HttpError(
          403,
          'you must solve the problem before posting a solution',
        );
      const s = await prisma.solution.create({
        data: {
          problemId: problem.id,
          userId: req.user!.id,
          languageId: data.languageId,
          title: data.title,
          bodyMd: data.bodyMd,
          code: data.code,
        },
      });
      res.status(201).json({ solution: s });
    } catch (e) {
      next(e);
    }
  },
);

problemsRouter.post('/:slug/submit', authRequired, async (req, res, next) => {
  try {
    const { languageId, sourceCode, contestId } = submitSchema.parse(req.body);
    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.slug },
      include: { testCases: { orderBy: { order: 'asc' } } },
    });
    if (!problem) throw new HttpError(404, 'problem not found');
    if (problem.testCases.length === 0)
      throw new HttpError(400, 'problem has no test cases');

    const submission = await prisma.submission.create({
      data: {
        userId: req.user!.id,
        problemId: problem.id,
        contestId: contestId,
        languageId,
        sourceCode,
        status: 'PENDING',
        totalCount: problem.testCases.length,
      },
    });

    const callbackSecret = process.env.JUDGE0_CALLBACK_SECRET ?? '';
    const publicUrl =
      process.env.PUBLIC_BACKEND_URL ?? 'http://backend:4000';

    const items = problem.testCases.map((tc) => {
      const sig = crypto
        .createHmac('sha256', callbackSecret)
        .update(`${submission.id}:${tc.id}`)
        .digest('hex');
      const callback_url = `${publicUrl}/api/internal/judge0-callback?subId=${submission.id}&caseId=${tc.id}&sig=${sig}`;
      return {
        language_id: languageId,
        source_code: sourceCode,
        stdin: tc.input,
        expected_output: tc.expectedOutput,
        callback_url,
      };
    });

    const tokens = await judge0.submitBatch(items);

    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submission.id },
        data: { judge0Tokens: tokens, status: 'RUNNING' },
      }),
      ...tokens.map((token, i) =>
        prisma.submissionCase.create({
          data: {
            submissionId: submission.id,
            testCaseId: problem.testCases[i]!.id,
            judge0Token: token,
          },
        }),
      ),
    ]);

    res.status(202).json({ submissionId: submission.id });
  } catch (e) {
    next(e);
  }
});
