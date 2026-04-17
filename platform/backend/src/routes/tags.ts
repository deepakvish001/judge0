import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const tagsRouter = Router();

tagsRouter.get('/', async (_req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { problems: true } } },
    });
    res.json({
      tags: tags.map((t) => ({
        slug: t.slug,
        name: t.name,
        problemCount: t._count.problems,
      })),
    });
  } catch (e) {
    next(e);
  }
});
