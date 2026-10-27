import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBulkApply, useGallery } from '../api/posters';

export default function PostersPage() {
  const [tab, setTab] = useState('false');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const { data, isLoading, isFetching } = useGallery(tab, page);
  const bulk = useBulkApply();
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 48));
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const c = data?.counts ?? {};

  return (
    <>
      <header className="page-head">
        <div><h2>O‘zbekcha posterlar</h2>
          <p className="muted small" style={{ margin: 0 }}>Tayyor: {c.done ?? 0} · yozuvsiz poster yo‘q: {c.no_textless ?? 0} · navbatda: {c.queued ?? 0}. Yoqqanlarini tanlab asosiy poster qiling.</p></div>
        {tab === 'false' && (
          <div className="actions">
            <button className="btn ghost sm" onClick={() => setSel(new Set(data?.items.map((i) => i.movie_id)))}>Sahifadagini tanlash</button>
            <button className="btn primary" disabled={!sel.size || bulk.isPending}
              onClick={() => bulk.mutate([...sel], { onSuccess: () => setSel(new Set()) })}>{bulk.isPending ? 'Qo‘llanmoqda…' : `Asosiy qilish (${sel.size})`}</button>
          </div>
        )}
      </header>
      {bulk.isSuccess && <div className="alert ok">{bulk.data.applied} ta poster almashtirildi. Saytlarga keyingi sinxronda ketadi.</div>}
      <div className="tabs">
        {[['false', 'Yangi (qo‘llanmagan)'], ['true', 'Qo‘llangan'], ['', 'Hammasi']].map(([k, l]) => (
          <button key={k} className={k === tab ? 'active' : ''} onClick={() => { setTab(k); setPage(1); setSel(new Set()); }}>{l}</button>))}
      </div>
      {isLoading ? <div className="loader" /> : !data?.items.length ? <div className="card empty">Hali poster yo‘q — worker TMDB ID li kinolar uchun yaratib bormoqda.</div> : (
        <div className={`puz-gallery ${isFetching ? 'fetching' : ''}`}>
          {data.items.map((i) => (
            <div key={i.movie_id} className={`puz-card ${sel.has(i.movie_id) ? 'on' : ''}`} onClick={() => tab === 'false' && toggle(i.movie_id)}>
              <div className="puz-pair">
                <img src={i.current_url} alt="" loading="lazy" className="puz-old" />
                <img src={i.url} alt="" loading="lazy" />
              </div>
              <div className="puz-meta">
                {tab === 'false' && <input type="checkbox" checked={sel.has(i.movie_id)} readOnly />}
                <Link to={`/movies/${i.movie_id}`} onClick={(e) => e.stopPropagation()} className="title-link small">{i.name}</Link>
                <span className="faint small">{i.font}</span>
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
