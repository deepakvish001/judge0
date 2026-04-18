'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Heatmap } from '@/components/Heatmap';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api
      .get(`/api/users/${username}`)
      .then(setData)
      .catch(() => {});
  }, [username]);

  if (!data) return <p className="text-muted">Loading…</p>;
  const { user, stats, solved, recent, heatmap } = data;
  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1c2026] text-2xl">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="h-14 w-14 rounded-full"
            />
          ) : (
            user.username[0].toUpperCase()
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold">{user.username}</h1>
          <p className="text-xs text-muted">
            Rating {user.rating} · Joined{' '}
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
          {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
        </div>
        <div className="ml-auto grid grid-cols-3 gap-4 text-center">
          <Stat label="Solved" value={stats.solvedCount} />
          <Stat label="Submissions" value={stats.submissionCount} />
          <Stat
            label="Easy / Med / Hard"
            value={`${stats.byDifficulty.EASY} / ${stats.byDifficulty.MEDIUM} / ${stats.byDifficulty.HARD}`}
          />
        </div>
      </div>

      {heatmap && (
        <div className="card">
          <h3 className="mb-2 text-lg font-semibold">Activity</h3>
          <Heatmap since={heatmap.since} days={heatmap.days} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 text-lg font-semibold">Solved Problems</h3>
          <ul className="space-y-1 text-sm">
            {solved.map((p: any) => (
              <li key={p.slug} className="flex items-center justify-between">
                <Link href={`/problems/${p.slug}`}>{p.title}</Link>
                <DifficultyBadge value={p.difficulty} />
              </li>
            ))}
            {solved.length === 0 && (
              <li className="text-muted">No problems solved yet.</li>
            )}
          </ul>
        </div>
        <div className="card">
          <h3 className="mb-2 text-lg font-semibold">Recent Submissions</h3>
          <ul className="space-y-1 text-sm">
            {recent.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between">
                <Link href={`/submissions/${s.id}`}>{s.problem.title}</Link>
                <StatusBadge value={s.status} />
              </li>
            ))}
            {recent.length === 0 && (
              <li className="text-muted">No submissions yet.</li>
            )}
          </ul>
        </div>
      </div>

      {stats.byTag && stats.byTag.length > 0 && (
        <div className="card">
          <h3 className="mb-2 text-lg font-semibold">Topics</h3>
          <div className="flex flex-wrap gap-2">
            {stats.byTag.map((t: any) => (
              <span
                key={t.slug}
                className="rounded bg-[#1c2026] px-2 py-1 text-xs"
              >
                {t.name}
                <span className="ml-1 text-muted">{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
