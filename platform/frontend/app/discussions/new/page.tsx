'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

function NewDiscussionInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const problemSlug = sp.get('problem') ?? '';
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const { discussion } = await api.post<{ discussion: { id: string } }>(
        '/api/discussions',
        { problemSlug, title, bodyMd: body },
      );
      router.push(`/discussions/${discussion.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'failed');
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-2xl font-bold">New Discussion</h1>
      <p className="text-xs text-muted">Problem: {problemSlug || '—'}</p>
      <input
        className="input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        className="input h-64 font-mono text-sm"
        placeholder="Markdown body…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      {err && <div className="text-sm text-danger">{err}</div>}
      <button className="btn-primary">Post</button>
    </form>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <NewDiscussionInner />
    </Suspense>
  );
}
