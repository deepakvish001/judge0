import clsx from 'clsx';

const LABEL: Record<string, string> = {
  AC: 'Accepted',
  WA: 'Wrong Answer',
  TLE: 'Time Limit',
  MLE: 'Memory Limit',
  RE: 'Runtime Error',
  CE: 'Compile Error',
  IE: 'Internal Error',
  PENDING: 'Pending',
  RUNNING: 'Running',
};

export function StatusBadge({ value }: { value: string }) {
  const ok = value === 'AC';
  const pend = value === 'PENDING' || value === 'RUNNING';
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 text-xs font-medium',
        ok && 'bg-emerald-900/40 text-emerald-400',
        !ok && !pend && 'bg-red-900/40 text-red-400',
        pend && 'bg-blue-900/40 text-blue-400',
      )}
    >
      {LABEL[value] ?? value}
    </span>
  );
}
