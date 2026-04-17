'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function DiscussionsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api
      .get<{ discussions: any[] }>('/api/discussions')
      .then((r) => setItems(r.discussions))
      .catch(() => setItems([]));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Discussions</h1>
      <ul className="space-y-2">
        {items.map((d) => (
          <li key={d.id} className="card">
            <Link href={`/discussions/${d.id}`} className="font-medium">
              {d.title}
            </Link>
            <p className="text-xs text-muted">
              {d.problem ? (
                <>
                  on{' '}
                  <Link href={`/problems/${d.problem.slug}`}>
                    {d.problem.title}
                  </Link>{' '}
                  ·{' '}
                </>
              ) : null}
              by {d.user.username} · {d._count.replies} replies
            </p>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-muted">No discussions yet.</li>
        )}
      </ul>
    </div>
  );
}
