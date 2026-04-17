import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { judge0 } from '../lib/judge0.js';
import { authRequired } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const problemsRouter = Router();

problemsRouter.get('/', async (req, res, next) => {
  try {
    const difficulty = req.query.difficulty as string | undefined;
    const tag = req.query.tag as string | undefined;
    const search = req.query.search as string | undefined;
    const where: any = { isPublished: true };
    if (difficulty) where.difficulty = difficulty.toUpperCase();
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (tag) where.tags = { some: { tag: { slug: tag } } };

    const problems = await prisma.problem.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        createdAt: true,
        tags: { select: { tag: { select: { slug: true, name: true } } } },
        _count: { select: { submissions: true } },
      },
    });

    let acceptedByProblem: Record<string, boolean> = {};
    if (req.user) {
      const accepted = await prisma.submission.findMany({
        where: { userId: req.user.id, status: 'AC' },
        select: { problemId: true },
        distinct: ['problemId'],
      });
      acceptedByProblem = Object.fromEntries(
        accepted.map((a) => [a.problemId, true]),
      );
    }

    res.json({
      problems: problems.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        tags: p.tags.map((t) => t.tag),
        submissionCount: p._count.submissions,
        solved: !!acceptedByProblem[p.id],
      })),
    });
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
      },
    });
    if (!problem) throw new HttpError(404, 'problem not found');
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
      },
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
