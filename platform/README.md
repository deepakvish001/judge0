# Compiler Platform

A LeetCode-style coding-challenge platform with a **self-hosted code
executor** — no external API. Each test case runs inside a short-lived,
resource-capped Docker container spawned by the backend. Works on
macOS, Linux, and WSL2.

- **Backend** — Node.js + Express + Prisma + PostgreSQL (`./backend`)
- **Frontend** — Next.js 14 + Tailwind + Monaco editor (`./frontend`)
- **Execution** — Docker-per-submission (see `src/lib/executor.ts`)

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

Prereqs: Docker Desktop (macOS/Windows) or Docker Engine (Linux).
Nothing else.

```bash
# From repo root. First boot pulls language images (python, node, gcc,
# openjdk, golang) — a few hundred MB; subsequent starts are instant.
docker compose -f platform/docker-compose.native.yml up -d --build
open http://localhost:3000
```

### How execution works

Each time you click **Run** or **Submit**, the backend:

1. Writes your source + stdin into a shared Docker volume (`platform_sub`).
2. Spawns a short-lived runner container on the host Docker daemon:
   ```
   docker run --rm --network=none --memory=256m --cpus=1
              --pids-limit=128 --cap-drop=ALL --security-opt=no-new-privileges
              -v platform_sub:/code:ro -w /code/<id> <image> sh -lc "<cmd>"
   ```
3. Captures stdout / stderr / exit code / wall-clock time.
4. Compares output to the test-case expected output → verdict
   (`AC` / `WA` / `TLE` / `MLE` / `RE` / `CE`).

Supported languages (IDs match the Judge0 convention so existing seed data works):
Python 3 (71), Node 20 (63), C++17 (54), C (50), Java 21 (62), Go 1.22 (60).

### Resource limits (per test case)

| Knob | Default | Env var |
| --- | --- | --- |
| CPU | 1 core | `EXEC_CPU_LIMIT` |
| Memory | 256 MB | passed per-call |
| Wall-clock | 5 s | passed per-call |
| PIDs | 128 | `EXEC_PIDS_LIMIT` |
| Network | disabled | hard-coded |
| Parallel cases | 4 | `EXEC_PARALLELISM` |

### Security note

Docker's isolation is *not* a strict security boundary. The defaults here
(`--network=none`, `--cap-drop=ALL`, `--security-opt=no-new-privileges`,
`--read-only` code mount, `--pids-limit`, `--memory`) are safe for a
learning/portfolio platform. For public, hostile users add gVisor or run
the executor on a dedicated jump host.

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
                   └──→  docker run <language image> (sibling container)
                              │
                              ▼ stdout/stderr/exit + wall-clock time
                         grader.ts computes verdict
```

- `POST /api/problems/:slug/run` — synchronous single-case execution with
  the user's custom stdin, returns stdout/stderr/time/status.
- `POST /api/problems/:slug/submit` — creates a `Submission` row, kicks
  off an async runner (`lib/submit-runner.ts`) that executes all test
  cases in parallel (bounded by `EXEC_PARALLELISM`), writes each
  `SubmissionCase`, computes the worst-case verdict, and updates contest
  scores. Client polls `GET /api/submissions/:id` until final.

## Local dev (backend on host)

```bash
# Terminal 1 – Postgres
docker run -p 5432:5432 -e POSTGRES_USER=platform -e POSTGRES_PASSWORD=platform -e POSTGRES_DB=platform postgres:16-alpine

# Terminal 2 – Backend
cd platform/backend
cp .env.example .env
npm install
npx prisma db push --accept-data-loss
npx tsx prisma/seed.ts
# docker CLI must be on PATH and the daemon reachable.
npm run dev

# Terminal 3 – Frontend
cd platform/frontend
npm install
BACKEND_URL=http://localhost:4000 npm run dev
```

In host-mode the backend writes to a real host directory instead of a
Docker volume. Set `SANDBOX_MOUNT=/tmp/platform_sub` and
`SANDBOX_VOLUME=/tmp/platform_sub` (same value — the executor passes it
straight to `docker run -v`, which treats absolute paths as bind mounts).

## Environment variables

### backend/.env

| Var | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://platform:platform@platform-db:5432/platform` | Postgres URL |
| `JWT_SECRET` | `dev-secret-change-me` | **Change in production** |
| `SANDBOX_VOLUME` | `platform_sub` | Docker volume name shared with sibling runners |
| `SANDBOX_MOUNT` | `/sub` | Where the backend sees the volume internally |
| `DOCKER_BIN` | `docker` | Override to `/usr/bin/docker` if on PATH differs |
| `EXEC_PARALLELISM` | `4` | Max test cases per submission running at once |
| `EXEC_CPU_LIMIT` | `1` | `docker run --cpus` value |
| `EXEC_PIDS_LIMIT` | `128` | `docker run --pids-limit` value |
| `PORT` | `4000` | |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated |

## Tests

```bash
cd platform/backend && npm run test    # grader unit tests
```

## End-to-end smoke

1. `docker compose -f platform/docker-compose.native.yml up -d --build`
2. First boot: backend pulls language images (~1–2 min). Watch:
   `docker compose -f platform/docker-compose.native.yml logs -f backend`
3. Open `http://localhost:3000`, sign in as `demo` / `demo1234`.
4. Open `sum-of-two`, keep the default Python starter, click **Run** —
   expect `3` in the output.
5. Click **Submit** — verdict flips to `Accepted` within a few seconds;
   the submission appears in `/submissions`.
6. Submit `while True: pass` as Python — verdict `TLE` after ~5s.
7. Submit malformed C++ — verdict `CE` with compiler output shown.
8. Sign in as `admin` / `admin1234`, open `/admin`, create a new problem.
