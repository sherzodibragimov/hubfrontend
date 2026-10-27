import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Icon from '../components/Icon';

interface Cand { tmdb_id: number; media: 'movie' | 'tv'; names: string[]; year: number; score: number; poster: string }
interface MatchRow {
  movie_id: number; name: string; year: string; serial: boolean; poster: string; status: string; tmdb_id: number | null;
  media: string; confidence: number | null; note: string; candidates: Cand[];
  ai: { english_title?: string; russian_title?: string; original_title?: string; year?: number; model?: string; verify?: { reason?: string } };
}
const STATUS = [['review', 'Tekshirish kerak'], ['matched', 'Topildi'], ['failed', 'Topilmadi'], ['rejected', 'Rad etilgan']] as const;

export default function MatchingPage() {
  const qc = useQueryClient();
  const [st, setSt] = useState('review');
  const [page, setPage] = useState(1);
  const sum = useQuery({ queryKey: ['match-sum'], queryFn: () => api<{ by_status: Record<string, number>; without_tmdb: number; with_tmdb: number; queued: number }>('/tmdb-match/summary'), refetchInterval: 60_000 });
  const list = useQuery({
    queryKey: ['match', st, page], placeholderData: keepPreviousData,
    queryFn: () => api<{ items: MatchRow[]; total: number }>(`/tmdb-match?status=${st}&page=${page}`),
  });
  const act = useMutation({
    mutationFn: ({ id, kind, body }: { id: number; kind: 'accept' | 'reject' | 'retry'; body?: unknown }) =>
      api(`/tmdb-match/${id}/${kind}`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['match'] }); qc.invalidateQueries({ queryKey: ['match-sum'] }); },
  });
  const s = sum.data;
  const total = s ? s.with_tmdb + s.without_tmdb : 0;
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 20));

  return (
    <>
      <header className="page-head">
        <div><h2>TMDB moslash</h2><p className="muted small" style={{ margin: 0 }}>Bepul AI posterni va nomni o‘qib TMDB dan aniq kinoni topadi. Kunlik limit tugasa ertasi kuni davom etadi.</p></div>
      </header>
      {s && (
        <div className="kpis">
          <div className="card kpi ember"><div className="kpi-label">TMDB ID bor</div><div className="kpi-value">{s.with_tmdb.toLocaleString('ru-RU')}</div>
            <div className="kpi-sub">{total ? Math.round((s.with_tmdb / total) * 100) : 0}% katalogdan</div>
            <div className="bar" style={{ marginTop: 8 }}><div style={{ width: `${total ? (s.with_tmdb / total) * 100 : 0}%` }} /></div></div>
          <div className="card kpi cyan"><div className="kpi-label">Navbatda</div><div className="kpi-value">{s.queued.toLocaleString('ru-RU')}</div><div className="kpi-sub">AI hali ko‘rmagan</div></div>
          <div className="card kpi amber"><div className="kpi-label">Tekshirish kerak</div><div className="kpi-value">{s.by_status.review ?? 0}</div><div className="kpi-sub">Shubhali — siz tasdiqlaysiz</div></div>
          <div className="card kpi rose"><div className="kpi-label">Topilmadi</div><div className="kpi-value">{s.by_status.failed ?? 0}</div><div className="kpi-sub">Avtomatik topildi: {s.by_status.matched ?? 0}</div></div>
        </div>
      )}
      <div className="tabs" style={{ marginTop: 18 }}>
        {STATUS.map(([k, l]) => <button key={k} type="button" className={k === st ? 'active' : ''} onClick={() => { setSt(k); setPage(1); }}>{l} {s?.by_status[k] ? `(${s.by_status[k]})` : ''}</button>)}
      </div>
      {act.error && <div className="alert error">{(act.error as Error).message}</div>}
      {list.isLoading ? <div className="loader" /> : !list.data?.items.length ? <div className="card empty">Bo‘sh</div> : (
        <div className="match-list">
          {list.data.items.map((r) => (
            <div key={r.movie_id} className="card match-row">
              <div className="match-ours">
                {r.poster ? <img src={r.poster} alt="" loading="lazy" /> : <span className="hit-ph" />}
                <div>
                  <Link to={`/movies/${r.movie_id}`} className="title-link">{r.name}</Link>
                  <div className="muted small">{r.year} · {r.serial ? 'serial' : 'kino'} · #{r.movie_id}</div>
                  <div className="small">AI: <b>{r.ai.english_title || '—'}</b>{r.ai.russian_title ? ` / ${r.ai.russian_title}` : ''} {r.ai.year ? `(${r.ai.year})` : ''}</div>
                  {r.note && <div className="small text-warn">{r.note}</div>}
                  {r.confidence != null && <div className="faint small">Ishonch {Math.round(r.confidence * 100)}% · {r.ai.model}</div>}
                  <div className="img-actions" style={{ marginTop: 6 }}>
                    {r.status !== 'rejected' && <button className="btn ghost sm" disabled={act.isPending} onClick={() => act.mutate({ id: r.movie_id, kind: 'reject' })}>Hech biri emas</button>}
                    <button className="btn ghost sm" disabled={act.isPending} onClick={() => act.mutate({ id: r.movie_id, kind: 'retry' })}>Qayta aniqlash</button>
                  </div>
                </div>
              </div>
              <div className="match-cands">
                {r.candidates.map((c) => {
                  const chosen = c.tmdb_id === r.tmdb_id;
                  return (
                    <div key={`${c.media}${c.tmdb_id}`} className={`match-cand ${chosen ? 'on' : ''}`}>
                      <a href={`https://www.themoviedb.org/${c.media}/${c.tmdb_id}`} target="_blank" rel="noreferrer">
                        {c.poster ? <img src={c.poster} alt="" loading="lazy" /> : <span className="hit-ph" />}</a>
                      <span className="small"><b>{c.names[0]}</b></span>
                      <span className="faint small">{c.year || '?'} · {c.media === 'tv' ? 'serial' : 'kino'}{chosen ? ' · AI tanlovi' : ''}</span>
                      {r.status !== 'matched' || !chosen ? (
                        <button className={`btn sm ${chosen ? 'primary' : 'ghost'}`} disabled={act.isPending}
                          onClick={() => act.mutate({ id: r.movie_id, kind: 'accept', body: { tmdb_id: c.tmdb_id, media: c.media } })}>
                          <Icon name="check" size={14} /> Shu</button>
                      ) : <span className="badge synced">Yozilgan</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="pager">
          <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Oldingi</button>
          <span className="muted small">{page} / {pages}</span>
          <button className="btn ghost sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Keyingi</button>
        </div>
      )}
    </>
  );
}
