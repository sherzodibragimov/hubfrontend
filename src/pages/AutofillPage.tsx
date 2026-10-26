import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  useAutofillBatch, useAutofillCancel, useAutofillEnqueue, useAutofillJob, useAutofillJobs, useAutofillPatch,
  useAutofillRun, useAutofillSummary, useAutofillSync,
} from '../api/system';
import type { AutofillJob } from '../api/system';
import type { ActionMessage } from '../api/types';
import ActionMessages from '../components/ActionMessages';
import { useDebounce } from '../hooks/useDebounce';

const STATUS: Record<string, [string, string]> = {
  pending: ['Kutilmoqda', 'pending'], identified: ['Aniqlangan', 'pending'], ready: ['Tayyor (tekshiring)', 'synced'],
  applied: ['Hub ga yozilgan', 'deleted'], skipped: ['O‘tkazilgan', 'error'], error: ['Xato', 'error'],
};
const MODES: [string, string][] = [
  ['identify', '1) Identify'], ['fetch', '2) Fetch proposal'], ['identify_fetch', 'Identify + Fetch'],
  ['reidentify', 'Skipped/Error → qayta'], ['commit', '3) Confirm → Hub'],
];

function Batch() {
  const { data } = useAutofillBatch();
  const cancel = useAutofillCancel();
  const b = data?.active ?? data?.recent;
  if (!b) return null;
  const running = b.status === 'running';
  return (
    <div className={`card batch ${running ? 'running' : b.status}`}>
      <div className="batch-head">
        <strong>#{b.id} {b.mode_label}</strong>
        <span className={`badge ${running ? 'pending' : b.status === 'done' ? 'synced' : 'error'}`}>{running ? 'Ishlayapti' : b.status}</span>
        <span className="muted small">{b.done}/{b.total} · ok {b.ok} · xato {b.fail}{b.current_movie_id ? ` · kino #${b.current_movie_id}` : ''}</span>
        {running && <button type="button" className="btn danger sm" disabled={cancel.isPending} onClick={() => confirm('To‘xtatasizmi?') && cancel.mutate()}>To‘xtatish</button>}
      </div>
      <div className="bar"><div style={{ width: `${b.pct}%` }} /></div>
      <div className="muted small">{b.message}</div>
    </div>
  );
}

function Flag({ job, field, label }: { job: AutofillJob; field: 'accept_fields' | 'accept_poster' | 'accept_poster_long' | 'accept_cadres'; label: string }) {
  const patch = useAutofillPatch();
  return (
    <label className="check small"><input type="checkbox" checked={job[field]} disabled={patch.isPending}
      onChange={(e) => patch.mutate({ id: job.id, [field]: e.target.checked })} />{label}</label>
  );
}

function JobDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: j } = useAutofillJob(id);
  const patch = useAutofillPatch();
  const [tmdb, setTmdb] = useState('');
  const [type, setType] = useState('');
  useEffect(() => { if (j) { setTmdb(j.tmdb_id ? String(j.tmdb_id) : ''); setType(j.media_type); } }, [j]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="card drawer" onClick={(e) => e.stopPropagation()}>
        {!j ? <div className="loader" /> : (<>
          <div className="drawer-head">
            <h3><Link to={`/movies/${j.movie_id}`}>{j.movie_name}</Link> <span className="muted small">#{j.movie_id}</span></h3>
            <button type="button" className="alert-close" onClick={onClose} aria-label="Yopish">×</button>
          </div>
          <div className="drawer-body">
            <div className="compare">
              <figure><figcaption>Eski</figcaption>{j.old_poster ? <img src={j.old_poster} alt="" /> : <div className="noimg big">—</div>}</figure>
              <figure><figcaption>Yangi</figcaption>{j.new_poster ? <img src={j.new_poster} alt="" /> : <div className="noimg big">—</div>}</figure>
            </div>
            {(j.new_poster_long || j.new_cadres.length > 0) && (
              <div className="thumbs">{[j.new_poster_long, ...j.new_cadres].filter(Boolean).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>
            )}
            <dl className="kv">
              <dt>Holat</dt><dd>{STATUS[j.status]?.[0] ?? j.status}</dd>
              <dt>Vision</dt><dd>{j.vision_title || '—'} {j.vision_year ?? ''} {j.year_ok ? <span className="text-ok">yil OK</span> : <span className="muted">(Hub yili {j.hub_year || '—'})</span>}</dd>
              <dt>TMDB</dt><dd>{j.match_title || '—'} {j.match_year} {j.match_score != null && <span className="muted">· {j.match_score.toFixed(0)} ball</span>}</dd>
              <dt>Reyting</dt><dd>IMDb {j.imdb || '—'} · KP {j.kp || '—'}</dd>
              {j.images_applied && <><dt>Yozilgan rasmlar</dt><dd>{j.images_applied}</dd></>}
            </dl>
            {j.error && <div className="alert error small">{j.error}</div>}
            <h4>Qo‘lda TMDB ID (Vision xato bo‘lsa)</h4>
            <div className="panel-row">
              <input className="num" value={tmdb} inputMode="numeric" placeholder="TMDB ID" onChange={(e) => setTmdb(e.target.value.trim())} />
              <select value={type} onChange={(e) => setType(e.target.value)}><option value="">—</option><option value="movie">Kino</option><option value="tv">Serial</option></select>
              <button type="button" className="btn primary sm" disabled={patch.isPending || !/^\d+$/.test(tmdb)}
                onClick={() => patch.mutate({ id: j.id, tmdb_id: Number(tmdb), media_type: type })}>Saqlash</button>
              <span className="muted small">so‘ng «Fetch proposal»</span>
            </div>
            <h4>Hub ga nima yozilsin</h4>
            <div className="panel-row"><Flag job={j} field="accept_fields" label="Maydonlar" /><Flag job={j} field="accept_poster" label="Poster" />
              <Flag job={j} field="accept_poster_long" label="Keng poster" /><Flag job={j} field="accept_cadres" label="Kadrlar" /></div>
            {Object.keys(j.proposed_fields).length > 0 && (<><h4>Taklif qilingan maydonlar</h4>
              <dl className="kv">{Object.entries(j.proposed_fields).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{String(v)}</dd></Fragment>)}</dl></>)}
            {j.proposed_editors.short_story && <><h4>Tavsif</h4><p className="small">{j.proposed_editors.short_story}</p></>}
            {j.candidates.length > 0 && <><h4>Nomzodlar</h4><pre className="pre">{JSON.stringify(j.candidates, null, 2)}</pre></>}
          </div>
        </>)}
      </aside>
    </div>
  );
}

export default function AutofillPage() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 350);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [messages, setMessages] = useState<ActionMessage[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const page = Number(sp.get('page') ?? 1);
  const status = sp.get('status') ?? '';
  const { data, isFetching } = useAutofillJobs({ status, q: dq, page: String(page), page_size: '30' });
  const { data: summary } = useAutofillSummary();
  const run = useAutofillRun();
  const enqueue = useAutofillEnqueue();
  const sync = useAutofillSync();
  const pages = data ? Math.max(1, Math.ceil(data.total / 30)) : 1;
  const ids = [...selected];
  const pageIds = data?.items.map((j) => j.id) ?? [];
  const allOnPage = pageIds.length > 0 && pageIds.every((i) => selected.has(i));
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };

  async function act(label: string, fn: () => Promise<{ messages: ActionMessage[] }>) {
    if (!confirm(`${label}?`)) return;
    try { setMessages((await fn()).messages); setSelected(new Set()); } catch (e) { setMessages([{ level: 'error', text: (e as Error).message }]); }
  }

  return (
    <>
      <header className="page-head">
        <h2>Autofill {data && <small>{data.total}</small>}</h2>
        <button type="button" className="btn ghost" disabled={enqueue.isPending}
          onClick={() => act('Yetishmaydigan kinolardan 50 ta job yaratish', () => enqueue.mutateAsync())}>Navbatga 50 ta qo‘shish</button>
      </header>
      <p className="muted small">Poster → Vision/Lens → TMDB. Vision xato bo‘lsa job’ni ochib TMDB ID ni qo‘lda yozing, so‘ng «Fetch proposal». «Hub ga yozilgan» joblar default yashirin.</p>
      <Batch />
      <ActionMessages messages={messages} onClose={() => setMessages([])} />
      <div className="filters">
        <input className="search" placeholder="Kino, Vision, TMDB nomi, ID, xato…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => set('status', e.target.value)}>
          <option value="">Faol (applied siz)</option>
          {Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}{summary?.[k] ? ` (${summary[k]})` : ''}</option>)}
        </select>
      </div>
      {selected.size > 0 && (
        <div className="card bulk-bar">
          <strong>{selected.size} ta tanlandi</strong>
          {MODES.map(([m, l]) => (
            <button key={m} className={`btn sm ${m === 'commit' ? 'primary' : 'ghost'}`} disabled={run.isPending}
              onClick={() => act(`${ids.length} ta job: ${l} (fon)`, () => run.mutateAsync({ ids, mode: m }))}>{l}</button>
          ))}
          <button className="btn ghost sm" disabled={sync.isPending} onClick={() => act(`${ids.length} ta kinoni barcha faol saytlarga yuborish`, () => sync.mutateAsync(ids))}>4) Saytlarga yuborish</button>
        </div>
      )}
      <div className={`card table-wrap ${isFetching ? 'fetching' : ''}`}>
        <table className="movies">
          <thead><tr>
            <th className="sel"><input type="checkbox" checked={allOnPage} aria-label="Barchasi"
              onChange={() => setSelected((s) => { const n = new Set(s); pageIds.forEach((i) => (allOnPage ? n.delete(i) : n.add(i))); return n; })} /></th>
            <th>Eski | Yangi</th><th>Kino</th><th>Holat</th><th>Vision</th><th>TMDB</th><th>Reyting</th><th>Yozish</th><th>Sabab</th>
          </tr></thead>
          <tbody>
            {data?.items.map((j) => (
              <tr key={j.id}>
                <td className="sel"><input type="checkbox" checked={selected.has(j.id)}
                  onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(j.id)) n.delete(j.id); else n.add(j.id); return n; })} /></td>
                <td className="pair">{[j.old_poster, j.new_poster].map((u, i) => u ? <img key={i} src={u} alt="" loading="lazy" /> : <span key={i} className="noimg" />)}</td>
                <td><button type="button" className="title-link as-btn" onClick={() => setOpenId(j.id)}>{j.movie_name}</button><div className="muted small">#{j.movie_id} · {j.hub_year}</div></td>
                <td><span className={`badge ${STATUS[j.status]?.[1] ?? ''}`}>{STATUS[j.status]?.[0] ?? j.status}</span></td>
                <td className="wrap small">{j.vision_title} {j.vision_year ?? ''} {j.year_ok && <span className="text-ok">✓</span>}</td>
                <td className="wrap small">{j.tmdb_id ? <>{j.match_title || '—'} {j.match_year} <span className="muted">#{j.tmdb_id} {j.media_type}</span></> : '—'}</td>
                <td className="small">{j.imdb && `IMDb ${j.imdb}`} {j.kp && `KP ${j.kp}`}</td>
                <td className="small">{[j.accept_fields && 'M', j.accept_poster && 'P', j.accept_poster_long && 'L', j.accept_cadres && 'K'].filter(Boolean).join(' ')}</td>
                <td className="wrap small text-error">{j.error.slice(0, 120)}</td>
              </tr>
            ))}
            {data && !data.items.length && <tr><td colSpan={9} className="empty">Job yo‘q. «Navbatga 50 ta qo‘shish» bilan boshlang.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button className="btn ghost sm" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>← Oldingi</button>
        <span>{page} / {pages}</span>
        <button className="btn ghost sm" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>Keyingi →</button>
      </div>
      {openId != null && <JobDrawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
