import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBulkSync, useCategories, useMovies, useSites } from '../api/hooks';
import SitePicker from '../components/SitePicker';
import { useDebounce } from '../hooks/useDebounce';

const PAGE_SIZE = 40;

export default function MoviesPage() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const dq = useDebounce(q, 350);
  const { data: cats } = useCategories();
  const { data: sites } = useSites();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkSites, setBulkSites] = useState<number[]>([]);
  const bulk = useBulkSync();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };

  useEffect(() => { if ((sp.get('q') ?? '') !== dq) set('q', dq); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = Object.fromEntries(sp.entries());
  const page = Number(params.page ?? 1);
  const { data, isFetching, error } = useMovies({ ...params, page_size: String(PAGE_SIZE) });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const pageIds = data?.items.map((m) => m.id) ?? [];
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((s) => { const n = new Set(s); pageIds.forEach((id) => (allOnPage ? n.delete(id) : n.add(id))); return n; });

  async function runBulk() {
    const ids = [...selected];
    const target = bulkSites.length ? 'tanlangan saytlarga' : 'bog‘langan saytlarga';
    if (!confirm(`${ids.length} ta kino ${target} yuborilsinmi?`)) return;
    await bulk.mutateAsync({ movieIds: ids, siteIds: bulkSites });
    setSelected(new Set());
  }
  const bulkFailed = bulk.data?.flatMap((m) => m.results.filter((r) => !r.ok).map((r) => ({ ...r, movie_id: m.movie_id }))) ?? [];
  const bulkOk = bulk.data?.reduce((n, m) => n + m.results.filter((r) => r.ok).length, 0) ?? 0;

  return (
    <>
      <header className="page-head">
        <h2>Kinolar {data && <small>{data.total.toLocaleString()}</small>}</h2>
        <Link to="/movies/new" className="btn primary">+ Yangi kino</Link>
      </header>

      <div className="filters">
        <input className="search" placeholder="Nomi, ID, TMDB ID…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={params.kind ?? ''} onChange={(e) => set('kind', e.target.value)}>
          <option value="">Barchasi</option><option value="movie">Kinolar</option><option value="serial">Seriallar</option>
        </select>
        <select value={params.approve ?? ''} onChange={(e) => set('approve', e.target.value)}>
          <option value="">Holat</option><option value="true">Tasdiqlangan</option><option value="false">Tasdiqlanmagan</option>
        </select>
        <select value={params.category_id ?? ''} onChange={(e) => set('category_id', e.target.value)}>
          <option value="">Kategoriya</option>
          {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={params.site ?? ''} onChange={(e) => set('site', e.target.value)}>
          <option value="">Sayt</option>
          {sites?.map((s) => <option key={s.id} value={s.code}>{s.name}</option>)}
        </select>
        <input className="year" placeholder="Yil" value={params.year ?? ''} onChange={(e) => set('year', e.target.value)} />
        <select value={params.sort ?? 'published_at'} onChange={(e) => set('sort', e.target.value)}>
          <option value="published_at">Yangi nashr</option><option value="updated_at">Oxirgi tahrir</option>
          <option value="id">ID ↓</option><option value="name">Nomi A–Z</option>
        </select>
      </div>

      {error && <div className="alert error">{(error as Error).message}</div>}

      {selected.size > 0 && (
        <div className="card bulk-bar">
          <strong>{selected.size} ta tanlandi</strong>
          <SitePicker sites={sites ?? []} value={bulkSites} onChange={setBulkSites} />
          <span className="muted small">{bulkSites.length ? '' : '(sayt tanlanmasa — har kino o‘z bog‘langan saytlariga)'}</span>
          <button className="btn primary sm" disabled={bulk.isPending || selected.size > 100} onClick={runBulk}>
            {bulk.isPending ? 'Yuborilmoqda…' : 'Saytlarga yuborish'}
          </button>
          <button className="btn ghost sm" onClick={() => setSelected(new Set())}>Bekor</button>
          {selected.size > 100 && <span className="text-error small">Bir martada ko‘pi bilan 100 ta</span>}
        </div>
      )}
      {bulk.error && <div className="alert error">{(bulk.error as Error).message}</div>}
      {bulk.data && (
        <div className={`alert ${bulkFailed.length ? 'error' : 'ok'}`}>
          Ommaviy yuborish: {bulkOk} ta OK, {bulkFailed.length} ta xato.
          {bulkFailed.length > 0 && <ul className="result-list">{bulkFailed.map((r) => (
            <li key={`${r.movie_id}-${r.site_id}`}><Link to={`/movies/${r.movie_id}`}>#{r.movie_id}</Link> {r.site_code}: {r.message}</li>
          ))}</ul>}
        </div>
      )}

      <div className={`card table-wrap ${isFetching ? 'fetching' : ''}`}>
        <table className="movies">
          <thead>
            <tr><th className="sel"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Sahifadagi barchasi" /></th><th></th><th>ID</th><th>Nomi</th><th>Yil</th><th>IMDb</th><th>KP</th><th>TMDB</th><th>Tur</th><th>Saytlar</th><th>Holat</th></tr>
          </thead>
          <tbody>
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="sel"><input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} /></td>
                <td className="thumb">{m.poster ? <img src={m.poster} alt="" loading="lazy" decoding="async" /> : <span className="noimg" />}</td>
                <td className="muted">{m.id}</td>
                <td><Link to={`/movies/${m.id}`} className="title-link">{m.name || m.title}</Link></td>
                <td>{m.year}</td><td>{m.imdb}</td><td>{m.kp}</td><td className="muted">{m.tmdb_id}</td>
                <td>{m.serial_status ? 'Serial' : 'Kino'}</td>
                <td>{m.sites.map((s) => <span key={s} className="chip">{s}</span>)}</td>
                <td>{m.approve ? <span className="badge synced">Faol</span> : <span className="badge pending">Yashirin</span>}</td>
              </tr>
            ))}
            {data && !data.items.length && <tr><td colSpan={11} className="empty">Hech narsa topilmadi</td></tr>}
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
