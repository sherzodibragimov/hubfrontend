import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCategories, useDeleteMovie, useImagesFromUrls, useMovie, useSaveMovie, useSiteAction, useSites } from '../api/hooks';
import type { ImageKind, Movie, MovieFields, SiteResult, TmdbResult } from '../api/types';
import CastTab from '../components/CastTab';
import EpisodesTab from '../components/EpisodesTab';
import HistoryVideo from '../components/HistoryVideo';
import ImagesTab from '../components/ImagesTab';
import TmdbPanel from '../components/TmdbPanel';
import DeleteDialog from '../components/DeleteDialog';
import SitePicker from '../components/SitePicker';
import SiteResults from '../components/SiteResults';
import StatusBadge from '../components/StatusBadge';

const EMPTY: MovieFields = {
  title: '', alt_name: '', short_story: '', full_story: '', meta_title: '', meta_descr: '', keywords: '', tags: '',
  name: '', altername: '', year: '', age: '', imdb: '', kp: '', genres: '', directors: '', actors: '', countries: '',
  time: '', quality: '', translator: '', tmdb_id: '', tmdb_type: '', last_season: '', last_episode: '',
  all_season: '', all_episode: '', num_episodes: '', serial_status: false, serial_life: '', trailer: '',
  media_player: '', video_links: '', mover_iframe: '', okru: '', lumex: '', approve: true, allow_main: true,
  published_at: null, author: '', category_ids: [],
};

type Field = { key: keyof MovieFields; label: string; type?: 'text' | 'textarea' | 'bool' | 'datetime' | 'select'; options?: [string, string][]; wide?: boolean };

const GROUPS: { title: string; fields: Field[] }[] = [
  { title: 'Asosiy', fields: [
    { key: 'name', label: 'Kino nomi' }, { key: 'title', label: 'Sarlavha (title)' },
    { key: 'altername', label: 'Asl nomi' }, { key: 'alt_name', label: 'URL (alt_name)' },
    { key: 'published_at', label: 'Nashr sanasi', type: 'datetime' }, { key: 'author', label: 'Muallif' },
    { key: 'approve', label: 'Tasdiqlangan', type: 'bool' }, { key: 'allow_main', label: 'Bosh sahifada', type: 'bool' },
  ] },
  { title: 'Ma’lumot', fields: [
    { key: 'year', label: 'Yil' }, { key: 'age', label: 'Yosh chegarasi' }, { key: 'imdb', label: 'IMDb' },
    { key: 'kp', label: 'Kinopoisk' }, { key: 'tmdb_id', label: 'TMDB ID' },
    { key: 'tmdb_type', label: 'TMDB turi', type: 'select', options: [['', '—'], ['movie', 'Kino'], ['tv', 'Serial']] },
    { key: 'genres', label: 'Janrlar', wide: true }, { key: 'countries', label: 'Davlatlar' },
    { key: 'time', label: 'Davomiyligi' }, { key: 'quality', label: 'Sifat' }, { key: 'translator', label: 'Tarjimon' },
    { key: 'directors', label: 'Rejissyorlar', type: 'textarea', wide: true },
    { key: 'actors', label: 'Aktyorlar', type: 'textarea', wide: true },
  ] },
  { title: 'Serial', fields: [
    { key: 'serial_status', label: 'Serial', type: 'bool' }, { key: 'serial_life', label: 'Holati' },
    { key: 'last_season', label: 'Oxirgi fasl' }, { key: 'last_episode', label: 'Oxirgi qism' },
    { key: 'all_season', label: 'Jami fasl' }, { key: 'all_episode', label: 'Jami qism' },
    { key: 'num_episodes', label: 'Qismlar soni' },
  ] },
  { title: 'Tavsif va SEO', fields: [
    { key: 'short_story', label: 'Qisqa tavsif', type: 'textarea', wide: true },
    { key: 'full_story', label: 'To‘liq tavsif', type: 'textarea', wide: true },
    { key: 'meta_title', label: 'Meta title', wide: true }, { key: 'meta_descr', label: 'Meta description', wide: true },
    { key: 'keywords', label: 'Kalit so‘zlar', type: 'textarea', wide: true }, { key: 'tags', label: 'Teglar', wide: true },
  ] },
  { title: 'Video', fields: [
    { key: 'trailer', label: 'Treyler', type: 'textarea', wide: true },
    { key: 'media_player', label: 'Media player', type: 'textarea', wide: true },
    { key: 'video_links', label: 'Video havolalar', type: 'textarea', wide: true },
    { key: 'mover_iframe', label: 'Mover iframe', type: 'textarea', wide: true },
    { key: 'okru', label: 'OK.ru', type: 'textarea', wide: true }, { key: 'lumex', label: 'Lumex', type: 'textarea', wide: true },
  ] },
];

const EXTRA_TABS = ['Qismlar', 'Aktyorlar', 'Rasmlar', 'Kategoriyalar'];

const toForm = (m: Movie): MovieFields => {
  const f = { ...EMPTY };
  (Object.keys(EMPTY) as (keyof MovieFields)[]).forEach((k) => { (f as Record<string, unknown>)[k] = m[k]; });
  return f;
};
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

export default function MovieEditPage() {
  const { id } = useParams();
  const movieId = id ? Number(id) : null;
  const nav = useNavigate();
  const { data: movie, isLoading } = useMovie(movieId);
  const { data: cats } = useCategories();
  const save = useSaveMovie(movieId);
  const del = useDeleteMovie();
  const sync = useSiteAction('sync');
  const unpublish = useSiteAction('unpublish');
  const { data: sites = [] } = useSites();
  const [form, setForm] = useState<MovieFields>(EMPTY);
  const [tab, setTab] = useState(0);
  const [notice, setNotice] = useState<{ text?: string; results?: SiteResult[]; title?: string } | null>(null);
  const [siteIds, setSiteIds] = useState<number[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingImages, setPendingImages] = useState<Partial<Record<ImageKind, string>>>({});
  const fromUrls = useImagesFromUrls();

  useEffect(() => { if (movie) setForm(toForm(movie)); }, [movie]);

  const linked = movie?.publications.filter((p) => p.status !== 'deleted').map((p) => p.site_id) ?? [];
  const defaultSites = linked.length ? linked : sites.filter((s) => s.code === 'onetvuz' && s.is_active).map((s) => s.id);
  const selectedSites = siteIds ?? defaultSites;
  const busy = save.isPending || sync.isPending || fromUrls.isPending;

  const upd = <K extends keyof MovieFields>(k: K, v: MovieFields[K]) => { setForm((f) => ({ ...f, [k]: v })); setNotice(null); };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const publish = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publish';
    setNotice(null);
    const m = await save.mutateAsync(form);
    if (Object.keys(pendingImages).length) {
      // Yangi kino: TMDB rasmlari saqlangandan keyin yuklanadi (yuborishdan oldin)
      await fromUrls.mutateAsync({ id: m.id, images: pendingImages });
      setPendingImages({});
    }
    if (publish && selectedSites.length) {
      const r = await sync.mutateAsync({ id: m.id, siteIds: selectedSites });
      setNotice({ title: 'Saqlandi va saytlarga yuborildi', results: r.results });
    } else {
      setNotice({ text: 'Hub da saqlandi. Saytlarga yuborilmadi.' });
    }
    if (!movieId) nav(`/movies/${m.id}`, { replace: true });
  }

  async function applyTmdb(r: TmdbResult): Promise<string> {
    setForm((f) => {
      const next = { ...f } as Record<string, unknown>;
      for (const [k, v] of Object.entries(r.fields)) {
        if (!(k in EMPTY) || v === undefined) continue;
        if (k === 'name' && f.name) continue; // nom — faqat bo‘sh bo‘lsa (Django admin bilan bir xil)
        next[k] = v;
      }
      if (r.editors.short_story) next.short_story = r.editors.short_story;
      if (r.editors.full_story) next.full_story = r.editors.full_story;
      if (!f.title && r.title_suggest) next.title = r.title_suggest;
      return next as unknown as MovieFields;
    });
    setNotice(null);
    const imgs = Object.fromEntries(Object.entries(r.images).filter(([, u]) => u)) as Partial<Record<ImageKind, string>>;
    if (!Object.keys(imgs).length) return '';
    if (!movieId) { setPendingImages(imgs); return 'rasmlar saqlanganda yuklanadi'; }
    const res = await fromUrls.mutateAsync({ id: movieId, images: imgs });
    return `rasmlar: ${res.applied.join(', ') || '—'}${res.failed.length ? ` (xato: ${res.failed.join(', ')})` : ''}`;
  }

  async function doUnpublish(siteId: number, code: string) {
    if (!movieId || !confirm(`${code} saytidan o‘chirilsinmi? Kino Hub da qoladi.`)) return;
    const r = await unpublish.mutateAsync({ id: movieId, siteIds: [siteId] });
    setNotice({ title: 'Saytdan olib tashlash', results: r.results });
  }

  async function doDelete(ids: number[], withSites: boolean) {
    if (!movieId) return;
    const r = await del.mutateAsync({ id: movieId, siteIds: ids, unpublish: withSites });
    if (r.deleted) { nav('/movies'); return; }
    setConfirmDelete(false);
    setNotice({ title: 'Kino o‘chirilmadi — saytlardan biri xato berdi', results: r.results });
  }

  if (movieId && isLoading) return <div className="loader" />;
  const poster = movie?.images.find((i) => i.kind === 'poster')?.url || pendingImages.poster;

  return (
    <form onSubmit={submit}>
      <header className="page-head">
        <h2><Link to="/movies" className="muted">Kinolar /</Link> {movieId ? (form.name || form.title || `#${movieId}`) : 'Yangi kino'}</h2>
        <div className="actions">
          {movieId && <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>O‘chirish</button>}
          <button className="btn ghost" value="save" disabled={busy}>Saqlash</button>
          <button className="btn primary" value="publish" disabled={busy || !selectedSites.length}
            title={selectedSites.length ? '' : 'Platforma tanlanmagan'}>
            {sync.isPending ? 'Yuborilmoqda…' : save.isPending ? 'Saqlanmoqda…' : 'Saqlash va yuborish'}
          </button>
        </div>
      </header>

      {save.error && <div className="alert error">{(save.error as Error).message}</div>}
      {[del.error, sync.error, unpublish.error, fromUrls.error].filter(Boolean).map((e, i) => <div key={i} className="alert error">{(e as Error).message}</div>)}
      {notice?.text && <div className="alert ok">{notice.text}</div>}
      {notice?.results && <SiteResults results={notice.results} title={notice.title} />}
      {confirmDelete && movie && (
        <DeleteDialog movie={movie} sites={sites} busy={del.isPending}
          onCancel={() => setConfirmDelete(false)} onConfirm={doDelete} />
      )}

      <div className="edit-grid">
        <div>
          <TmdbPanel key={movie?.id ?? 'new'} initialId={movie?.tmdb_id ?? ''} initialType={movie?.tmdb_type ?? ''} onApply={applyTmdb} />
          <div className="tabs">
            {[...GROUPS.map((g) => g.title), ...EXTRA_TABS].map((t, i) => (
              <button type="button" key={t} className={i === tab ? 'active' : ''} onClick={() => setTab(i)}>{t}</button>
            ))}
          </div>
          <div className="card form-grid">
            {tab < GROUPS.length ? GROUPS[tab].fields.map((f) => (
              <label key={f.key} className={`${f.wide ? 'wide' : ''} ${f.type === 'bool' ? 'check' : ''}`}>
                {f.type === 'bool' ? (
                  <><input type="checkbox" checked={form[f.key] as boolean} onChange={(e) => upd(f.key, e.target.checked as never)} />{f.label}</>
                ) : (<>
                  <span>{f.label}</span>
                  {f.type === 'textarea' ? <textarea rows={4} value={form[f.key] as string} onChange={(e) => upd(f.key, e.target.value as never)} />
                    : f.type === 'select' ? <select value={form[f.key] as string} onChange={(e) => upd(f.key, e.target.value as never)}>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                    : f.type === 'datetime' ? <input type="datetime-local" value={toLocalInput(form.published_at)} onChange={(e) => upd('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
                    : <input value={form[f.key] as string} required={f.key === 'title'} onChange={(e) => upd(f.key, e.target.value as never)} />}
                </>)}
              </label>
            )).concat(GROUPS[tab].title === 'Video' ? [<HistoryVideo key="history" movie={movie} />] : [])
            : EXTRA_TABS[tab - GROUPS.length] === 'Qismlar' ? <EpisodesTab movie={movie} />
            : EXTRA_TABS[tab - GROUPS.length] === 'Aktyorlar' ? <CastTab movie={movie} />
            : EXTRA_TABS[tab - GROUPS.length] === 'Rasmlar' ? <ImagesTab movie={movie} pending={pendingImages} /> : (
              <div className="wide cat-list">
                {cats?.map((c) => (
                  <label key={c.id} className="check">
                    <input type="checkbox" checked={form.category_ids.includes(c.id)}
                      onChange={(e) => upd('category_ids', e.target.checked ? [...form.category_ids, c.id] : form.category_ids.filter((x) => x !== c.id))} />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="side">
          <div className="card poster-box">{poster ? <img src={poster} alt="" /> : <div className="noimg big">Poster yo‘q</div>}</div>
          <div className="card">
            <h4>Qaysi platformaga yozilsin?</h4>
            <SitePicker sites={sites} value={selectedSites} onChange={setSiteIds} linked={linked} />
          </div>
          {movie && (
            <div className="card">
              <h4>Nashr holati</h4>
              {movie.publications.length ? movie.publications.map((p) => (
                <div key={p.site_id} className="pub">
                  <div className="pub-row">
                    <strong>{p.site_code}</strong> <StatusBadge status={p.status} />
                    {p.dle_post_id && <span className="muted small">#{p.dle_post_id}</span>}
                    {p.remote_url && <a href={p.remote_url} target="_blank" rel="noreferrer">↗</a>}
                    {p.status !== 'deleted' && (
                      <button type="button" className="link-btn" disabled={unpublish.isPending}
                        onClick={() => doUnpublish(p.site_id, p.site_code)}>olib tashlash</button>
                    )}
                  </div>
                  {p.last_synced_at && <div className="muted small">{new Date(p.last_synced_at).toLocaleString()}</div>}
                  {p.last_error && <div className="text-error small">{p.last_error}</div>}
                </div>
              )) : <div className="muted">Nashr qilinmagan</div>}
              <h4>Statistika</h4>
              <div className="muted small">Ko‘rishlar: {movie.news_read} · Reyting: {movie.rating} · Ovoz: {movie.vote_num}</div>
              <div className="muted small">DLE ID: {movie.source_dle_id ?? '—'} · Yangilangan: {new Date(movie.updated_at).toLocaleString()}</div>
            </div>
          )}
        </aside>
      </div>
    </form>
  );
}
