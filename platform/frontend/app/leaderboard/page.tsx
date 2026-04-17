'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function LeaderboardPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api
      .get<{ leaderboard: any[] }>('/api/leaderboard')
      .then((r) => setItems(r.leaderboard))
      .catch(() => setItems([]));
  }, []);
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
    </div>
  );
}
