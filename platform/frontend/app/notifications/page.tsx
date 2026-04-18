'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Pager } from '@/components/Pager';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    api
      .get<{ notifications: Notification[]; pageCount: number }>(
        `/api/notifications?page=${page}&limit=20`,
      )
      .then((r) => {
        setItems(r.notifications);
        setPageCount(r.pageCount);
      })
      .catch(() => setItems([]));
  }, [page]);

  async function markAllRead() {
    await api.post('/api/notifications/read');
    setItems(
      items.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button className="btn" onClick={markAllRead}>
          Mark all read
        </button>
      </div>
      <div className="space-y-2">
        {items.map((n) => (
          <Link
            key={n.id}
            href={n.href ?? '#'}
            className={`block rounded border border-border p-3 ${
              n.readAt ? 'bg-panel' : 'bg-[#1c2026]'
            }`}
          >
            <div className="font-medium">{n.title}</div>
            <div className="text-sm text-muted">{n.body}</div>
            <div className="mt-1 text-xs text-muted">
              {new Date(n.createdAt).toLocaleString()}
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="text-muted">No notifications yet.</p>
        )}
      </div>
      <Pager page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}
