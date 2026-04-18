'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Pager } from '@/components/Pager';
import { Stars } from '@/components/Stars';

interface ProblemRow {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  tags: { slug: string; name: string }[];
  submissionCount: number;
  ratingAvg: number;
  ratingCount: number;
  solved: boolean;
  bookmarked: boolean;
}

export default function ProblemsPage() {
  const [items, setItems] = useState<ProblemRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [tagOpts, setTagOpts] = useState<{ slug: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [tag, setTag] = useState('');

  useEffect(() => {
    api
      .get<{ tags: { slug: string; name: string }[] }>('/api/tags')
      .then((r) => setTagOpts(r.tags))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (difficulty) params.set('difficulty', difficulty);
    if (tag) params.set('tag', tag);
    params.set('page', String(page));
    params.set('limit', '20');
    api
      .get<{ problems: ProblemRow[]; total: number; pageCount: number }>(
        `/api/problems?${params.toString()}`,
      )
      .then((r) => {
        setItems(r.problems);
        setTotal(r.total);
        setPageCount(r.pageCount);
      })
      .catch(() => setItems([]));
  }, [search, difficulty, tag, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, difficulty, tag]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Problems</h1>
      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-[140px]"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          className="input max-w-[160px]"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">All tags</option>
          {tagOpts.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="ml-auto self-center text-xs text-muted">
          {total} problems
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-muted">
            <tr>
              <th className="w-10 px-4 py-2"></th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Difficulty</th>
              <th className="px-4 py-2">Tags</th>
              <th className="px-4 py-2">Rating</th>
              <th className="px-4 py-2">Submissions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-panel">
                <td className="px-4 py-2 text-accent">{p.solved ? '✓' : ''}</td>
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2">
                    {p.bookmarked && (
                      <span className="text-warn" title="Bookmarked">
                        ★
                      </span>
                    )}
                    <Link
                      href={`/problems/${p.slug}`}
                      className="font-medium text-text"
                    >
                      {p.title}
                    </Link>
                  </span>
                </td>
                <td className="px-4 py-2">
                  <DifficultyBadge value={p.difficulty} />
                </td>
                <td className="px-4 py-2 text-muted">
                  {p.tags.map((t) => t.name).join(', ')}
                </td>
                <td className="px-4 py-2">
                  <Stars
                    value={p.ratingAvg}
                    count={p.ratingCount}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-2 text-muted">{p.submissionCount}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  No problems found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}
