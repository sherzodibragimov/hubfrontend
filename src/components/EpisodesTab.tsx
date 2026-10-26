import { useEffect, useRef, useState } from 'react';
import {
  useDeleteEpisode, useDeleteSeason, useEpisodes, useEpisodesFromLinks, useImportEpisodes, useRegenerateSeo,
  useSaveEpisode, useSaveSeason, useUploadStill,
} from '../api/episodes';
import type { Episode, Movie, SeasonInfo } from '../api/types';

function Counter({ value, max, ideal }: { value: string; max: number; ideal: [number, number] }) {
  const n = value.length;
  const cls = n > max ? 'text-error' : n >= ideal[0] && n <= ideal[1] ? 'text-ok' : 'muted';
  return <span className={`small ${cls}`}>{n}/{ideal[1]}</span>;
}

function EpisodeRow({ movieId, ep }: { movieId: number; ep: Episode }) {
  const [f, setF] = useState(ep);
  const [open, setOpen] = useState(false);
  const save = useSaveEpisode(movieId);
  const regen = useRegenerateSeo(movieId);
  const still = useUploadStill(movieId);
  const del = useDeleteEpisode(movieId);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setF(ep), [ep]);
  const dirty = (['title', 'overview', 'video_url', 'meta_title', 'meta_descr'] as const).some((k) => f[k] !== ep[k]);
  const err = save.error || regen.error || still.error || del.error;

  return (
    <div className={`ep ${open ? 'open' : ''}`}>
      <div className="ep-head" onClick={() => setOpen((v) => !v)}>
        <div className="ep-still">{f.still_url ? <img src={f.still_url} alt="" loading="lazy" /> : <span className="muted small">rasm yo‘q</span>}</div>
        <div className="ep-main">
          <strong>{ep.number}-qism{ep.title ? `: ${ep.title}` : ''}</strong>
          <span className="muted small ep-ov">{ep.overview || 'Tavsif yo‘q'}</span>
          <span className="small">
            {ep.video_url ? <span className="text-ok">● video</span> : <span className="text-error">● video yo‘q</span>}
            {ep.air_date && <span className="muted"> · {ep.air_date}</span>}{ep.runtime ? <span className="muted"> · {ep.runtime} daq</span> : null}
          </span>
        </div>
        <span className="muted">{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div className="ep-body form-grid">
          <label><span>Qism nomi (o‘zbekcha)</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
            placeholder={ep.title_original || 'masalan: Yangi boshlanish'} /></label>
          <label><span>Video URL</span><input value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} /></label>
          <label className="wide"><span>Tavsif (o‘zbekcha)</span><textarea rows={4} value={f.overview} onChange={(e) => setF({ ...f, overview: e.target.value })} /></label>
          {ep.overview_original && <details className="wide small muted"><summary>Asl tavsif</summary>{ep.overview_original}</details>}
          <label className="wide"><span>SEO title <Counter value={f.meta_title} max={255} ideal={[30, 65]} /></span>
            <input value={f.meta_title} onChange={(e) => setF({ ...f, meta_title: e.target.value })} /></label>
          <label className="wide"><span>SEO description <Counter value={f.meta_descr} max={300} ideal={[70, 160]} /></span>
            <textarea rows={2} value={f.meta_descr} onChange={(e) => setF({ ...f, meta_descr: e.target.value })} /></label>
          <div className="wide img-actions">
            <button type="button" className="btn primary sm" disabled={!dirty || save.isPending}
              onClick={() => save.mutate({ id: ep.id, title: f.title, overview: f.overview, air_date: ep.air_date, runtime: ep.runtime,
                video_url: f.video_url, meta_title: f.meta_title, meta_descr: f.meta_descr })}>{save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}</button>
            <button type="button" className="btn ghost sm" disabled={regen.isPending || dirty} title={dirty ? 'Avval saqlang' : ''}
              onClick={() => regen.mutate(ep.id)}>SEO ni qayta yaratish</button>
            <button type="button" className="btn ghost sm" disabled={still.isPending} onClick={() => input.current?.click()}>
              {still.isPending ? 'Yuklanmoqda…' : 'Rasm yuklash'}</button>
            <button type="button" className="btn danger sm" disabled={del.isPending}
              onClick={() => confirm(`${ep.number}-qism o‘chirilsinmi?`) && del.mutate(ep.id)}>O‘chirish</button>
            {save.isSuccess && !dirty && <span className="text-ok small">Saqlandi</span>}
          </div>
          {err && <div className="wide text-error small">{(err as Error).message}</div>}
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden
            onChange={(e) => { const file = e.target.files?.[0]; if (file) still.mutate({ id: ep.id, file }); e.target.value = ''; }} />
        </div>
      )}
    </div>
  );
}

function SeasonBlock({ movieId, season, episodes }: { movieId: number; season: SeasonInfo | undefined; number: number; episodes: Episode[] }) {
  const save = useSaveSeason(movieId);
  const del = useDeleteSeason(movieId);
  const [ov, setOv] = useState(season?.overview ?? '');
  useEffect(() => setOv(season?.overview ?? ''), [season?.overview]);
  const num = season?.number ?? episodes[0]?.season;

  return (
    <div className="season">
      <div className="season-head">
        {season?.poster_url && <img src={season.poster_url} alt="" className="season-poster" />}
        <div className="season-info">
          <div className="img-head"><h4>{num}-fasl <span className="muted small">({episodes.length} qism)</span></h4>
            <button type="button" className="link-btn" disabled={del.isPending}
              onClick={() => confirm(`${num}-fasl va uning barcha qismlari o‘chirilsinmi?`) && del.mutate(num)}>faslni o‘chirish</button></div>
          {season && (<>
            <textarea rows={3} value={ov} placeholder="Fasl tavsifi" onChange={(e) => setOv(e.target.value)} />
            {ov !== season.overview && <button type="button" className="btn primary sm" disabled={save.isPending}
              onClick={() => save.mutate({ number: season.number, title: season.title, overview: ov })}>Saqlash</button>}
          </>)}
        </div>
      </div>
      {episodes.map((e) => <EpisodeRow key={e.id} movieId={movieId} ep={e} />)}
    </div>
  );
}

export default function EpisodesTab({ movie }: { movie: Movie | undefined }) {
  if (!movie) return <div className="wide muted small">Qismlar uchun avval kinoni saqlang.</div>;
  return <Inner movie={movie} />;
}

function Inner({ movie }: { movie: Movie }) {
  const { data, isLoading } = useEpisodes(movie.id);
  const imp = useImportEpisodes(movie.id);
  const links = useEpisodesFromLinks(movie.id);
  const [season, setSeason] = useState(Number(movie.last_season) || 1);
  const [opts, setOpts] = useState({ translate: true, images: true, map_videos: true, overwrite: false });
  const linkCount = movie.video_links.split('\n').filter((l) => l.trim()).length;
  const canTmdb = /^\d+$/.test(movie.tmdb_id) && movie.tmdb_type !== 'movie';

  const numbers = [...new Set([...(data?.seasons.map((s) => s.number) ?? []), ...(data?.episodes.map((e) => e.season) ?? [])])].sort((a, b) => a - b);
  const err = imp.error || links.error;

  return (
    <div className="wide episodes">
      <div className="card-inset">
        <div className="panel-row">
          <label className="inline">Fasl <input type="number" min={1} value={season} onChange={(e) => setSeason(Math.max(1, Number(e.target.value)))} /></label>
          <button type="button" className="btn primary sm" disabled={!canTmdb || imp.isPending}
            title={canTmdb ? '' : 'Avval TMDB dan serialni oling (TMDB ID + Serial turi)'}
            onClick={() => imp.mutate({ season, ...opts })}>
            {imp.isPending ? 'TMDB + tarjima… (20–60 s)' : 'TMDB dan qismlarni olish'}
          </button>
          <button type="button" className="btn ghost sm" disabled={!linkCount || links.isPending} onClick={() => links.mutate(season)}>
            Video havolalardan yaratish ({linkCount})
          </button>
        </div>
        <div className="panel-row small">
          {([['translate', 'O‘zbekchaga tarjima'], ['images', 'Rasmlarni yuklash'], ['map_videos', 'Video havolalarni biriktirish'],
            ['overwrite', 'Qo‘lda tahrirlanganlarni ham almashtirish']] as const).map(([k, l]) => (
            <label key={k} className="check"><input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} />{l}</label>
          ))}
        </div>
        {err && <div className="text-error small">{(err as Error).message}</div>}
        {imp.isSuccess && <div className="text-ok small">Tayyor: {imp.data.episodes.filter((e) => e.season === season).length} ta qism yangilandi</div>}
        {imp.data?.warnings?.map((w) => <div key={w} className="alert warn small">{w}</div>)}
      </div>
      {isLoading ? <div className="loader" /> : numbers.length === 0 ? (
        <div className="muted small">Hali qismlar yo‘q. TMDB dan oling yoki video havolalardan yarating.</div>
      ) : numbers.map((n) => (
        <SeasonBlock key={n} movieId={movie.id} number={n} season={data!.seasons.find((s) => s.number === n)}
          episodes={data!.episodes.filter((e) => e.season === n)} />
      ))}
    </div>
  );
}
