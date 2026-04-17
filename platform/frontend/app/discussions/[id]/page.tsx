'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Markdown } from '@/components/Markdown';
import { useMe } from '@/lib/me';

export default function DiscussionDetail() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const [d, setD] = useState<any>(null);
  const [reply, setReply] = useState('');

  function load() {
    api
      .get<{ discussion: any }>(`/api/discussions/${id}`)
      .then((r) => setD(r.discussion))
      .catch(() => {});
  }
  useEffect(load, [id]);

  async function postReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    await api.post(`/api/discussions/${id}/replies`, { bodyMd: reply });
    setReply('');
    load();
  }

  async function upvote() {
    await api.post(`/api/discussions/${id}/upvote`);
    load();
  }

  if (!d) return <p className="text-muted">Loading…</p>;
  return (
    <div className="space-y-4">
      {d.problem && (
        <Link href={`/problems/${d.problem.slug}`} className="text-sm">
          ← {d.problem.title}
        </Link>
      )}
      <div className="card">
        <h1 className="mb-1 text-xl font-bold">{d.title}</h1>
        <p className="mb-2 text-xs text-muted">
          by {d.user.username} · {new Date(d.createdAt).toLocaleString()} ·{' '}
          {d.upvotes} upvotes
          <button onClick={upvote} className="ml-2 text-accent">
            ▲
          </button>
        </p>
        <Markdown>{d.bodyMd}</Markdown>
      </div>

      <h2 className="text-lg font-semibold">Replies ({d.replies.length})</h2>
      <div className="space-y-2">
        {d.replies.map((r: any) => (
          <div key={r.id} className="card">
            <p className="mb-2 text-xs text-muted">
              {r.user.username} · {new Date(r.createdAt).toLocaleString()}
            </p>
            <Markdown>{r.bodyMd}</Markdown>
          </div>
        ))}
      </div>

      {me ? (
        <form onSubmit={postReply} className="card space-y-2">
          <label className="label">Reply (Markdown)</label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="input h-32 font-mono text-sm"
          />
          <button type="submit" className="btn-primary">
            Post reply
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          <Link href="/login">Sign in</Link> to reply.
        </p>
      )}
    </div>
  );
}
