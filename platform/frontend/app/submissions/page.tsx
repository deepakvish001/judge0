'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { Pager } from '@/components/Pager';

export default function SubmissionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  useEffect(() => {
    api
      .get<{ submissions: any[]; pageCount: number }>(
        `/api/submissions?mine=true&page=${page}&limit=20`,
      )
      .then((r) => {
        setItems(r.submissions);
        setPageCount(r.pageCount);
      })
      .catch(() => setItems([]));
  }, [page]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Submissions</h1>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-muted">
            <tr>
              <th className="px-4 py-2">Problem</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Cases</th>
              <th className="px-4 py-2">Runtime</th>
              <th className="px-4 py-2">When</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/problems/${s.problem.slug}`}>
                    {s.problem.title}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge value={s.status} />
                </td>
                <td className="px-4 py-2 text-muted">
                  {s.passedCount}/{s.totalCount}
                </td>
                <td className="px-4 py-2 text-muted">
                  {s.runtimeMs != null ? `${s.runtimeMs} ms` : '—'}
                </td>
                <td className="px-4 py-2 text-muted">
                  {new Date(s.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/submissions/${s.id}`} className="text-accent">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={6}>
                  No submissions yet.
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
