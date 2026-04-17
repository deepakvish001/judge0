import type { Request } from 'express';

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export function pagination(req: Request, defaultLimit = 20, maxLimit = 100): Pagination {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageEnvelope<T>(items: T[], total: number, p: Pagination) {
  return {
    items,
    total,
    page: p.page,
    limit: p.limit,
    pageCount: Math.max(1, Math.ceil(total / p.limit)),
  };
}
