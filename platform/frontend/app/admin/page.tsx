'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/me';
import { DifficultyBadge } from '@/components/DifficultyBadge';

export default function AdminHome() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.push('/login');
      return;
    }
    if (me.role !== 'ADMIN') {
      setErr('Not an admin account.');
      return;
    }
    api
      .get<{ problems: any[] }>('/api/admin/problems')
      .then((r) => setItems(r.problems))
      .catch((e) => setErr(e instanceof ApiError ? e.message : 'load failed'));
  }, [me, loading, router]);

  async function del(id: string) {
    if (!confirm('Delete this problem?')) return;
    await api.del(`/api/admin/problems/${id}`);
    setItems(items.filter((p) => p.id !== id));
  }

  if (loading) return null;
  if (err) return <p className="text-danger">{err}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Problems</h1>
        <Link href="/admin/problems/new" className="btn-primary">
          New problem
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-muted">
            <tr>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Difficulty</th>
              <th className="px-4 py-2">Tests</th>
              <th className="px-4 py-2">Published</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">{p.slug}</td>
                <td className="px-4 py-2">{p.title}</td>
                <td className="px-4 py-2">
                  <DifficultyBadge value={p.difficulty} />
                </td>
                <td className="px-4 py-2">{p._count.testCases}</td>
                <td className="px-4 py-2">{p.isPublished ? '✓' : '✗'}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/problems/${p.id}`}
                    className="mr-3 text-accent"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => del(p.id)}
                    className="text-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
