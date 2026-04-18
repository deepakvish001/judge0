# Compiler Platform (on top of Judge0)

A LeetCode-style coding-challenge platform built on top of the Judge0 execution engine.

- **Backend** — Node.js + Express + Prisma + PostgreSQL (`./backend`)
- **Frontend** — Next.js 14 + Tailwind + Monaco editor (`./frontend`)
- **Execution** — Judge0 (the surrounding Rails app at repo root)

## Features

- Email/username + password auth (JWT in httpOnly cookie)
- Problems with Markdown statements, per-language starter code, tags, difficulty
- Monaco-powered IDE, **Run** (custom stdin) and **Submit** (grade against all test cases)
- Hidden & sample test cases, Judge0 batch submissions, async callback grading
- Submission history with per-case verdicts (AC / WA / TLE / MLE / RE / CE)
- Discussions per problem with replies and upvotes
- Contests with registration, time window, and live leaderboard
- Global leaderboard, user profiles with solved-problem stats
- Daily problem rotation
- Admin panel for problem/test-case CRUD

## Quickstart

### Linux / cgroup-v1 hosts — run Judge0 locally

```bash
# Starts Judge0 (server + workers + db + redis) + platform (db + backend + frontend).
docker compose -f docker-compose.yml -f platform/docker-compose.yml up -d --build

# Give Judge0 ~30s to migrate, then:
open http://localhost:3000
```

### macOS (Apple Silicon / Intel) — use a hosted Judge0

Docker Desktop on macOS does not expose the cgroup memory controller that
Judge0's Isolate sandbox needs, so `Run`/`Submit` fail locally with
`Failed to create control group … No such file or directory`. Use a
hosted Judge0 instead (e.g. [sulu.sh](https://sulu.sh), free tier).

```bash
export JUDGE0_URL=https://judge0-ce.p.sulu.sh
export JUDGE0_TOKEN=<your-sulu-api-key>

# Runs only platform-db + backend + frontend (no local Judge0 containers).
docker compose -f platform/docker-compose.hosted.yml up -d --build
open http://localhost:3000
```

In this mode the backend **polls** Judge0 for submission results instead
of receiving callbacks (a hosted Judge0 can't reach your laptop).

Seeded accounts (created on first boot):

| Role  | Username | Password   |
| ----- | -------- | ---------- |
| Admin | `admin`  | `admin1234` |
| User  | `demo`   | `demo1234`  |

Seeded problems: `sum-of-two`, `reverse-string`, `fizz-buzz`, `two-sum-indices`.

## Architecture

```
Next.js  ──→  Express API  ──→  PostgreSQL
                   │
                   └──→  Judge0 (/submissions/batch)
                              │ callback (PUT) with result
                              ▼
                      /api/internal/judge0-callback
                      (HMAC-signed, updates submission)
```

- `POST /api/problems/:slug/run` — synchronous Judge0 call with custom stdin.
- `POST /api/problems/:slug/submit` — creates a `Submission`, batches one Judge0
  submission per test case, each with its own `callback_url`. Judge0 PUTs the
  result back; the backend decodes base64 payloads, computes the overall
  verdict (worst-case across all test cases), and updates contest scores.

## Local dev (without Docker)

```bash
# Terminal 1 – Judge0
docker compose up -d

# Terminal 2 – Postgres (any way you like)
docker run -p 5432:5432 -e POSTGRES_USER=platform -e POSTGRES_PASSWORD=platform -e POSTGRES_DB=platform postgres:16-alpine

# Terminal 3 – Backend
cd platform/backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
npm run dev

# Terminal 4 – Frontend
cd platform/frontend
npm install
BACKEND_URL=http://localhost:4000 npm run dev
```

## Environment variables

### backend/.env

| Var | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://platform:platform@db:5432/platform` | Postgres URL |
| `JWT_SECRET` | `dev-secret-change-me` | **Change in production** |
| `JUDGE0_URL` | `http://server:2358` | Judge0 service base URL |
| `JUDGE0_TOKEN` | `""` | Optional `X-Auth-Token` |
| `JUDGE0_CALLBACK_SECRET` | `change-me-shared-secret` | HMAC secret for callback URLs |
| `PUBLIC_BACKEND_URL` | `http://backend:4000` | URL Judge0 uses to reach backend |
| `PORT` | `4000` | |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated |

## Tests

```bash
cd platform/backend && npm run test    # grader unit tests
```

## End-to-end smoke

1. `docker compose -f docker-compose.yml -f platform/docker-compose.yml up -d`
2. Open `http://localhost:3000`, sign in as `demo` / `demo1234`.
3. Open `sum-of-two`, keep the default Python starter, click **Run** — expect
   `3` in the output.
4. Click **Submit** — verdict should flip to `Accepted` within a few seconds;
   the submission appears in `/submissions`.
5. Sign in as `admin` / `admin1234`, open `/admin`, create a new problem.
