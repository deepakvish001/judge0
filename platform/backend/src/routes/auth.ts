import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  authRequired,
  clearAuthCookie,
  setAuthCookie,
  signToken,
} from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, username, password } = registerSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) throw new HttpError(409, 'email or username already in use');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
    });
    const auth = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    setAuthCookie(res, signToken(auth));
    res.status(201).json({ user: auth });
  } catch (e) {
    next(e);
  }
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(3),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { emailOrUsername, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });
    if (!user || !user.passwordHash) throw new HttpError(401, 'invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'invalid credentials');
    const auth = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    setAuthCookie(res, signToken(auth));
    res.json({ user: auth });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});
