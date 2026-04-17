import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { adminRequired } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const adminRouter = Router();

const problemSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  statementMd: z.string().min(1),
  constraintsMd: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  isPublished: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  starterCodes: z
    .array(
      z.object({ languageId: z.number().int(), code: z.string() }),
    )
    .default([]),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isSample: z.boolean().default(false),
        order: z.number().int().default(0),
      }),
    )
    .default([]),
});

adminRouter.use(adminRequired);

adminRouter.get('/problems', async (_req, res, next) => {
  try {
    const list = await prisma.problem.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { testCases: true, submissions: true } },
      },
    });
    res.json({ problems: list });
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/problems/:id', async (req, res, next) => {
  try {
    const p = await prisma.problem.findUnique({
      where: { id: req.params.id },
      include: {
        starterCodes: true,
        testCases: { orderBy: { order: 'asc' } },
        tags: { include: { tag: true } },
      },
    });
    if (!p) throw new HttpError(404, 'problem not found');
    res.json({ problem: p });
  } catch (e) {
    next(e);
  }
});

adminRouter.post('/problems', async (req, res, next) => {
  try {
    const data = problemSchema.parse(req.body);
    const tagIds = await ensureTags(data.tags);
    const p = await prisma.problem.create({
      data: {
        slug: data.slug,
        title: data.title,
        statementMd: data.statementMd,
        constraintsMd: data.constraintsMd,
        difficulty: data.difficulty,
        isPublished: data.isPublished,
        starterCodes: { create: data.starterCodes },
        testCases: { create: data.testCases },
        tags: { create: tagIds.map((id) => ({ tagId: id })) },
      },
    });
    res.status(201).json({ problem: p });
  } catch (e) {
    next(e);
  }
});

adminRouter.put('/problems/:id', async (req, res, next) => {
  try {
    const data = problemSchema.parse(req.body);
    const tagIds = await ensureTags(data.tags);
    await prisma.$transaction([
      prisma.starterCode.deleteMany({ where: { problemId: req.params.id } }),
      prisma.testCase.deleteMany({ where: { problemId: req.params.id } }),
      prisma.problemTag.deleteMany({ where: { problemId: req.params.id } }),
      prisma.problem.update({
        where: { id: req.params.id },
        data: {
          slug: data.slug,
          title: data.title,
          statementMd: data.statementMd,
          constraintsMd: data.constraintsMd,
          difficulty: data.difficulty,
          isPublished: data.isPublished,
          starterCodes: { create: data.starterCodes },
          testCases: { create: data.testCases },
          tags: { create: tagIds.map((id) => ({ tagId: id })) },
        },
      }),
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete('/problems/:id', async (req, res, next) => {
  try {
    await prisma.problem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

async function ensureTags(slugs: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const slug of slugs) {
    const t = await prisma.tag.upsert({
      where: { slug },
      create: { slug, name: slug },
      update: {},
    });
    ids.push(t.id);
  }
  return ids;
}
