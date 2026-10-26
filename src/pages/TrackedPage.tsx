import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProviders, useTracked, useTrackedCheck, useTrackedToggle } from '../api/sources';
import type { ActionMessage } from '../api/types';
import ActionMessages from '../components/ActionMessages';
import { useDebounce } from '../hooks/useDebounce';

const PAGE_SIZE = 50;

export default function TrackedPage() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 350);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [messages, setMessages] = useState<ActionMessage[]>([]);
  const { data: providers } = useProviders();
  const toggle = useTrackedToggle();
  const check = useTrackedCheck();
  const page = Number(sp.get('page') ?? 1);
  const { data, isFetching } = useTracked({
    provider: sp.get('provider') ?? '', active: sp.get('active') ?? '', q: dq, page: String(page), page_size: String(PAGE_SIZE),
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };

  async function runCheck() {
    if (!confirm(`${selected.size} ta serial manbasi tekshirilsin? Yangi qism topilsa saytlarga yuboriladi.`)) return;
    try { setMessages((await check.mutateAsync([...selected])).messages); setSelected(new Set()); }
    catch (e) { setMessages([{ level: 'error', text: (e as Error).message }]); }
  }

  return (
    <>
      <header className="page-head">
        <h2><Link to="/sources" className="muted">Manbalar /</Link> Kuzatilayotgan seriallar {data && <small>{data.total}</small>}</h2>
      </header>
      <div className="filters">
        <input className="search" placeholder="Nomi yoki slug…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={sp.get('provider') ?? ''} onChange={(e) => set('provider', e.target.value)}>
          <option value="">Barcha manbalar</option>
          {providers?.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
        <select value={sp.get('active') ?? ''} onChange={(e) => set('active', e.target.value)}>
          <option value="">Holat</option><option value="true">Faol</option><option value="false">O‘chirilgan</option>
        </select>
      </div>
      {selected.size > 0 && (
        <div className="card bulk-bar">
          <strong>{selected.size} ta tanlandi</strong>
          <button className="btn primary sm" disabled={check.isPending} onClick={runCheck}>{check.isPending ? 'Tekshirilmoqda…' : 'Hozir tekshirish'}</button>
          <span className="muted small">Tanlangan seriallarning manbasi to‘liq tekshiriladi.</span>
        </div>
      )}
      <ActionMessages messages={messages} onClose={() => setMessages([])} />
      <div className={`card table-wrap ${isFetching ? 'fetching' : ''}`}>
        <table className="movies">
          <thead><tr><th className="sel"></th><th>Nomi</th><th>Manba</th><th>Oxirgi qism</th><th>Movie</th><th>Faol</th><th>Yangilangan</th></tr></thead>
          <tbody>
            {data?.items.map((t) => (
              <tr key={t.id}>
                <td className="sel"><input type="checkbox" checked={selected.has(t.id)}
                  onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })} /></td>
                <td className="wrap">{t.title || t.external_key || t.external_id}</td>
                <td><span className="chip">{t.provider_code}</span> <span className="muted small">#{t.external_key || t.external_id}</span></td>
                <td>{t.last_episode || '—'}</td>
                <td>{t.movie_id ? <Link to={`/movies/${t.movie_id}`}>#{t.movie_id}</Link> : <span className="muted">—</span>}</td>
                <td><input type="checkbox" checked={t.is_active} disabled={toggle.isPending} aria-label="Faol"
                  onChange={(e) => toggle.mutate({ id: t.id, active: e.target.checked })} /></td>
                <td className="muted">{new Date(t.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button className="btn ghost sm" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>← Oldingi</button>
        <span>{page} / {pages}</span>
        <button className="btn ghost sm" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>Keyingi →</button>
      </div>
    </>
  );
}
