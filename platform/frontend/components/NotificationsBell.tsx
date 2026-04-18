'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await api.get<{ notifications: Notification[]; unread: number }>(
        '/api/notifications?limit=10',
      );
      setItems(r.notifications);
      setUnread(r.unread);
    } catch {
      // not signed in
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node))
        setOpen(false);
    }
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try {
        await api.post('/api/notifications/read');
      } catch {
        // ignore
      }
      setUnread(0);
      setItems(items.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    }
  }

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={toggleOpen}
        className="relative rounded-full px-2 py-1 text-lg text-muted hover:text-text"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-border bg-panel shadow-lg">
          <div className="flex items-center justify-between border-b border-border p-2 text-sm">
            <span className="font-semibold">Notifications</span>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-accent"
            >
              View all
            </Link>
          </div>
          <ul className="max-h-96 overflow-auto">
            {items.length === 0 && (
              <li className="p-3 text-center text-sm text-muted">
                No notifications yet.
              </li>
            )}
            {items.map((n) => (
              <li key={n.id} className="border-t border-border first:border-t-0">
                <Link
                  href={n.href ?? '#'}
                  onClick={() => setOpen(false)}
                  className="block p-3 text-sm hover:bg-[#1c2026]"
                >
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-muted">{n.body}</div>
                  <div className="mt-1 text-[10px] text-muted">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
