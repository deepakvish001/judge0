'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { LANGUAGES } from '@/lib/languages';
import { MdEditor } from '@/components/MdEditor';

interface Form {
  slug: string;
  title: string;
  statementMd: string;
  constraintsMd: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isPublished: boolean;
  tags: string;
  starterCodes: { languageId: number; code: string }[];
  testCases: {
    input: string;
    expectedOutput: string;
    isSample: boolean;
    order: number;
  }[];
  hints: { content: string; order: number }[];
}

const EMPTY: Form = {
  slug: '',
  title: '',
  statementMd: '',
  constraintsMd: '',
  difficulty: 'EASY',
  isPublished: true,
  tags: '',
  starterCodes: [{ languageId: 71, code: '' }],
  testCases: [{ input: '', expectedOutput: '', isSample: true, order: 0 }],
  hints: [],
};

export default function AdminProblemEdit() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const [f, setF] = useState<Form>(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api
      .get<{ problem: any }>(`/api/admin/problems/${id}`)
      .then((r) => {
        const p = r.problem;
        setF({
          slug: p.slug,
          title: p.title,
          statementMd: p.statementMd,
          constraintsMd: p.constraintsMd ?? '',
          difficulty: p.difficulty,
          isPublished: p.isPublished,
          tags: p.tags.map((t: any) => t.tag.slug).join(', '),
          starterCodes: p.starterCodes.map((s: any) => ({
            languageId: s.languageId,
            code: s.code,
          })),
          testCases: p.testCases.map((t: any, i: number) => ({
            input: t.input,
            expectedOutput: t.expectedOutput,
            isSample: t.isSample,
            order: t.order ?? i,
          })),
          hints: (p.hints ?? []).map((h: any, i: number) => ({
            content: h.content,
            order: h.order ?? i,
          })),
        });
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : 'load failed'));
  }, [id, isNew]);

  async function save() {
    setBusy(true);
    setErr(null);
    const payload = {
      slug: f.slug,
      title: f.title,
      statementMd: f.statementMd,
      constraintsMd: f.constraintsMd || undefined,
      difficulty: f.difficulty,
      isPublished: f.isPublished,
      tags: f.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      starterCodes: f.starterCodes,
      testCases: f.testCases,
      hints: f.hints,
    };
    try {
      if (isNew) {
        await api.post('/api/admin/problems', payload);
      } else {
        await api.put(`/api/admin/problems/${id}`, payload);
      }
      router.push('/admin');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {isNew ? 'New' : 'Edit'} Problem
      </h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div>
            <label className="label">Slug (url-safe)</label>
            <input
              className="input"
              value={f.slug}
              onChange={(e) => setF({ ...f, slug: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Difficulty</label>
              <select
                className="input"
                value={f.difficulty}
                onChange={(e) =>
                  setF({ ...f, difficulty: e.target.value as any })
                }
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Tags (comma-separated slugs)</label>
              <input
                className="input"
                value={f.tags}
                onChange={(e) => setF({ ...f, tags: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.isPublished}
              onChange={(e) =>
                setF({ ...f, isPublished: e.target.checked })
              }
            />
            Published
          </label>
        </div>
        <div className="card space-y-3">
          <div>
            <label className="label">Statement (Markdown)</label>
            <MdEditor
              value={f.statementMd}
              onChange={(v) => setF({ ...f, statementMd: v })}
              height={260}
            />
          </div>
          <div>
            <label className="label">Constraints (Markdown, optional)</label>
            <MdEditor
              value={f.constraintsMd}
              onChange={(v) => setF({ ...f, constraintsMd: v })}
              height={160}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Starter Codes</h3>
          <button
            className="btn"
            onClick={() =>
              setF({
                ...f,
                starterCodes: [
                  ...f.starterCodes,
                  { languageId: 71, code: '' },
                ],
              })
            }
          >
            + Add
          </button>
        </div>
        {f.starterCodes.map((s, i) => (
          <div key={i} className="mb-3 rounded border border-border p-2">
            <div className="mb-2 flex gap-2">
              <select
                className="input max-w-[260px]"
                value={s.languageId}
                onChange={(e) => {
                  const copy = [...f.starterCodes];
                  copy[i] = { ...s, languageId: Number(e.target.value) };
                  setF({ ...f, starterCodes: copy });
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button
                className="btn ml-auto"
                onClick={() =>
                  setF({
                    ...f,
                    starterCodes: f.starterCodes.filter(
                      (_, j) => j !== i,
                    ),
                  })
                }
              >
                Remove
              </button>
            </div>
            <textarea
              className="input h-32 font-mono text-xs"
              value={s.code}
              onChange={(e) => {
                const copy = [...f.starterCodes];
                copy[i] = { ...s, code: e.target.value };
                setF({ ...f, starterCodes: copy });
              }}
            />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Test Cases</h3>
          <button
            className="btn"
            onClick={() =>
              setF({
                ...f,
                testCases: [
                  ...f.testCases,
                  {
                    input: '',
                    expectedOutput: '',
                    isSample: false,
                    order: f.testCases.length,
                  },
                ],
              })
            }
          >
            + Add
          </button>
        </div>
        {f.testCases.map((t, i) => (
          <div key={i} className="mb-3 grid gap-2 rounded border border-border p-2 md:grid-cols-2">
            <div>
              <label className="label">Input #{i + 1}</label>
              <textarea
                className="input h-24 font-mono text-xs"
                value={t.input}
                onChange={(e) => {
                  const copy = [...f.testCases];
                  copy[i] = { ...t, input: e.target.value };
                  setF({ ...f, testCases: copy });
                }}
              />
            </div>
            <div>
              <label className="label">Expected Output #{i + 1}</label>
              <textarea
                className="input h-24 font-mono text-xs"
                value={t.expectedOutput}
                onChange={(e) => {
                  const copy = [...f.testCases];
                  copy[i] = { ...t, expectedOutput: e.target.value };
                  setF({ ...f, testCases: copy });
                }}
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.isSample}
                  onChange={(e) => {
                    const copy = [...f.testCases];
                    copy[i] = { ...t, isSample: e.target.checked };
                    setF({ ...f, testCases: copy });
                  }}
                />
                Sample (visible to users)
              </label>
              <button
                className="btn ml-auto"
                onClick={() =>
                  setF({
                    ...f,
                    testCases: f.testCases.filter((_, j) => j !== i),
                  })
                }
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Hints</h3>
          <button
            className="btn"
            onClick={() =>
              setF({
                ...f,
                hints: [
                  ...f.hints,
                  { content: '', order: f.hints.length },
                ],
              })
            }
          >
            + Add hint
          </button>
        </div>
        {f.hints.map((h, i) => (
          <div
            key={i}
            className="mb-3 rounded border border-border p-2"
          >
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              <span>Hint #{i + 1}</span>
              <button
                className="btn ml-auto"
                onClick={() =>
                  setF({
                    ...f,
                    hints: f.hints.filter((_, j) => j !== i),
                  })
                }
              >
                Remove
              </button>
            </div>
            <textarea
              className="input h-20 font-mono text-xs"
              placeholder="Markdown hint…"
              value={h.content}
              onChange={(e) => {
                const copy = [...f.hints];
                copy[i] = { ...h, content: e.target.value };
                setF({ ...f, hints: copy });
              }}
            />
          </div>
        ))}
        {f.hints.length === 0 && (
          <p className="text-sm text-muted">No hints.</p>
        )}
      </div>

      {err && <div className="text-sm text-danger">{err}</div>}
      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="btn-primary">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button className="btn" onClick={() => router.push('/admin')}>
          Cancel
        </button>
      </div>

      {!isNew && (
        <>
          <CsvImport problemId={id!} />
          <EditorialEditor problemId={id!} />
        </>
      )}
    </div>
  );
}

function CsvImport({ problemId }: { problemId: string }) {
  const [csv, setCsv] = useState('');
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onImport() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await api.post<{ imported: number }>(
        `/api/admin/problems/${problemId}/test-cases/import`,
        { csv, replace },
      );
      setMsg(`Imported ${r.imported} test cases.`);
      setCsv('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'import failed');
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
  }

  return (
    <div className="card space-y-3">
      <h3 className="text-lg font-semibold">CSV Test-Case Import</h3>
      <p className="text-xs text-muted">
        Upload a CSV with columns: <code>input,expectedOutput,isSample</code>.
        Wrap fields containing commas or newlines in double quotes; escape
        internal quotes as <code>""</code>.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={onFile} />
      <textarea
        className="input h-40 font-mono text-xs"
        placeholder={'input,expectedOutput,isSample\n"1 2","3",true\n"4 5","9",false'}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={replace}
          onChange={(e) => setReplace(e.target.checked)}
        />
        Replace existing test cases
      </label>
      <div className="flex items-center gap-3">
        <button
          className="btn-primary"
          disabled={busy || !csv.trim()}
          onClick={onImport}
        >
          {busy ? 'Importing…' : 'Import'}
        </button>
        {msg && <span className="text-sm text-accent">{msg}</span>}
        {err && <span className="text-sm text-danger">{err}</span>}
      </div>
    </div>
  );
}

function EditorialEditor({ problemId }: { problemId: string }) {
  const [bodyMd, setBodyMd] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ editorial: { bodyMd: string } | null }>(
        `/api/admin/problems/${problemId}/editorial`,
      )
      .then((r) => {
        setBodyMd(r.editorial?.bodyMd ?? '');
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [problemId]);

  async function save() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await api.put(`/api/admin/problems/${problemId}/editorial`, { bodyMd });
      setMsg('Saved.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'save failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Delete editorial?')) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await api.del(`/api/admin/problems/${problemId}/editorial`);
      setBodyMd('');
      setMsg('Deleted.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h3 className="text-lg font-semibold">Editorial / Solution</h3>
      <p className="text-xs text-muted">
        Shown to users who have already solved this problem.
      </p>
      {loaded && (
        <MdEditor value={bodyMd} onChange={setBodyMd} height={260} />
      )}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save editorial'}
        </button>
        <button className="btn" disabled={busy} onClick={remove}>
          Delete
        </button>
        {msg && <span className="text-sm text-accent">{msg}</span>}
        {err && <span className="text-sm text-danger">{err}</span>}
      </div>
    </div>
  );
}
