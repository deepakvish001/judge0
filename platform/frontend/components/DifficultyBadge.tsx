import clsx from 'clsx';

export function DifficultyBadge({ value }: { value: string }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 text-xs font-medium',
        value === 'EASY' && 'bg-emerald-900/40 text-emerald-400',
        value === 'MEDIUM' && 'bg-amber-900/40 text-amber-400',
        value === 'HARD' && 'bg-red-900/40 text-red-400',
      )}
    >
      {value}
    </span>
  );
}
