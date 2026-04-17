'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { LANGUAGES } from '@/lib/languages';

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
            <textarea
              className="input h-48 font-mono text-xs"
              value={f.statementMd}
              onChange={(e) => setF({ ...f, statementMd: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Constraints (Markdown, optional)</label>
            <textarea
              className="input h-24 font-mono text-xs"
              value={f.constraintsMd}
              onChange={(e) =>
                setF({ ...f, constraintsMd: e.target.value })
              }
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

      {err && <div className="text-sm text-danger">{err}</div>}
      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="btn-primary">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button className="btn" onClick={() => router.push('/admin')}>
          Cancel
        </button>
      </div>
    </div>
  );
}
