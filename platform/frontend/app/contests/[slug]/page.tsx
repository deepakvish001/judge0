'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Markdown } from '@/components/Markdown';
import { DifficultyBadge } from '@/components/DifficultyBadge';

export default function ContestDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [c, setC] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ contest: any }>(`/api/contests/${slug}`)
      .then((r) => setC(r.contest))
      .catch(() => setErr('Failed to load'));
  }, [slug]);

  async function register() {
    try {
      await api.post(`/api/contests/${slug}/register`);
      alert('Registered!');
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'failed');
    }
  }

  if (err) return <p className="text-danger">{err}</p>;
  if (!c) return <p className="text-muted">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{c.title}</h1>
          <button onClick={register} className="btn-primary">
            Register
          </button>
        </div>
        <p className="text-xs text-muted">
          {new Date(c.startsAt).toLocaleString()} –{' '}
          {new Date(c.endsAt).toLocaleString()}
        </p>
        <Markdown>{c.descriptionMd}</Markdown>
      </div>
      <div className="card">
        <h3 className="mb-3 text-lg font-semibold">Problems</h3>
        <ul className="space-y-2">
          {c.problems.map((p: any) => (
            <li
              key={p.slug}
              className="flex items-center justify-between rounded border border-border p-2 text-sm"
            >
              <Link href={`/problems/${p.slug}`} className="font-medium">
                {p.title}
              </Link>
              <div className="flex items-center gap-3 text-muted">
                <DifficultyBadge value={p.difficulty} />
                <span>{p.points} pts</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3 className="mb-3 text-lg font-semibold">Leaderboard</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="px-2 py-1 w-12">#</th>
              <th className="px-2 py-1">User</th>
              <th className="px-2 py-1">Score</th>
              <th className="px-2 py-1">Last AC</th>
            </tr>
          </thead>
          <tbody>
            {c.leaderboard.map((row: any) => (
              <tr key={row.username} className="border-t border-border">
                <td className="px-2 py-1">{row.rank}</td>
                <td className="px-2 py-1">
                  <Link href={`/users/${row.username}`}>{row.username}</Link>
                </td>
                <td className="px-2 py-1">{row.score}</td>
                <td className="px-2 py-1 text-muted">
                  {row.lastSubmissionAt
                    ? new Date(row.lastSubmissionAt).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
            {c.leaderboard.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-muted">
                  No participants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
