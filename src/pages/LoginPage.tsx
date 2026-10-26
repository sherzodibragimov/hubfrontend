import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, tokenStore } from '../api/client';
import Icon from '../components/Icon';
import { Challenge, solve } from '../lib/pow';

type Guard = 'solving' | 'ready' | 'error';
declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void } }
}

function useTurnstile(siteKey: string) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<string>();
  const [token, setToken] = useState('');
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const render = () => {
      if (!window.turnstile || !ref.current || id.current) return;
      id.current = window.turnstile.render(ref.current, {
        sitekey: siteKey, theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
        callback: setToken, 'expired-callback': () => setToken(''),
      });
    };
    if (window.turnstile) return render();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = render;
    document.head.appendChild(s);
  }, [siteKey]);
  const reset = () => { setToken(''); if (id.current) window.turnstile?.reset(id.current); };
  return { ref, token, reset };
}

export default function LoginPage() {
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [guard, setGuard] = useState<Guard>('solving');
  const [progress, setProgress] = useState(0);
  const [siteKey, setSiteKey] = useState('');
  const [lockedFor, setLockedFor] = useState(0);
  const proof = useRef<Promise<string> | null>(null);
  const ts = useTurnstile(siteKey);

  // Har urinish uchun yangi challenge: sahifa ochilishi bilan fonda yechiladi
  const prepare = useCallback(() => {
    setGuard('solving'); setProgress(0);
    const p = api<Challenge>('/auth/challenge').then((c) => solve(c, setProgress));
    p.then(() => setGuard('ready'), () => setGuard('error'));
    proof.current = p;
  }, []);

  useEffect(() => {
    prepare();
    api<{ turnstile_site_key: string }>('/auth/config').then((c) => setSiteKey(c.turnstile_site_key)).catch(() => {});
  }, [prepare]);

  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try {
      if (siteKey && !ts.token) throw new Error('Cloudflare tekshiruvini yakunlang');
      const body = new URLSearchParams({
        username: String(form.get('username') ?? ''), password: String(form.get('password') ?? ''),
        pow: await proof.current!, cf_token: ts.token,
      });
      const r = await api<{ access_token: string }>('/auth/token', { method: 'POST', body });
      tokenStore.set(r.access_token);
      nav('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const m = /(\d+)\s*daqiqa/.exec(err.message);
        setLockedFor(m ? Number(m[1]) * 60 : 900);
      }
      setError((err as Error).message);
      ts.reset();
      prepare();
    } finally { setBusy(false); }
  }

  const locked = lockedFor > 0;
  const mmss = `${Math.floor(lockedFor / 60)}:${String(lockedFor % 60).padStart(2, '0')}`;

  return (
    <div className="auth">
      <section className="auth-art" aria-hidden="true">
        <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
        <div className="grid-lines" />
        <div className="auth-art-inner">
          <div className="logo-mark lg"><Icon name="tv" size={44} /></div>
        </div>
        <div className="reel">{Array.from({ length: 14 }, (_, i) => <span key={i} />)}</div>
      </section>

      <section className="auth-side">
        <form className="auth-card" onSubmit={submit} noValidate={false}>
          <div className="auth-head">
            <div className="logo-mark"><Icon name="tv" size={20} /></div>
            <div><h1>OneTV <span>Hub</span></h1><p className="muted">Tizimga kirish</p></div>
          </div>

          <label className="field">
            <span>Login</span>
            <div className="input-ico"><Icon name="user" />
              <input name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus maxLength={150} placeholder="admin" />
            </div>
          </label>
          <label className="field">
            <span>Parol</span>
            <div className="input-ico"><Icon name="lock" />
              <input name="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" required maxLength={512} placeholder="••••••••" />
              <button type="button" className="eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>
                <Icon name={showPw ? 'eyeOff' : 'eye'} />
              </button>
            </div>
          </label>

          <div className={`guard ${guard}`}>
            <Icon name={guard === 'ready' ? 'shieldCheck' : 'shield'} />
            <div className="guard-text">
              {guard === 'solving' && <>Xavfsizlik tekshiruvi… <b>{Math.round(progress * 100)}%</b></>}
              {guard === 'ready' && <>Brauzer tekshirildi</>}
              {guard === 'error' && <>Tekshiruv ishlamadi — <button type="button" className="link-btn plain" onClick={prepare}>qayta</button></>}
            </div>
            <div className="guard-bar"><div style={{ width: `${guard === 'ready' ? 100 : progress * 100}%` }} /></div>
          </div>
          {siteKey && <div className="turnstile" ref={ts.ref} />}

          {error && <div className="alert error"><Icon name="alert" size={16} /> {locked ? `Bloklangan: ${mmss}` : error}</div>}

          <button className="btn primary lg block" disabled={busy || locked || guard === 'error'}>
            {busy ? 'Kirilmoqda…' : locked ? `Kuting ${mmss}` : <>Kirish <Icon name="arrowRight" /></>}
          </button>
          <p className="auth-foot muted small"><Icon name="lock" size={12} /> Himoyalangan ulanish</p>
        </form>
      </section>
    </div>
  );
}
