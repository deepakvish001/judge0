import { prisma } from './prisma.js';
import { execCase, type Verdict } from './executor.js';
import { combineVerdicts } from './grader.js';

interface SubmitJob {
  languageId: number;
  sourceCode: string;
  testCases: { id: string; input: string; expectedOutput: string }[];
}

const PARALLEL = Number(process.env.EXEC_PARALLELISM ?? '4');

// Fire-and-forget async runner: executes all test cases with bounded
// concurrency, updates each SubmissionCase, then writes the final verdict
// on the parent Submission. HTTP handler responds 202 immediately.
export function runSubmissionInBackground(submissionId: string, job: SubmitJob) {
  runAll(submissionId, job).catch(async (e) => {
    console.error('submit runner failed', submissionId, e);
    await prisma.submission
      .update({
        where: { id: submissionId },
        data: { status: 'IE', finishedAt: new Date() },
      })
      .catch(() => {});
  });
}

async function runAll(submissionId: string, job: SubmitJob) {
  const queue = [...job.testCases];
  const verdicts: Verdict[] = [];
  let maxRuntime = 0;
  let maxMemory = 0;
  let passed = 0;

  async function worker() {
    while (queue.length) {
      const tc = queue.shift();
      if (!tc) return;
      const r = await execCase({
        languageId: job.languageId,
        sourceCode: job.sourceCode,
        stdin: tc.input,
        expectedOutput: tc.expectedOutput,
      });
      const runtimeMs = r.time != null ? Math.round(parseFloat(r.time) * 1000) : null;
      const memoryKb = r.memory ?? null;
      if (runtimeMs != null && runtimeMs > maxRuntime) maxRuntime = runtimeMs;
      if (memoryKb != null && memoryKb > maxMemory) maxMemory = memoryKb;
      if (r.verdict === 'AC') passed++;
      verdicts.push(r.verdict);

      await prisma.submissionCase.updateMany({
        where: { submissionId, testCaseId: tc.id },
        data: {
          status: r.verdict,
          runtimeMs,
          memoryKb,
          stdout: r.stdout || null,
          stderr: r.stderr || null,
          compileOutput: r.compileOutput,
        },
      });

      await prisma.submission.update({
        where: { id: submissionId },
        data: { passedCount: passed },
      });

      // Short-circuit on compile error — remaining cases would all fail the
      // same way. Mark the rest as CE so the UI isn't stuck at RUNNING.
      if (r.verdict === 'CE') {
        const remaining = queue.splice(0, queue.length);
        for (const rest of remaining) {
          await prisma.submissionCase.updateMany({
            where: { submissionId, testCaseId: rest.id },
            data: {
              status: 'CE',
              compileOutput: r.compileOutput,
            },
          });
          verdicts.push('CE');
        }
        return;
      }
    }
  }

  const workers = Array.from({ length: Math.min(PARALLEL, job.testCases.length) }, worker);
  await Promise.all(workers);

  const overall = combineVerdicts(verdicts);

  const sub = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: overall,
      passedCount: passed,
      runtimeMs: maxRuntime || null,
      memoryKb: maxMemory || null,
      finishedAt: new Date(),
    },
  });

  if (overall === 'AC' && sub.contestId) {
    await updateContestScore(sub.contestId, sub.userId);
  }
}

async function updateContestScore(contestId: string, userId: string) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: { problems: true },
  });
  if (!contest) return;
  const acceptedSubs = await prisma.submission.findMany({
    where: {
      contestId,
      userId,
      status: 'AC',
      createdAt: { gte: contest.startsAt, lte: contest.endsAt },
    },
    select: { problemId: true, finishedAt: true },
    distinct: ['problemId'],
  });
  const pointsByProblem = new Map(
    contest.problems.map((p) => [p.problemId, p.points]),
  );
  const score = acceptedSubs.reduce(
    (sum, s) => sum + (pointsByProblem.get(s.problemId) ?? 0),
    0,
  );
  const lastSubmissionAt = acceptedSubs
    .map((s) => s.finishedAt ?? new Date())
    .reduce<Date | null>((m, d) => (m == null || d > m ? d : m), null);
  await prisma.contestParticipant.upsert({
    where: { contestId_userId: { contestId, userId } },
    create: { contestId, userId, score, lastSubmissionAt },
    update: { score, lastSubmissionAt },
  });
}
