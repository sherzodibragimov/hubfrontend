import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, tokenStore } from '../api/client';

export default function LoginPage() {
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const body = new URLSearchParams(new FormData(e.currentTarget) as unknown as Record<string, string>);
      const r = await api<{ access_token: string }>('/auth/token', { method: 'POST', body });
      tokenStore.set(r.access_token);
      nav('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submit}>
        <h1>OneTV <span>Hub</span></h1>
        <label>Login<input name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus /></label>
        <label>Parol<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <div className="alert error">{error}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Kirilmoqda…' : 'Kirish'}</button>
      </form>
    </div>
  );
}
