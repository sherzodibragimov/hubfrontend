import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CollectionMovie, KIND_LABEL, useCollection, useCollectionAction, useDeleteCollection, useMovieSearch } from '../api/collections';
import Icon from '../components/Icon';

function MovieTile({ m, idx, total, manual, onMove, onRemove, busy }: {
  m: CollectionMovie; idx: number; total: number; manual: boolean; busy: boolean;
  onMove: (dir: -1 | 1) => void; onRemove: () => void;
}) {
  return (
    <div className="cm-tile">
      <span className="cm-ord">{idx + 1}</span>
      <Link to={`/movies/${m.movie_id}`} className="cm-poster">{m.poster ? <img src={m.poster} alt="" loading="lazy" /> : <Icon name="film" size={24} />}</Link>
      <div className="cm-text">
        <Link to={`/movies/${m.movie_id}`} className="title-link">{m.name}</Link>
        <span className="muted small">{m.year}{m.serial ? ' · serial' : ''}{m.added === 'manual' ? ' · qo‘lda' : ''}</span>
      </div>
      <div className="cm-actions">
        {manual && <>
          <button type="button" className="icon-btn" disabled={busy || idx === 0} onClick={() => onMove(-1)} aria-label="Yuqoriga">↑</button>
          <button type="button" className="icon-btn" disabled={busy || idx === total - 1} onClick={() => onMove(1)} aria-label="Pastga">↓</button>
        </>}
        <button type="button" className="icon-btn danger-ico" disabled={busy} onClick={onRemove} aria-label="Olib tashlash" title="To‘plamdan olib tashlash">×</button>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const { data: c, isLoading, error } = useCollection(id);
  const act = useCollectionAction(id);
  const del = useDeleteCollection();
  const [f, setF] = useState({ name: '', overview: '', is_published: true, auto_sync: true });
  const [q, setQ] = useState('');
  const found = useMovieSearch(q);
  const poster = useRef<HTMLInputElement>(null);
  const backdrop = useRef<HTMLInputElement>(null);
  useEffect(() => { if (c) setF({ name: c.name, overview: c.overview, is_published: c.is_published, auto_sync: c.auto_sync }); }, [c]);

  if (isLoading) return <div className="loader" />;
  if (!c) return <div className="alert error">{(error as Error)?.message ?? 'Topilmadi'}</div>;
  const dirty = f.name !== c.name || f.overview !== c.overview || f.is_published !== c.is_published || f.auto_sync !== c.auto_sync;
  const manual = c.kind === 'manual';
  const inColl = new Set(c.movies.map((m) => m.movie_id));
  const move = (i: number, dir: -1 | 1) => {
    const ids = c.movies.map((m) => m.movie_id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    act.mutate({ kind: 'order', ids });
  };
  const pickFile = (which: 'poster' | 'backdrop') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) act.mutate({ kind: 'image', which, file }); e.target.value = '';
  };

  return (
    <div className="coll-page">
      <header className="coll-hero card" style={c.backdrop_url ? { backgroundImage: `linear-gradient(90deg, var(--surface) 30%, transparent), url(${c.backdrop_url})` } : undefined}>
        <div className="coll-hero-poster">{c.poster_url ? <img src={c.poster_url} alt="" className={c.kind === 'company' ? 'logo' : ''} /> : <Icon name="layers" size={40} />}</div>
        <div className="coll-hero-text">
          <Link to="/collections" className="small muted">← To‘plamlar</Link>
          <h2>{c.name || c.name_original}</h2>
          <div className="pub-row">
            <span className={`kind-tag static k-${c.kind}`}>{KIND_LABEL[c.kind]}</span>
            {c.name_original && c.name_original !== c.name && <span className="muted small">{c.name_original}</span>}
            {c.tmdb_id && c.kind !== 'manual' && <a className="small" target="_blank" rel="noreferrer"
              href={`https://www.themoviedb.org/${c.kind === 'tmdb' ? 'collection' : c.kind}/${c.tmdb_id}`}>TMDB ↗</a>}
          </div>
          <p className="muted small">{c.movie_count} ta kino{c.missing_count ? ` · TMDB da yana ${c.missing_count} ta qism bor` : ''}</p>
        </div>
        <div className="actions">
          <button className="btn ghost sm" disabled={act.isPending} onClick={() => act.mutate({ kind: 'sync' })}>
            {act.isPending && act.variables?.kind === 'sync' ? 'Yangilanmoqda…' : manual ? 'Qayta tartiblash' : 'TMDB dan yangilash'}</button>
          <button className="btn danger sm" disabled={del.isPending}
            onClick={() => confirm(`“${c.name}” to‘plami o‘chirilsinmi? Kinolar o‘chmaydi.`) && del.mutate(id, { onSuccess: () => nav('/collections') })}>O‘chirish</button>
        </div>
      </header>
      {act.error && <div className="alert error">{(act.error as Error).message}</div>}

      <div className="edit-grid">
        <section className="card block">
          <div className="block-head">
            <div><h3>Kinolar</h3><p className="muted small">{manual ? 'Tartibni ↑ ↓ bilan o‘zgartiring' : c.kind === 'tmdb' ? 'TMDB dagi chiqish tartibida' : 'Chiqish sanasi bo‘yicha'}</p></div>
          </div>
          <div className="cm-list">
            {c.movies.map((m, i) => (
              <MovieTile key={m.movie_id} m={m} idx={i} total={c.movies.length} manual={manual} busy={act.isPending}
                onMove={(d) => move(i, d)} onRemove={() => act.mutate({ kind: 'remove', movieId: m.movie_id })} />
            ))}
            {!c.movies.length && <div className="empty">Hali kino yo‘q{c.kind !== 'manual' ? ' — kinolar TMDB dan olinganda o‘zi qo‘shiladi' : ''}.</div>}
          </div>

          <div className="add-movie">
            <div className="input-ico"><Icon name="film" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bazadan kino qo‘shish — nomi yoki ID…" /></div>
            {q.trim().length >= 2 && (
              <div className="hits">
                {found.data?.items.map((m) => (
                  <button key={m.id} type="button" className="hit" disabled={inColl.has(m.id) || act.isPending}
                    onClick={() => act.mutate({ kind: 'add', movieId: m.id }, { onSuccess: () => setQ('') })}>
                    {m.poster ? <img src={m.poster} alt="" /> : <span className="hit-ph"><Icon name="film" size={14} /></span>}
                    <span>{m.name || m.title}</span><span className="muted small">{m.year}</span>
                    <span className="hit-id small">{inColl.has(m.id) ? 'bor' : '+ qo‘shish'}</span>
                  </button>
                ))}
                {found.data?.items.length === 0 && <div className="muted small">Topilmadi</div>}
              </div>
            )}
          </div>

          {c.missing.length > 0 && (
            <>
              <h4 className="section-title">Bazada yo‘q qismlar <span className="muted small">({c.missing.length})</span></h4>
              <p className="muted small">TMDB bo‘yicha franshizaga kiradi, lekin bazada yo‘q yoki TMDB ID si yozilmagan.</p>
              <div className="missing-grid">
                {c.missing.map((p) => (
                  <a key={p.tmdb_id} className="missing" target="_blank" rel="noreferrer" href={`https://www.themoviedb.org/movie/${p.tmdb_id}`}>
                    {p.poster ? <img src={p.poster} alt="" loading="lazy" /> : <span className="hit-ph" />}
                    <span>{p.title}</span><span className="muted small">{p.year} · TMDB {p.tmdb_id}</span>
                  </a>
                ))}
              </div>
            </>
          )}
          {c.excluded.length > 0 && (
            <details className="excluded"><summary className="muted small">Chiqarib tashlanganlar ({c.excluded.length})</summary>
              {c.excluded.map((m) => (
                <div key={m.movie_id} className="pub-row small">{m.name} <span className="muted">{m.year}</span>
                  <button type="button" className="link-btn plain" onClick={() => act.mutate({ kind: 'add', movieId: m.movie_id })}>qaytarish</button></div>
              ))}
            </details>
          )}
        </section>

        <aside className="side">
          <div className="card">
            <h4>Ma’lumot</h4>
            <div className="form-grid flush single">
              <label><span>Nomi (o‘zbekcha)</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label><span>Tavsif (o‘zbekcha)</span><textarea rows={7} value={f.overview} onChange={(e) => setF({ ...f, overview: e.target.value })} /></label>
              {c.overview_original && <details className="small muted"><summary>Asl tavsif</summary>{c.overview_original}</details>}
              <label className="check"><input type="checkbox" checked={f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} />Saytlarda ko‘rsatish</label>
              {!manual && <label className="check"><input type="checkbox" checked={f.auto_sync} onChange={(e) => setF({ ...f, auto_sync: e.target.checked })} />Yangi kinolarni avtomatik qo‘shish</label>}
              <button type="button" className="btn primary sm" disabled={!dirty || !f.name.trim() || act.isPending}
                onClick={() => act.mutate({ kind: 'update', body: f })}>Saqlash</button>
            </div>
          </div>
          <div className="card">
            <h4>Rasmlar</h4>
            <div className="img-actions">
              <button type="button" className="btn ghost sm" onClick={() => poster.current?.click()}>Poster yuklash</button>
              <button type="button" className="btn ghost sm" onClick={() => backdrop.current?.click()}>Fon yuklash</button>
            </div>
            <input ref={poster} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickFile('poster')} />
            <input ref={backdrop} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickFile('backdrop')} />
          </div>
        </aside>
      </div>
    </div>
  );
}
