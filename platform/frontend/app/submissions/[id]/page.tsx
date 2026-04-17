'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { langById } from '@/lib/languages';

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    function fetchOnce() {
      api
        .get<{ submission: any }>(`/api/submissions/${id}`)
        .then((r) => {
          if (!alive) return;
          setSub(r.submission);
          if (
            r.submission.status === 'PENDING' ||
            r.submission.status === 'RUNNING'
          ) {
            setTimeout(fetchOnce, 1500);
          }
        })
        .catch(() => {});
    }
    fetchOnce();
    return () => {
      alive = false;
    };
  }, [id]);

  if (!sub) return <p className="text-muted">Loading…</p>;
  const lang = langById(sub.languageId);
  return (
    <div className="space-y-4">
      <Link href={`/problems/${sub.problem.slug}`} className="text-sm">
        ← {sub.problem.title}
      </Link>
      <div className="card flex items-center gap-4">
        <StatusBadge value={sub.status} />
        <span className="text-muted">
          {sub.passedCount}/{sub.totalCount} cases
        </span>
        {sub.runtimeMs != null && (
          <span className="text-muted">
            · {sub.runtimeMs} ms · {sub.memoryKb ?? 0} KB
          </span>
        )}
        <span className="ml-auto text-xs text-muted">
          {lang?.name} · by {sub.username} ·{' '}
          {new Date(sub.createdAt).toLocaleString()}
        </span>
      </div>
      {sub.sourceCode && (
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold">Source</h3>
          <pre className="overflow-auto rounded bg-[#1c2026] p-3 text-xs">
            {sub.sourceCode}
          </pre>
        </div>
      )}
      <div className="card">
        <h3 className="mb-2 text-sm font-semibold">Test Cases</h3>
        <ul className="space-y-1 text-xs">
          {sub.cases.map((c: any) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded border border-border p-2"
            >
              <span className="w-12 text-muted">#{c.order + 1}</span>
              <StatusBadge value={c.status} />
              {c.runtimeMs != null && (
                <span className="text-muted">{c.runtimeMs} ms</span>
              )}
              <span className="ml-auto text-muted">
                {c.isSample ? 'sample' : 'hidden'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
