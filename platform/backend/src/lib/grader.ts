import type { SubmissionStatus } from '@prisma/client';

// Mirror of Judge0 app/models/status.rb
export const J0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TLE: 5,
  COMPILATION_ERROR: 6,
  RE_SIGSEGV: 7,
  RE_SIGXFSZ: 8,
  RE_SIGFPE: 9,
  RE_SIGABRT: 10,
  RE_NZEC: 11,
  RE_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const;

export function judge0StatusToVerdict(id: number): SubmissionStatus {
  switch (id) {
    case J0_STATUS.IN_QUEUE:
    case J0_STATUS.PROCESSING:
      return 'RUNNING';
    case J0_STATUS.ACCEPTED:
      return 'AC';
    case J0_STATUS.WRONG_ANSWER:
      return 'WA';
    case J0_STATUS.TLE:
      return 'TLE';
    case J0_STATUS.COMPILATION_ERROR:
      return 'CE';
    case J0_STATUS.RE_SIGSEGV:
    case J0_STATUS.RE_SIGXFSZ:
    case J0_STATUS.RE_SIGFPE:
    case J0_STATUS.RE_SIGABRT:
    case J0_STATUS.RE_NZEC:
    case J0_STATUS.RE_OTHER:
    case J0_STATUS.EXEC_FORMAT_ERROR:
      return 'RE';
    case J0_STATUS.INTERNAL_ERROR:
    default:
      return 'IE';
  }
}

// Worst-case verdict across many cases (AC only if all AC)
const RANK: Record<SubmissionStatus, number> = {
  AC: 0,
  PENDING: 1,
  RUNNING: 2,
  WA: 3,
  TLE: 4,
  MLE: 5,
  RE: 6,
  CE: 7,
  IE: 8,
};

export function combineVerdicts(verdicts: SubmissionStatus[]): SubmissionStatus {
  if (verdicts.length === 0) return 'PENDING';
  return verdicts.reduce((acc, v) => (RANK[v] >= RANK[acc] ? v : acc), 'AC');
}

export function isFinalVerdict(s: SubmissionStatus): boolean {
  return s !== 'PENDING' && s !== 'RUNNING';
}
