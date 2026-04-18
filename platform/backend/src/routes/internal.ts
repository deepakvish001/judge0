import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import {
  combineVerdicts,
  isFinalVerdict,
  judge0StatusToVerdict,
} from '../lib/grader.js';

export const internalRouter = Router();

const fromB64 = (s?: string | null) =>
  s ? Buffer.from(s, 'base64').toString('utf8') : null;

// Apply one Judge0 per-case result and recompute the parent submission.
// Used by both the callback handler (push) and the poller (pull, for hosted Judge0).
export async function applyJudge0CaseResult(
  submissionId: string,
  testCaseId: string,
  body: any,
  { alreadyDecoded = false }: { alreadyDecoded?: boolean } = {},
) {
  const verdict = judge0StatusToVerdict(body?.status?.id ?? 13);
  const runtimeMs =
    body?.time != null ? Math.round(parseFloat(body.time) * 1000) : null;
  const memoryKb = body?.memory != null ? Number(body.memory) : null;

  const submissionCase = await prisma.submissionCase.findFirst({
    where: { submissionId, testCaseId },
  });
  if (!submissionCase) return;

  await prisma.submissionCase.update({
    where: { id: submissionCase.id },
    data: {
      status: verdict,
      runtimeMs,
      memoryKb,
      stdout: alreadyDecoded ? body?.stdout ?? null : fromB64(body?.stdout),
      stderr: alreadyDecoded ? body?.stderr ?? null : fromB64(body?.stderr),
      compileOutput: alreadyDecoded
        ? body?.compile_output ?? null
        : fromB64(body?.compile_output),
    },
  });

  const cases = await prisma.submissionCase.findMany({
    where: { submissionId },
  });
  const allDone = cases.every((c) => isFinalVerdict(c.status));
  const passedCount = cases.filter((c) => c.status === 'AC').length;

  if (allDone) {
    const overall = combineVerdicts(cases.map((c) => c.status));
    const maxRuntime = Math.max(...cases.map((c) => c.runtimeMs ?? 0));
    const maxMemory = Math.max(...cases.map((c) => c.memoryKb ?? 0));

    const sub = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: overall,
        passedCount,
        runtimeMs: maxRuntime || null,
        memoryKb: maxMemory || null,
        finishedAt: new Date(),
      },
    });

    if (overall === 'AC' && sub.contestId) {
      await updateContestScore(sub.contestId, sub.userId);
    }
  } else {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { passedCount },
    });
  }
}

// Judge0 PUTs the full submission JSON (base64-encoded fields) to callback_url.
internalRouter.put('/judge0-callback', async (req, res) => {
  const subId = req.query.subId as string;
  const caseId = req.query.caseId as string;
  const sig = req.query.sig as string;
  const expected = crypto
    .createHmac('sha256', process.env.JUDGE0_CALLBACK_SECRET ?? '')
    .update(`${subId}:${caseId}`)
    .digest('hex');
  if (
    !subId ||
    !caseId ||
    !sig ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    res.status(401).end();
    return;
  }
  await applyJudge0CaseResult(subId, caseId, req.body);
  res.status(204).end();
});

async function updateContestScore(contestId: string, userId: string) {
  // Sum points for distinct AC problems within contest window
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
