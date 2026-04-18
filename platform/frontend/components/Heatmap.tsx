'use client';

import clsx from 'clsx';

interface HeatmapProps {
  since: string; // YYYY-MM-DD (first day)
  days: Record<string, { total: number; ac: number }>;
}

function level(total: number): number {
  if (total === 0) return 0;
  if (total < 2) return 1;
  if (total < 4) return 2;
  if (total < 8) return 3;
  return 4;
}

const COLORS = [
  'bg-[#1c2026]',
  'bg-green-900',
  'bg-green-700',
  'bg-green-500',
  'bg-green-400',
];

export function Heatmap({ since, days }: HeatmapProps) {
  const start = new Date(`${since}T00:00:00Z`);
  // Align to previous Sunday for grid rendering.
  const startDay = start.getUTCDay();
  const gridStart = new Date(start);
  gridStart.setUTCDate(gridStart.getUTCDate() - startDay);

  const weeks: { date: string; total: number; ac: number }[][] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const cur = new Date(gridStart);
  let week: { date: string; total: number; ac: number }[] = [];
  while (cur <= today) {
    const key = cur.toISOString().slice(0, 10);
    const v = days[key] ?? { total: 0, ac: 0 };
    week.push({ date: key, total: v.total, ac: v.ac });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  if (week.length > 0) weeks.push(week);

  const totalSubs = Object.values(days).reduce((s, d) => s + d.total, 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>{totalSubs} submissions in the last year</span>
        <span className="flex items-center gap-1">
          less
          {COLORS.map((c, i) => (
            <span key={i} className={clsx('h-3 w-3 rounded-sm', c)} />
          ))}
          more
        </span>
      </div>
      <div className="flex gap-[3px] overflow-x-auto">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {w.map((d) => (
              <span
                key={d.date}
                title={`${d.date}: ${d.total} submission${d.total === 1 ? '' : 's'} (${d.ac} accepted)`}
                className={clsx(
                  'h-3 w-3 rounded-sm',
                  COLORS[level(d.total)],
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
