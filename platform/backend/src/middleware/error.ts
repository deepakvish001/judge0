import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'validation', details: err.flatten() });
    return;
  }
  if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
    const e = err as { status: number; message: string };
    res.status(e.status).json({ error: e.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
