'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Markdown } from '@/components/Markdown';
import { langById } from '@/lib/languages';
import { useMe } from '@/lib/me';

interface Solution {
  id: string;
  title: string;
  bodyMd: string;
  code: string;
  languageId: number;
  upvotes: number;
  createdAt: string;
  myVote: boolean;
  user: { username: string; avatarUrl: string | null };
  problem: { slug: string; title: string };
}

export default function SolutionPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const [s, setS] = useState<Solution | null>(null);

  function load() {
    api
      .get<{ solution: Solution }>(`/api/solutions/${id}`)
      .then((r) => setS(r.solution))
      .catch(() => setS(null));
  }
  useEffect(load, [id]);

  async function upvote() {
    if (!me) return;
    const r = await api.post<{ upvoted: boolean; upvotes: number }>(
      `/api/solutions/${id}/upvote`,
    );
    if (s) setS({ ...s, myVote: r.upvoted, upvotes: r.upvotes });
  }

  if (!s) return <p className="text-muted">Loading…</p>;
  const lang = langById(s.languageId);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/problems/${s.problem.slug}`} className="text-sm">
        ← {s.problem.title}
      </Link>
      <div className="card space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{s.title}</h1>
          <button
            onClick={upvote}
            disabled={!me}
            className={`ml-auto rounded border border-border px-2 py-1 text-sm ${
              s.myVote ? 'text-accent' : 'text-muted hover:text-accent'
            }`}
          >
            ▲ {s.upvotes}
          </button>
        </div>
        <p className="text-xs text-muted">
          by {s.user.username} · {new Date(s.createdAt).toLocaleString()} ·{' '}
          {lang?.name ?? `lang ${s.languageId}`}
        </p>
        <Markdown>{s.bodyMd}</Markdown>
        <h3 className="mt-4 text-sm font-semibold text-muted">Code</h3>
        <pre className="overflow-auto rounded bg-[#1c2026] p-3 text-xs">
          <code>{s.code}</code>
        </pre>
      </div>
    </div>
  );
}
