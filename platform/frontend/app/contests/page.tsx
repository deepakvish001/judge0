'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ContestsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api
      .get<{ contests: any[] }>('/api/contests')
      .then((r) => setItems(r.contests))
      .catch(() => setItems([]));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Contests</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/contests/${c.slug}`}
            className="card hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{c.title}</h3>
              <span className="rounded bg-[#1c2026] px-2 py-0.5 text-xs">
                {c.state}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {new Date(c.startsAt).toLocaleString()} –{' '}
              {new Date(c.endsAt).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-muted">
              {c.problemCount} problems · {c.participantCount} participants
            </p>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="text-muted">No contests yet.</p>
        )}
      </div>
    </div>
  );
}
