import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth.js';
import { problemsRouter } from './routes/problems.js';
import { submissionsRouter } from './routes/submissions.js';
import { discussionsRouter } from './routes/discussions.js';
import { contestsRouter } from './routes/contests.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { tagsRouter } from './routes/tags.js';
import { dailyRouter } from './routes/daily.js';
import { usersRouter } from './routes/users.js';
import { adminRouter } from './routes/admin.js';
import { internalRouter } from './routes/internal.js';
import { languagesRouter } from './routes/languages.js';
import { oauthRouter } from './routes/oauth.js';
import { authOptional } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.set('trust proxy', 1);
app.use(morgan('tiny'));
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(authOptional);

const submitLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/auth/oauth', oauthRouter);
app.use('/api/problems', submitLimiter, problemsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/discussions', discussionsRouter);
app.use('/api/contests', contestsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/languages', languagesRouter);
app.use('/api/internal', internalRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`backend listening on :${port}`);
});
