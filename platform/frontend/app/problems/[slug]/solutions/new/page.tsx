'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { LANGUAGES } from '@/lib/languages';
import { CodeEditor } from '@/components/CodeEditor';
import { MdEditor } from '@/components/MdEditor';

export default function NewSolutionPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [bodyMd, setBodyMd] = useState(
    '## Approach\n\n_Explain your approach here..._\n\n## Complexity\n\n- Time: O(n)\n- Space: O(1)',
  );
  const [languageId, setLanguageId] = useState<number>(71);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { solution } = await api.post<{ solution: { id: string } }>(
        `/api/problems/${slug}/solutions`,
        { languageId, title, bodyMd, code },
      );
      router.push(`/solutions/${solution.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'failed');
    } finally {
      setBusy(false);
    }
  }

  const monacoLang =
    LANGUAGES.find((l) => l.id === languageId)?.monaco ?? 'plaintext';

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-2xl font-bold">Share your solution</h1>
      <p className="text-xs text-muted">Problem: {slug}</p>
      <input
        className="input"
        placeholder="Solution title (e.g. 'Two pointers, O(n) time')"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <div>
        <label className="label">Write-up (Markdown)</label>
        <MdEditor value={bodyMd} onChange={setBodyMd} height={280} />
      </div>
      <div className="flex items-center gap-2">
        <label className="label">Language</label>
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
      </div>
      <div className="h-[360px] rounded border border-border">
        <CodeEditor language={monacoLang} value={code} onChange={setCode} />
      </div>
      {err && <div className="text-sm text-danger">{err}</div>}
      <button className="btn-primary" disabled={busy || !code || !title}>
        {busy ? 'Posting…' : 'Post solution'}
      </button>
    </form>
  );
}
