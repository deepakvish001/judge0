'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Pager } from '@/components/Pager';

export default function LeaderboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  useEffect(() => {
    api
      .get<{ leaderboard: any[]; pageCount: number }>(
        `/api/leaderboard?page=${page}&limit=25`,
      )
      .then((r) => {
        setItems(r.leaderboard);
        setPageCount(r.pageCount);
      })
      .catch(() => setItems([]));
  }, [page]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Global Leaderboard</h1>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-muted">
            <tr>
              <th className="w-12 px-4 py-2">#</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Solved</th>
              <th className="px-4 py-2">Rating</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.username} className="border-t border-border">
                <td className="px-4 py-2">{r.rank}</td>
                <td className="px-4 py-2">
                  <Link href={`/users/${r.username}`}>{r.username}</Link>
                </td>
                <td className="px-4 py-2">{r.solved}</td>
                <td className="px-4 py-2 text-muted">{r.rating}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}
