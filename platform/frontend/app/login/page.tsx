'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUsername, setEU] = useState('');
  const [password, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api.post('/api/auth/login', { emailOrUsername, password });
      router.push('/problems');
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'login failed');
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Email or username</label>
          <input
            className="input"
            value={emailOrUsername}
            onChange={(e) => setEU(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            value={password}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {err && <div className="text-sm text-danger">{err}</div>}
        <button className="btn-primary w-full" type="submit">
          Sign in
        </button>
        <p className="text-center text-sm text-muted">
          No account? <Link href="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}
