import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSites } from '../api/hooks';
import {
  useAnimeCheckNow, useBatches, useItemAction, usePanelAction, useProviders, useRejectItems, useSourceItem,
  useSourceItems, useSyncItems,
} from '../api/sources';
import type { ActionMessage, SourceItem } from '../api/types';
import ActionMessages from '../components/ActionMessages';
import BatchProgress from '../components/BatchProgress';
import SitePicker from '../components/SitePicker';
import { useDebounce } from '../hooks/useDebounce';

const PAGE_SIZE = 40;
const STATUS_LABELS: Record<string, string> = {
  pending_download: 'Kutilmoqda', downloading: 'Yuklanmoqda', linked: 'Link', downloaded: 'Yuklangan',
  completed: 'Tayyor', cancelled: 'Bekor', rejected: 'Rad etilgan', error: 'Xato',
};
const STATUS_BADGE: Record<string, string> = {
  pending_download: 'pending', downloading: 'pending', error: 'error', rejected: 'deleted', cancelled: 'deleted',
};

function DiskBadge({ it }: { it: SourceItem }) {
  const url = it.local_video_url.trim();
  if (it.status === 'downloading') return <span className="text-info" title={it.last_error}>⏳ disk…</span>;
  if (it.status === 'error' || (it.last_error && !url)) return <span className="text-error" title={it.last_error}>✗ xato</span>;
  if (url && (url.includes('.m3u8') || url.includes('cdn-free'))) return <span className="text-ok" title={url.split('\n')[0]}>✓ m3u8</span>;
  if (it.video_mode === 'disk' && url) return <span className="text-ok">✓ disk</span>;
  if (it.video_mode === 'link' && url) return <span className="muted">link</span>;
  return <span className="muted">—</span>;
}

function Panel({ provider, onResult }: { provider: string; onResult: (m: ActionMessage[]) => void }) {
  const act = usePanelAction();
  const checkNow = useAnimeCheckNow();
  const [external, setExternal] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const anime = provider === 'mochitv';

  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    try {
      const r = await act.mutateAsync({ provider_code: provider, action, ...extra });
      onResult(r.messages);
      if (action === 'add' && r.ok) setExternal('');
    } catch (e) { onResult([{ level: 'error', text: (e as Error).message }]); }
  };
  const add = (e: FormEvent) => { e.preventDefault(); if (external.trim()) run('add', { external: external.trim() }); };

  return (
    <div className="card panel">
      <form className="panel-row" onSubmit={add}>
        <input placeholder={anime ? 'Slug yoki mochitv.uz URL' : 'ID yoki slug'} value={external} onChange={(e) => setExternal(e.target.value)} />
        <button className="btn primary sm" disabled={act.isPending || !external.trim()}>{act.isPending ? '…' : 'Navbatga qo‘shish'}</button>
      </form>
      {anime ? (
        <div className="panel-row">
          <button type="button" className="btn ghost sm" disabled={act.isPending} onClick={() => run('anime_sitemap')}>Sitemap sync (fon)</button>
          <button type="button" className="btn ghost sm" disabled={act.isPending} onClick={() => run('anime_check')}>Kunlik tekshiruv (fon)</button>
          <button type="button" className="btn ghost sm" disabled={checkNow.isPending}
            onClick={async () => { try { onResult((await checkNow.mutateAsync()).messages); } catch (e) { onResult([{ level: 'error', text: (e as Error).message }]); } }}>
            {checkNow.isPending ? 'Tekshirilmoqda…' : 'Hozir tekshirish'}
          </button>
        </div>
      ) : (
        <div className="panel-row">
          <button type="button" className="btn ghost sm" disabled={act.isPending} onClick={() => run('find')}>Yangi qidirish</button>
          <input className="num" placeholder="dan" inputMode="numeric" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <input className="num" placeholder="gacha" inputMode="numeric" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          <button type="button" className="btn ghost sm" disabled={act.isPending || !range.from || !range.to}
            onClick={() => run('bulk', { start_id: Number(range.from), end_id: Number(range.to) })}>Bulk scrape</button>
          <button type="button" className="btn ghost sm" disabled={act.isPending} onClick={() => run('series_check')}>Seriallarni tekshirish</button>
        </div>
      )}
    </div>
  );
}

function ItemDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: it } = useSourceItem(id);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="card drawer" onClick={(e) => e.stopPropagation()}>
        {!it ? <div className="loader" /> : (<>
          <div className="drawer-head">
            <h3>{it.title || `#${it.external_key || it.external_id}`}</h3>
            <button type="button" className="alert-close" onClick={onClose} aria-label="Yopish">×</button>
          </div>
          <div className="drawer-body">
            {it.poster_url && <img className="drawer-poster" src={it.poster_url} alt="" />}
            <dl className="kv">
              <dt>Manba</dt><dd>{it.provider_code} #{it.external_key || it.external_id}</dd>
              <dt>Holat</dt><dd>{STATUS_LABELS[it.status] ?? it.status}</dd>
              <dt>Tur</dt><dd>{it.is_series ? 'Serial' : 'Kino'} · {it.source_type} · {it.video_mode || '—'}</dd>
              <dt>Movie</dt><dd>{it.movie_id ? <Link to={`/movies/${it.movie_id}`}>#{it.movie_id}</Link> : '—'}</dd>
              {it.legacy_dle_post_id && <><dt>Eski DLE</dt><dd>#{it.legacy_dle_post_id}</dd></>}
              <dt>Yangilangan</dt><dd>{new Date(it.updated_at).toLocaleString()}</dd>
            </dl>
            {it.last_error && <div className="alert error small">{it.last_error}</div>}
            {it.video_source_url && <><h4>Video</h4><pre className="pre">{it.video_source_url}</pre></>}
            <h4>Raw</h4><pre className="pre">{JSON.stringify(it.raw, null, 2)}</pre>
          </div>
        </>)}
      </aside>
    </div>
  );
}

export default function SourcesPage() {
  const [sp, setSp] = useSearchParams();
  const { data: providers } = useProviders();
  const { data: sites = [] } = useSites();
  const provider = sp.get('provider') || 'kinochilar';
  const [q, setQ] = useState(sp.get('q') ?? '');
  const dq = useDebounce(q, 350);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [syncSites, setSyncSites] = useState<number[]>([]);
  const [messages, setMessages] = useState<ActionMessage[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const itemAct = useItemAction();
  const reject = useRejectItems();
  const sync = useSyncItems();
  const history = useBatches();

  const set = (key: string, value: string) => {
    const n = new URLSearchParams(sp);
    if (value) n.set(key, value); else n.delete(key);
    if (key !== 'page') n.delete('page');
    if (key === 'provider') { n.delete('status'); setSelected(new Set()); }
    setSp(n, { replace: true });
  };
  useEffect(() => { if ((sp.get('q') ?? '') !== dq) set('q', dq); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps

  const page = Number(sp.get('page') ?? 1);
  const { data, isFetching, error } = useSourceItems({
    provider, status: sp.get('status') ?? '', q: sp.get('q') ?? '', page: String(page), page_size: String(PAGE_SIZE),
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const current = providers?.find((p) => p.code === provider);
  const ids = [...selected];
  const pageIds = data?.items.map((i) => i.id) ?? [];
  const allOnPage = pageIds.length > 0 && pageIds.every((i) => selected.has(i));
  const busy = itemAct.isPending || reject.isPending || sync.isPending;

  async function run(label: string, fn: () => Promise<{ messages: ActionMessage[] }>) {
    if (!confirm(`${ids.length} ta element: ${label}?`)) return;
    try { setMessages((await fn()).messages); setSelected(new Set()); }
    catch (e) { setMessages([{ level: 'error', text: (e as Error).message }]); }
  }

  return (
    <>
      <header className="page-head">
        <h2>Manbalar {data && <small>{data.total.toLocaleString()}</small>}</h2>
        <div className="actions">
          <Link to="/sources/tracked" className="btn ghost">Kuzatilayotgan seriallar</Link>
          <button type="button" className="btn ghost" onClick={() => setShowHistory((v) => !v)}>Batch tarixi</button>
        </div>
      </header>

      <div className="tabs">
        {providers?.filter((p) => p.is_active).map((p) => (
          <button type="button" key={p.code} className={p.code === provider ? 'active' : ''} onClick={() => set('provider', p.code)}>
            {p.code === 'mochitv' ? 'Animelar' : p.name}
            <span className="muted small"> {Object.values(p.counts).reduce((a, b) => a + b, 0)}</span>
          </button>
        ))}
      </div>

      <BatchProgress provider={provider} />
      {showHistory && (
        <div className="card table-wrap history-table">
          <table><thead><tr><th>#</th><th>Manba</th><th>Ish</th><th>Holat</th><th>Progress</th><th>Xabar</th><th>Boshlangan</th></tr></thead>
            <tbody>{history.data?.map((b) => (
              <tr key={b.id}><td>{b.id}</td><td>{b.provider_code}</td><td>{b.mode_label}</td><td>{b.status}</td>
                <td>{b.done}/{b.total} (ok {b.ok}, xato {b.fail})</td><td className="wrap">{b.message}</td>
                <td className="muted">{new Date(b.started_at).toLocaleString()}</td></tr>
            ))}</tbody></table>
        </div>
      )}
      <Panel provider={provider} onResult={setMessages} />
      {provider === 'mochitv' && current?.last_check_report && (
        <div className="alert warn small">
          Oxirgi tekshiruv{current.last_daily_check_at ? ` (${new Date(current.last_daily_check_at).toLocaleString()})` : ''}: {current.last_check_report.slice(0, 400)}
        </div>
      )}
      <ActionMessages messages={messages} onClose={() => setMessages([])} />

      <div className="filters">
        <input className="search" placeholder="Nomi, ID, slug, xato…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={sp.get('status') ?? ''} onChange={(e) => set('status', e.target.value)}>
          <option value="">Barcha holatlar</option>
          {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}{current?.counts[k] ? ` (${current.counts[k]})` : ''}</option>)}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="card bulk-bar">
          <strong>{selected.size} ta tanlandi</strong>
          <button className="btn ghost sm" disabled={busy} onClick={() => run('qayta scrape', () => itemAct.mutateAsync({ action: 'rescrape', ids }))}>Qayta scrape</button>
          <button className="btn ghost sm" disabled={busy} onClick={() => run('link bilan Movie yaratish', () => itemAct.mutateAsync({ action: 'promote_link', ids }))}>Link → Movie</button>
          <button className="btn ghost sm" disabled={busy} onClick={() => run('diskka yuklab Movie yaratish (fon)', () => itemAct.mutateAsync({ action: 'promote_disk', ids }))}>Disk → Movie (fon)</button>
          <button className="btn danger sm" disabled={busy} onClick={() => run('rad etish', () => reject.mutateAsync(ids))}>Rad etish</button>
          <span className="sep" />
          <SitePicker sites={sites} value={syncSites} onChange={setSyncSites} />
          <button className="btn primary sm" disabled={busy || !syncSites.length}
            onClick={() => run('saytlarga yuborish', () => sync.mutateAsync({ ids, siteIds: syncSites }))}>Saytlarga yuborish</button>
          {busy && <span className="muted small">Bajarilmoqda… (scrape uzoq davom etishi mumkin)</span>}
        </div>
      )}

      {error && <div className="alert error">{(error as Error).message}</div>}
      <div className={`card table-wrap ${isFetching ? 'fetching' : ''}`}>
        <table className="movies">
          <thead><tr>
            <th className="sel"><input type="checkbox" checked={allOnPage} aria-label="Sahifadagi barchasi"
              onChange={() => setSelected((s) => { const n = new Set(s); pageIds.forEach((i) => (allOnPage ? n.delete(i) : n.add(i))); return n; })} /></th>
            <th></th><th>ID</th><th>Nomi</th><th>Holat</th><th>Tur</th><th>Video</th><th>Movie</th><th>Yangilangan</th>
          </tr></thead>
          <tbody>
            {data?.items.map((it) => (
              <tr key={it.id}>
                <td className="sel"><input type="checkbox" checked={selected.has(it.id)}
                  onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(it.id)) n.delete(it.id); else n.add(it.id); return n; })} /></td>
                <td className="thumb">{it.poster_url ? <img src={it.poster_url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="noimg" />}</td>
                <td className="muted">{it.external_key || it.external_id}</td>
                <td><button type="button" className="title-link as-btn" onClick={() => setOpenId(it.id)}>{it.title || '—'}</button></td>
                <td><span className={`badge ${STATUS_BADGE[it.status] ?? 'synced'}`}>{STATUS_LABELS[it.status] ?? it.status}</span></td>
                <td>{it.is_series ? 'Serial' : 'Kino'}</td>
                <td><DiskBadge it={it} /></td>
                <td>{it.movie_id ? <Link to={`/movies/${it.movie_id}`}>#{it.movie_id}</Link> : <span className="muted">—</span>}</td>
                <td className="muted">{new Date(it.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {data && !data.items.length && <tr><td colSpan={9} className="empty">Hech narsa topilmadi</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button className="btn ghost sm" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>← Oldingi</button>
        <span>{page} / {pages}</span>
        <button className="btn ghost sm" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>Keyingi →</button>
      </div>
      {openId != null && <ItemDrawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
