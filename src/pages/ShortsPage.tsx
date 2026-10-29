import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSites } from '../api/hooks';
import { useShortAction, useShorts, type Short } from '../api/shorts';
import SitePicker from '../components/SitePicker';

function NewShort({ onDone }: { onDone: () => void }) {
  const { data: sites = [] } = useSites();
  const act = useShortAction();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [movieId, setMovieId] = useState('');
  const [siteIds, setSiteIds] = useState<number[]>([]);
  const submit = () => {
    if (!file) return;
    const f = new FormData();
    f.append('file', file);
    f.append('title', title);
    if (movieId.trim()) f.append('movie_id', movieId.trim());
    f.append('site_ids', siteIds.join(','));
    act.mutate({ kind: 'create', form: f }, { onSuccess: onDone });
  };
  return (
    <div className="card" style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
      <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <input className="input" placeholder="Hub kino ID (ixtiyoriy — kinoga bog‘lash)" value={movieId} onChange={(e) => setMovieId(e.target.value.replace(/\D/g, ''))} />
      <input className="input" placeholder="Sarlavha (kinoga bog‘lanmasa majburiy)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="muted small">Saytlar (hech biri tanlanmasa — hamma saytda):</div>
      <SitePicker sites={sites} value={siteIds} onChange={setSiteIds} />
      {act.isError && <div className="alert error">{String(act.error)}</div>}
      <div><button className="btn" disabled={!file || act.isPending} onClick={submit}>{act.isPending ? 'Yuklanmoqda…' : 'Qo‘shish'}</button></div>
    </div>
  );
}

function Row({ s, sites }: { s: Short; sites: { id: number; name: string; is_active: boolean }[] }) {
  const act = useShortAction();
  const [edit, setEdit] = useState(false);
  const names = s.site_ids.length ? sites.filter((x) => s.site_ids.includes(x.id)).map((x) => x.name).join(', ') : 'hamma sayt';
  return (
    <tr style={{ opacity: s.is_active ? 1 : 0.5 }}>
      <td style={{ width: 90 }}><video src={s.video_url} poster={s.poster_url || undefined} preload="none" controls
        style={{ width: 80, aspectRatio: '9/16', objectFit: 'cover', borderRadius: 8, background: '#000' }} /></td>
      <td>
        <div><b>{s.title || '—'}</b></div>
        {s.movie_id ? <Link to={`/movies/${s.movie_id}`} className="title-link small">#{s.movie_id} {s.movie_name}</Link>
          : <span className="faint small">kinoga bog‘lanmagan</span>}
        <div className="faint small">{s.views} ko‘rish · {new Date(s.created_at).toLocaleDateString('uz')}</div>
      </td>
      <td>{edit ? <SitePicker sites={sites as never} value={s.site_ids}
        onChange={(ids) => act.mutate({ kind: 'patch', id: s.id, data: { site_ids: ids } })} />
        : <button className="btn ghost sm" onClick={() => setEdit(true)}>{names}</button>}</td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <button className="btn ghost sm" disabled={act.isPending}
          onClick={() => act.mutate({ kind: 'patch', id: s.id, data: { is_active: !s.is_active } })}>{s.is_active ? 'Yashirish' : 'Faollash'}</button>{' '}
        <button className="btn ghost sm" disabled={act.isPending}
          onClick={() => confirm('Shorts o‘chirilsinmi?') && act.mutate({ kind: 'delete', id: s.id })}>O‘chirish</button>
      </td>
    </tr>
  );
}

export default function ShortsPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const { data, isLoading } = useShorts(q, page);
  const { data: sites = [] } = useSites();
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 50));
  return (
    <>
      <header className="page-head">
        <div><h2>Shorts</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Video faqat Hub'da saqlanadi — saytlar API orqali oladi. Kinolarning history videolari avtomatik qo‘shiladi.
          </p></div>
        <button className="btn" onClick={() => setAdding((v) => !v)}>{adding ? 'Yopish' : '+ Yangi shorts'}</button>
      </header>
      {adding && <NewShort onDone={() => setAdding(false)} />}
      <input className="input" placeholder="Qidirish…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ marginBottom: 12, maxWidth: 320 }} />
      {isLoading ? <div className="loader" /> : !data?.items.length ? <div className="card empty">Shorts yo‘q</div> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Video</th><th>Nomi</th><th>Saytlar</th><th /></tr></thead>
            <tbody>{data.items.map((s) => <Row key={s.id} s={s} sites={sites} />)}</tbody>
          </table>
          {pages > 1 && <div style={{ display: 'flex', gap: 8, padding: 12, alignItems: 'center' }}>
            <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
            <span className="small">{page} / {pages} · jami {data.total}</span>
            <button className="btn ghost sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button></div>}
        </div>
      )}
    </>
  );
}
