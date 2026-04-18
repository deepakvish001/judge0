'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { LANGUAGES, langById } from '@/lib/languages';
import { CodeEditor } from '@/components/CodeEditor';
import { Markdown } from '@/components/Markdown';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { Stars } from '@/components/Stars';

interface ProblemDetail {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  statementMd: string;
  constraintsMd: string | null;
  starterCodes: { languageId: number; code: string }[];
  tags: { slug: string; name: string }[];
  sampleTestCases: { id: string; input: string; expectedOutput: string }[];
  ratingAvg: number;
  ratingCount: number;
  myRating: number | null;
  bookmarked: boolean;
  hintCount: number;
}

interface RunResult {
  stdout: string;
  stderr: string;
  compileOutput: string;
  time: string | null;
  memory: number | null;
  status: { id: number; description: string };
}

interface SubmissionDetail {
  id: string;
  status: string;
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  cases: Array<{
    id: string;
    status: string;
    runtimeMs: number | null;
    memoryKb: number | null;
    isSample: boolean;
    order: number;
    stdout: string | null;
    stderr: string | null;
    compileOutput: string | null;
  }>;
}

export default function ProblemDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [languageId, setLanguageId] = useState<number>(71);
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [tab, setTab] = useState<
    'description' | 'editorial' | 'solutions' | 'submissions' | 'discuss'
  >('description');
  const [bottomTab, setBottomTab] = useState<'cases' | 'result'>('cases');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorial, setEditorial] = useState<{
    locked: boolean;
    bodyMd: string | null;
  } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .get<{ problem: ProblemDetail }>(`/api/problems/${slug}`)
      .then((r) => {
        setProblem(r.problem);
        const starter = r.problem.starterCodes.find(
          (s) => s.languageId === languageId,
        );
        setCode(loadDraft(slug, languageId) ?? starter?.code ?? '');
        setStdin(r.problem.sampleTestCases[0]?.input ?? '');
      })
      .catch(() => setError('Failed to load problem'));
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Switch starter when language changes
  useEffect(() => {
    if (!problem) return;
    const draft = loadDraft(slug, languageId);
    if (draft != null) {
      setCode(draft);
      return;
    }
    const starter = problem.starterCodes.find(
      (s) => s.languageId === languageId,
    );
    setCode(starter?.code ?? '');
  }, [languageId, problem, slug]);

  // Persist drafts
  useEffect(() => {
    if (!problem) return;
    saveDraft(slug, languageId, code);
  }, [code, languageId, slug, problem]);

  const lang = useMemo(() => langById(languageId), [languageId]);

  useEffect(() => {
    if (tab !== 'editorial' || editorial) return;
    api
      .get<{ locked: boolean; bodyMd: string | null }>(
        `/api/problems/${slug}/editorial`,
      )
      .then(setEditorial)
      .catch(() => setEditorial({ locked: true, bodyMd: null }));
  }, [tab, slug, editorial]);

  async function onRate(value: number) {
    if (!problem) return;
    try {
      const r = await api.post<{
        ratingAvg: number;
        ratingCount: number;
        myRating: number;
      }>(`/api/problems/${slug}/rate`, { value });
      setProblem({
        ...problem,
        ratingAvg: r.ratingAvg,
        ratingCount: r.ratingCount,
        myRating: r.myRating,
      });
    } catch {
      // ignore — likely not logged in
    }
  }

  async function onToggleBookmark() {
    if (!problem) return;
    try {
      const r = await api.post<{ bookmarked: boolean }>(
        `/api/problems/${slug}/bookmark`,
      );
      setProblem({ ...problem, bookmarked: r.bookmarked });
    } catch {
      // ignore
    }
  }

  async function onRun() {
    setBusy(true);
    setError(null);
    setBottomTab('result');
    try {
      const r = await api.post<RunResult>(`/api/problems/${slug}/run`, {
        languageId,
        sourceCode: code,
        stdin,
      });
      setRunResult(r);
      setSubmission(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Run failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setBottomTab('result');
    setRunResult(null);
    try {
      const { submissionId } = await api.post<{ submissionId: string }>(
        `/api/problems/${slug}/submit`,
        { languageId, sourceCode: code },
      );
      pollSubmission(submissionId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Submit failed');
      setBusy(false);
    }
  }

  function pollSubmission(id: string) {
    api
      .get<{ submission: SubmissionDetail }>(`/api/submissions/${id}`)
      .then(({ submission }) => {
        setSubmission(submission);
        if (submission.status === 'PENDING' || submission.status === 'RUNNING') {
          pollTimer.current = setTimeout(() => pollSubmission(id), 1200);
        } else {
          setBusy(false);
        }
      })
      .catch(() => setBusy(false));
  }

  if (error && !problem)
    return <p className="text-danger">{error}</p>;
  if (!problem) return <p className="text-muted">Loading…</p>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-border bg-panel">
        <div className="border-b border-border p-4">
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-xl font-bold">{problem.title}</h1>
            <DifficultyBadge value={problem.difficulty} />
            <button
              onClick={onToggleBookmark}
              title={problem.bookmarked ? 'Remove bookmark' : 'Bookmark'}
              className={`text-lg leading-none ${
                problem.bookmarked ? 'text-warn' : 'text-muted hover:text-warn'
              }`}
            >
              {problem.bookmarked ? '★' : '☆'}
            </button>
            <div className="ml-auto">
              <Stars
                value={problem.ratingAvg}
                count={problem.ratingCount}
                myRating={problem.myRating}
                onRate={onRate}
              />
            </div>
          </div>
          <div className="flex gap-2 text-xs text-muted">
            {problem.tags.map((t) => (
              <span key={t.slug} className="rounded bg-[#1c2026] px-2 py-0.5">
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-4 border-b border-border px-4 text-sm text-muted">
          {(
            [
              'description',
              'editorial',
              'solutions',
              'submissions',
              'discuss',
            ] as const
          ).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-1 py-2 capitalize ${
                  tab === t
                    ? 'border-accent text-text'
                    : 'border-transparent hover:text-text'
                }`}
              >
                {t}
              </button>
            ),
          )}
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">
          {tab === 'description' && (
            <>
              <Markdown>{problem.statementMd}</Markdown>
              {problem.constraintsMd && (
                <>
                  <h3 className="mt-6 text-lg font-semibold">Constraints</h3>
                  <Markdown>{problem.constraintsMd}</Markdown>
                </>
              )}
              {problem.sampleTestCases.length > 0 && (
                <>
                  <h3 className="mt-6 text-lg font-semibold">Examples</h3>
                  {problem.sampleTestCases.map((tc, i) => (
                    <div key={tc.id} className="mt-3">
                      <div className="text-sm text-muted">Example {i + 1}</div>
                      <pre className="mt-1 rounded bg-[#1c2026] p-2 text-xs">
                        Input:{'\n'}
                        {tc.input}
                        {'\n'}Output:{'\n'}
                        {tc.expectedOutput}
                      </pre>
                    </div>
                  ))}
                </>
              )}
              {problem.hintCount > 0 && (
                <HintsPanel slug={slug} total={problem.hintCount} />
              )}
            </>
          )}
          {tab === 'solutions' && <SolutionsList slug={slug} />}
          {tab === 'editorial' && (
            <div>
              {!editorial && <p className="text-muted">Loading…</p>}
              {editorial?.locked && (
                <p className="text-sm text-muted">
                  Editorial unlocks after you solve this problem (get an AC
                  submission).
                </p>
              )}
              {editorial && !editorial.locked && editorial.bodyMd && (
                <Markdown>{editorial.bodyMd}</Markdown>
              )}
              {editorial && !editorial.locked && !editorial.bodyMd && (
                <p className="text-sm text-muted">
                  No editorial has been written for this problem yet.
                </p>
              )}
            </div>
          )}
          {tab === 'submissions' && <SubsList slug={slug} />}
          {tab === 'discuss' && <DiscussList slug={slug} />}
        </div>
      </section>

      <section className="flex flex-col rounded-lg border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border p-3">
          <select
            className="input max-w-[260px]"
            value={languageId}
            onChange={(e) => setLanguageId(Number(e.target.value))}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={onRun} disabled={busy} className="btn">
              {busy && bottomTab === 'result' && runResult === null
                ? '…'
                : 'Run'}
            </button>
            <button
              onClick={onSubmit}
              disabled={busy}
              className="btn-primary"
            >
              Submit
            </button>
          </div>
        </div>
        <div className="h-[420px] border-b border-border">
          <CodeEditor
            language={lang?.monaco ?? 'plaintext'}
            value={code}
            onChange={setCode}
          />
        </div>
        <div className="flex gap-4 border-b border-border px-4 text-sm text-muted">
          {(['cases', 'result'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setBottomTab(t)}
              className={`-mb-px border-b-2 px-1 py-2 capitalize ${
                bottomTab === t
                  ? 'border-accent text-text'
                  : 'border-transparent hover:text-text'
              }`}
            >
              {t === 'cases' ? 'Test Cases' : 'Result'}
            </button>
          ))}
        </div>
        <div className="min-h-[160px] p-4">
          {bottomTab === 'cases' && (
            <div>
              <label className="label">Custom stdin (used by Run)</label>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                className="input h-32 font-mono text-xs"
              />
            </div>
          )}
          {bottomTab === 'result' && (
            <ResultPanel
              error={error}
              busy={busy}
              runResult={runResult}
              submission={submission}
              onOpen={(id) => router.push(`/submissions/${id}`)}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function ResultPanel({
  error,
  busy,
  runResult,
  submission,
  onOpen,
}: {
  error: string | null;
  busy: boolean;
  runResult: RunResult | null;
  submission: SubmissionDetail | null;
  onOpen: (id: string) => void;
}) {
  if (error) return <div className="text-danger">{error}</div>;
  if (submission) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-3">
          <StatusBadge value={submission.status} />
          <span className="text-muted">
            {submission.passedCount}/{submission.totalCount} cases
          </span>
          {submission.runtimeMs != null && (
            <span className="text-muted">
              · {submission.runtimeMs} ms · {submission.memoryKb ?? 0} KB
            </span>
          )}
          <button
            onClick={() => onOpen(submission.id)}
            className="ml-auto text-xs text-accent"
          >
            View full submission →
          </button>
        </div>
        <div className="space-y-1">
          {submission.cases.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded border border-border p-2 text-xs"
            >
              <span className="w-12 text-muted">#{c.order + 1}</span>
              <StatusBadge value={c.status} />
              {c.runtimeMs != null && (
                <span className="text-muted">{c.runtimeMs} ms</span>
              )}
              {c.isSample ? (
                <span className="ml-auto text-muted">sample</span>
              ) : (
                <span className="ml-auto text-muted">hidden</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (runResult) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">{runResult.status?.description}</span>
          {runResult.time && (
            <span className="text-muted">{runResult.time}s</span>
          )}
          {runResult.memory != null && (
            <span className="text-muted">{runResult.memory} KB</span>
          )}
        </div>
        {runResult.compileOutput && (
          <pre className="rounded bg-[#1c2026] p-2 text-warn">
            {runResult.compileOutput}
          </pre>
        )}
        {runResult.stdout && (
          <>
            <div className="text-muted">stdout</div>
            <pre className="rounded bg-[#1c2026] p-2">{runResult.stdout}</pre>
          </>
        )}
        {runResult.stderr && (
          <>
            <div className="text-muted">stderr</div>
            <pre className="rounded bg-[#1c2026] p-2 text-danger">
              {runResult.stderr}
            </pre>
          </>
        )}
      </div>
    );
  }
  if (busy) return <div className="text-muted">Running…</div>;
  return (
    <div className="text-sm text-muted">
      Run code to see output here, or click Submit to grade against all cases.
    </div>
  );
}

function SubsList({ slug }: { slug: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api
      .get<{ submissions: any[] }>(
        `/api/submissions?problem=${slug}&mine=true`,
      )
      .then((r) => setItems(r.submissions))
      .catch(() => setItems([]));
  }, [slug]);
  if (items.length === 0)
    return <p className="text-sm text-muted">No submissions yet.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((s) => (
        <li
          key={s.id}
          className="flex items-center justify-between rounded border border-border p-2"
        >
          <div className="flex items-center gap-3">
            <StatusBadge value={s.status} />
            <span className="text-muted">
              {new Date(s.createdAt).toLocaleString()}
            </span>
          </div>
          <Link href={`/submissions/${s.id}`} className="text-xs text-accent">
            View
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DiscussList({ slug }: { slug: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api
      .get<{ discussions: any[] }>(`/api/discussions?problem=${slug}`)
      .then((r) => setItems(r.discussions))
      .catch(() => setItems([]));
  }, [slug]);
  return (
    <div className="space-y-2 text-sm">
      <Link
        href={`/discussions/new?problem=${slug}`}
        className="btn-primary inline-block"
      >
        New thread
      </Link>
      {items.map((d) => (
        <Link
          key={d.id}
          href={`/discussions/${d.id}`}
          className="block rounded border border-border p-2"
        >
          <div className="font-medium">{d.title}</div>
          <div className="text-xs text-muted">
            by {d.user.username} · {d._count.replies} replies
          </div>
        </Link>
      ))}
      {items.length === 0 && (
        <p className="text-muted">No discussions yet — start one!</p>
      )}
    </div>
  );
}

function HintsPanel({ slug, total }: { slug: string; total: number }) {
  const [hints, setHints] = useState<{ id: string; content: string }[] | null>(
    null,
  );
  const [revealed, setRevealed] = useState(0);
  async function load() {
    const r = await api.get<{ hints: { id: string; content: string }[] }>(
      `/api/problems/${slug}/hints`,
    );
    setHints(r.hints);
    setRevealed(1);
  }
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold">Hints</h3>
      {hints === null && (
        <button onClick={load} className="btn mt-2 text-sm">
          Show hint ({total} available)
        </button>
      )}
      {hints && (
        <div className="mt-2 space-y-2">
          {hints.slice(0, revealed).map((h, i) => (
            <div
              key={h.id}
              className="rounded border border-border bg-[#1c2026] p-2 text-sm"
            >
              <div className="mb-1 text-xs text-muted">Hint {i + 1}</div>
              <Markdown>{h.content}</Markdown>
            </div>
          ))}
          {revealed < hints.length && (
            <button
              onClick={() => setRevealed(revealed + 1)}
              className="btn text-sm"
            >
              Reveal next hint ({hints.length - revealed} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SolutionsList({ slug }: { slug: string }) {
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    api
      .get<{ solutions: any[] }>(`/api/problems/${slug}/solutions`)
      .then((r) => setItems(r.solutions))
      .catch(() => setItems([]));
  }, [slug]);
  if (items === null) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="space-y-2 text-sm">
      <Link
        href={`/problems/${slug}/solutions/new`}
        className="btn-primary inline-block"
      >
        Share your solution
      </Link>
      {items.map((s) => (
        <Link
          key={s.id}
          href={`/solutions/${s.id}`}
          className="block rounded border border-border p-2"
        >
          <div className="font-medium">{s.title}</div>
          <div className="text-xs text-muted">
            by {s.user.username} · ▲ {s.upvotes} ·{' '}
            {new Date(s.createdAt).toLocaleDateString()}
          </div>
        </Link>
      ))}
      {items.length === 0 && (
        <p className="text-muted">No community solutions yet.</p>
      )}
    </div>
  );
}

function draftKey(slug: string, langId: number) {
  return `draft:${slug}:${langId}`;
}
function loadDraft(slug: string, langId: number): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(draftKey(slug, langId));
}
function saveDraft(slug: string, langId: number, code: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(draftKey(slug, langId), code);
}
