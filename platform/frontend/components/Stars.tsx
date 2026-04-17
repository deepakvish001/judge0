'use client';

import clsx from 'clsx';

export function Stars({
  value,
  count,
  myRating,
  onRate,
  size = 'md',
}: {
  value: number;
  count: number;
  myRating?: number | null;
  onRate?: (v: number) => void;
  size?: 'sm' | 'md';
}) {
  const full = Math.round(value);
  const cls = size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <div className="flex items-center gap-1">
      <div className={clsx('flex', cls)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = myRating ? n <= myRating : n <= full;
          const interactive = !!onRate;
          return (
            <button
              key={n}
              type="button"
              disabled={!interactive}
              onClick={() => onRate?.(n)}
              className={clsx(
                'px-0.5 leading-none',
                filled ? 'text-warn' : 'text-muted',
                interactive && 'hover:text-warn',
              )}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          );
        })}
      </div>
      <span className="text-xs text-muted">
        {value.toFixed(1)} ({count})
      </span>
    </div>
  );
}
