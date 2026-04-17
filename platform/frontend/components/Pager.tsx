'use client';

export function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-3 text-sm">
      <button
        className="btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← Prev
      </button>
      <span className="text-muted">
        Page {page} of {pageCount}
      </span>
      <button
        className="btn"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </button>
    </div>
  );
}
