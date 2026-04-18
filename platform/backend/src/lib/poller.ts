import { prisma } from './prisma.js';
import { judge0 } from './judge0.js';
import { applyJudge0CaseResult } from '../routes/internal.js';
import { isFinalVerdict, judge0StatusToVerdict } from './grader.js';

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_TRIES = 80; // ~2 minutes

// Pull Judge0 batch results and update submission cases until all are final.
// Used when callbacks can't reach this backend (e.g. hosted Judge0).
export function startSubmissionPolling(submissionId: string) {
  let tries = 0;
  const tick = async () => {
    tries++;
    try {
      const cases = await prisma.submissionCase.findMany({
        where: { submissionId },
        select: {
          id: true,
          testCaseId: true,
          status: true,
          judge0Token: true,
        },
      });
      const pending = cases.filter(
        (c) => !isFinalVerdict(c.status) && c.judge0Token,
      );
      if (pending.length === 0) return;

      const tokens = pending.map((c) => c.judge0Token!);
      const results = await judge0.getBatch(tokens);
      const byToken = new Map(results.map((r) => [r.token, r]));

      for (const c of pending) {
        const r = byToken.get(c.judge0Token!);
        if (!r) continue;
        const verdict = judge0StatusToVerdict(r.status?.id ?? 13);
        if (!isFinalVerdict(verdict)) continue;
        await applyJudge0CaseResult(submissionId, c.testCaseId, r, {
          alreadyDecoded: true,
        });
      }

      const fresh = await prisma.submissionCase.findMany({
        where: { submissionId },
        select: { status: true },
      });
      if (fresh.every((c) => isFinalVerdict(c.status))) return;
    } catch (e) {
      console.error('poller error', e);
    }
    if (tries >= POLL_MAX_TRIES) {
      console.warn(`submission ${submissionId} poll timed out`);
      return;
    }
    setTimeout(tick, POLL_INTERVAL_MS);
  };
  setTimeout(tick, POLL_INTERVAL_MS);
}
