'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Pager } from '@/components/Pager';

interface BookmarkRow {
  createdAt: string;
  problem: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    tags: { slug: string; name: string }[];
  };
}

export default function BookmarksPage() {
  const [items, setItems] = useState<BookmarkRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get<{ bookmarks: BookmarkRow[]; pageCount: number }>(
        `/api/bookmarks?page=${page}&limit=20`,
      )
      .then((r) => {
        setItems(r.bookmarks);
        setPageCount(r.pageCount);
      })
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, [page]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bookmarked Problems</h1>
      {loaded && items.length === 0 && (
        <p className="text-muted">
          You haven&apos;t bookmarked any problems yet. Click the ☆ next to a
          problem title to save it for later.
        </p>
      )}
      <div className="space-y-2">
        {items.map((b) => (
          <Link
            key={b.problem.id}
            href={`/problems/${b.problem.slug}`}
            className="flex items-center gap-3 rounded border border-border bg-panel p-3 hover:border-accent"
          >
            <span className="text-warn">★</span>
            <span className="font-medium">{b.problem.title}</span>
            <DifficultyBadge value={b.problem.difficulty} />
            <span className="ml-auto text-xs text-muted">
              {b.problem.tags.map((t) => t.name).join(', ')}
            </span>
          </Link>
        ))}
      </div>
      <Pager page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}
