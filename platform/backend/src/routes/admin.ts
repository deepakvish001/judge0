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
  hints: z
    .array(
      z.object({
        content: z.string().min(1),
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
        hints: { orderBy: { order: 'asc' } },
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
        hints: { create: data.hints },
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
      prisma.hint.deleteMany({ where: { problemId: req.params.id } }),
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
          hints: { create: data.hints },
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

const csvSchema = z.object({
  csv: z.string().min(1),
  replace: z.boolean().default(false),
});

adminRouter.post('/problems/:id/test-cases/import', async (req, res, next) => {
  try {
    const { csv, replace } = csvSchema.parse(req.body);
    const rows = parseCsv(csv);
    const startOrder = replace
      ? 0
      : await prisma.testCase.count({ where: { problemId: req.params.id } });
    const data = rows.map((r, i) => ({
      problemId: req.params.id,
      input: r.input,
      expectedOutput: r.expectedOutput,
      isSample: r.isSample,
      order: startOrder + i,
    }));
    if (replace) {
      await prisma.testCase.deleteMany({
        where: { problemId: req.params.id },
      });
    }
    await prisma.testCase.createMany({ data });
    res.json({ imported: data.length, replaced: replace });
  } catch (e) {
    next(e);
  }
});

const editorialSchema = z.object({ bodyMd: z.string().min(1) });

adminRouter.get('/problems/:id/editorial', async (req, res, next) => {
  try {
    const ed = await prisma.editorial.findUnique({
      where: { problemId: req.params.id },
    });
    res.json({ editorial: ed });
  } catch (e) {
    next(e);
  }
});

adminRouter.put('/problems/:id/editorial', async (req, res, next) => {
  try {
    const { bodyMd } = editorialSchema.parse(req.body);
    await prisma.editorial.upsert({
      where: { problemId: req.params.id },
      create: { problemId: req.params.id, bodyMd },
      update: { bodyMd },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete('/problems/:id/editorial', async (req, res, next) => {
  try {
    await prisma.editorial.deleteMany({
      where: { problemId: req.params.id },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

interface CsvRow {
  input: string;
  expectedOutput: string;
  isSample: boolean;
}

/**
 * Parse a CSV with header `input,expectedOutput,isSample`.
 * Quote handling: double-quoted fields with "" escaping. Newlines allowed inside quotes.
 */
function parseCsv(src: string): CsvRow[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let i = 0;
  let inQ = false;
  while (i < src.length) {
    const c = src[i]!;
    if (inQ) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQ = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ',') {
      cur.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      cur.push(cell);
      rows.push(cur);
      cur = [];
      cell = '';
      i++;
      continue;
    }
    cell += c;
    i++;
  }
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell);
    rows.push(cur);
  }
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const inIdx = header.indexOf('input');
  const outIdx = header.indexOf('expectedoutput');
  const sampleIdx = header.indexOf('issample');
  if (inIdx < 0 || outIdx < 0)
    throw new HttpError(
      400,
      'CSV must include columns: input, expectedOutput[, isSample]',
    );
  return rows
    .slice(1)
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => ({
      input: r[inIdx] ?? '',
      expectedOutput: r[outIdx] ?? '',
      isSample:
        sampleIdx >= 0
          ? /^(true|1|yes|y)$/i.test((r[sampleIdx] ?? '').trim())
          : false,
    }));
}

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
