'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/me';
import { NotificationsBell } from './NotificationsBell';

export function Navbar() {
  const { me, loading } = useMe();
  const router = useRouter();

  async function logout() {
    await api.post('/api/auth/logout');
    router.refresh();
    router.push('/');
  }

  return (
    <header className="border-b border-border bg-panel">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-text">
            ⌘ Compiler
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/problems">Problems</Link>
            <Link href="/contests">Contests</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/discussions">Discuss</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {loading ? null : me ? (
            <>
              {me.role === 'ADMIN' && (
                <Link href="/admin" className="text-warn">
                  Admin
                </Link>
              )}
              <Link href="/bookmarks" className="text-muted hover:text-text">
                Bookmarks
              </Link>
              <NotificationsBell />
              <Link href={`/users/${me.username}`}>{me.username}</Link>
              <button onClick={logout} className="btn">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
