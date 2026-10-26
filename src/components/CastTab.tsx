import { useEffect, useRef, useState } from 'react';
import { useCast, useImportCast, useRemoveCast, useSaveCharacter, useSavePerson, useUploadPhoto } from '../api/people';
import type { CastRow, Movie } from '../api/types';
import Icon from './Icon';

const ROLE_LABEL: Record<CastRow['role'], string> = { actor: 'Aktyorlar', creator: 'Ijodkorlar', director: 'Rejissyorlar', writer: 'Ssenariynavislar' };
const ROLE_ORDER: CastRow['role'][] = ['actor', 'creator', 'director', 'writer'];

function age(birth: string | null, death: string | null) {
  if (!birth) return '';
  const b = new Date(birth), e = death ? new Date(death) : new Date();
  const y = e.getFullYear() - b.getFullYear() - (e < new Date(e.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
  return `${y} yosh`;
}

function PersonDrawer({ movieId, row, onClose }: { movieId: number; row: CastRow; onClose: () => void }) {
  const p = row.person;
  const [f, setF] = useState({ name: p.name, biography: p.biography, place_of_birth: p.place_of_birth, known_for: p.known_for });
  const [ch, setCh] = useState(row.character_uz);
  const save = useSavePerson(movieId);
  const saveCh = useSaveCharacter(movieId);
  const photo = useUploadPhoto(movieId);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setF({ name: p.name, biography: p.biography, place_of_birth: p.place_of_birth, known_for: p.known_for }), [p]);
  const dirty = f.name !== p.name || f.biography !== p.biography || f.place_of_birth !== p.place_of_birth || f.known_for !== p.known_for;
  const err = save.error || saveCh.error || photo.error;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="card drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div><h3>{p.name}</h3><span className="muted small">{p.known_for}{p.name_original !== p.name ? ` · ${p.name_original}` : ''}</span></div>
          <button className="alert-close" onClick={onClose} aria-label="Yopish">×</button>
        </div>
        <div className="drawer-body person-edit">
          <div className="person-top">
            <div className="person-photo">{p.photo_url ? <img src={p.photo_url} alt="" /> : <Icon name="user" size={40} />}
              <button type="button" className="btn ghost sm" disabled={photo.isPending} onClick={() => input.current?.click()}>
                {photo.isPending ? 'Yuklanmoqda…' : 'Rasm almashtirish'}</button>
            </div>
            <dl className="kv">
              {p.birthday && <><dt>Tug‘ilgan</dt><dd>{p.birthday} <span className="muted">({age(p.birthday, p.deathday)})</span></dd></>}
              {p.deathday && <><dt>Vafot etgan</dt><dd>{p.deathday}</dd></>}
              {p.place_of_birth_original && <><dt>Asl joy</dt><dd className="muted">{p.place_of_birth_original}</dd></>}
              {p.imdb_id && <><dt>IMDb</dt><dd><a href={`https://www.imdb.com/name/${p.imdb_id}/`} target="_blank" rel="noreferrer">{p.imdb_id}</a></dd></>}
              {p.tmdb_id && <><dt>TMDB</dt><dd><a href={`https://www.themoviedb.org/person/${p.tmdb_id}`} target="_blank" rel="noreferrer">{p.tmdb_id}</a></dd></>}
              {row.episode_count ? <><dt>Qismlar</dt><dd>{row.episode_count} ta qismda</dd></> : null}
            </dl>
          </div>
          <div className="form-grid flush">
            <label><span>Ism</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label><span>Kasbi</span><input value={f.known_for} onChange={(e) => setF({ ...f, known_for: e.target.value })} /></label>
            <label className="wide"><span>Tug‘ilgan joyi (o‘zbekcha)</span><input value={f.place_of_birth} onChange={(e) => setF({ ...f, place_of_birth: e.target.value })} /></label>
            <label className="wide"><span>Biografiya (o‘zbekcha) <span className="muted">{f.biography.length} belgi</span></span>
              <textarea rows={10} value={f.biography} onChange={(e) => setF({ ...f, biography: e.target.value })} /></label>
            {p.biography_original && <details className="wide small muted"><summary>Asl biografiya</summary>{p.biography_original}</details>}
            <div className="wide img-actions">
              <button type="button" className="btn primary sm" disabled={!dirty || !f.name.trim() || save.isPending}
                onClick={() => save.mutate({ id: p.id, ...f })}>{save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}</button>
              {save.isSuccess && !dirty && <span className="text-ok small">Saqlandi</span>}
            </div>
            {row.role === 'actor' && (
              <label className="wide"><span>Personaj (bu kinoda)</span>
                <div className="panel-row"><input value={ch} onChange={(e) => setCh(e.target.value)} placeholder={row.character} />
                  <button type="button" className="btn ghost sm" disabled={ch === row.character_uz || saveCh.isPending}
                    onClick={() => saveCh.mutate({ id: row.id, character_uz: ch })}>Saqlash</button></div>
              </label>
            )}
            {err && <div className="wide text-error small">{(err as Error).message}</div>}
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden
            onChange={(e) => { const file = e.target.files?.[0]; if (file) photo.mutate({ id: p.id, file }); e.target.value = ''; }} />
        </div>
      </aside>
    </div>
  );
}

export default function CastTab({ movie }: { movie: Movie | undefined }) {
  if (!movie) return <div className="wide muted small">Aktyorlar uchun avval kinoni saqlang.</div>;
  return <Inner movie={movie} />;
}

function Inner({ movie }: { movie: Movie }) {
  const { data, isLoading } = useCast(movie.id);
  const imp = useImportCast(movie.id);
  const remove = useRemoveCast(movie.id);
  const [opts, setOpts] = useState({ max_cast: 15, force: false });
  const [open, setOpen] = useState<number | null>(null);
  const canTmdb = /^\d+$/.test(movie.tmdb_id);
  const current = data?.find((c) => c.id === open);
  const noBio = data?.filter((c) => !c.person.biography).length ?? 0;

  return (
    <div className="wide">
      <div className="card-inset">
        <div className="panel-row">
          <button type="button" className="btn primary sm" disabled={!canTmdb || imp.isPending} onClick={() => imp.mutate(opts)}
            title={canTmdb ? '' : 'Avval TMDB dan kinoni oling'}>
            <Icon name="user" size={15} />{imp.isPending ? 'TMDB + tarjima… (15–60 s)' : 'TMDB dan aktyorlarni olish'}
          </button>
          <label className="inline small">Aktyorlar soni <input type="number" min={1} max={40} value={opts.max_cast}
            onChange={(e) => setOpts({ ...opts, max_cast: Math.min(40, Math.max(1, Number(e.target.value))) })} /></label>
          <label className="check small"><input type="checkbox" checked={opts.force} onChange={(e) => setOpts({ ...opts, force: e.target.checked })} />Biografiyalarni qayta tarjima qilish</label>
        </div>
        <div className="muted small">Biografiya va tug‘ilgan joy qaysi tilda bo‘lishidan qat’i nazar o‘zbekchaga tarjima qilinadi. Bir marta olingan shaxs boshqa kinolarda qayta ishlatiladi.</div>
        {imp.error && <div className="text-error small">{(imp.error as Error).message}</div>}
        {imp.isSuccess && <div className="text-ok small">Tayyor: {imp.data.length} ta shaxs{noBio ? ` · ${noBio} tasida biografiya yo‘q` : ''}</div>}
      </div>

      {isLoading ? <div className="loader" /> : !data?.length ? (
        <div className="empty">Hali aktyorlar yo‘q. TMDB dan oling.</div>
      ) : ROLE_ORDER.filter((r) => data.some((c) => c.role === r)).map((role) => (
        <section key={role} className="cast-group">
          <h4>{ROLE_LABEL[role]} <span className="muted small">({data.filter((c) => c.role === role).length})</span></h4>
          <div className="cast-grid">
            {data.filter((c) => c.role === role).map((c) => (
              <div key={c.id} className="cast-card" onClick={() => setOpen(c.id)}>
                <div className="cast-photo">{c.person.photo_url ? <img src={c.person.photo_url} alt="" loading="lazy" /> : <Icon name="user" size={32} />}
                  {!c.person.biography && <span className="cast-flag" title="Biografiya yo‘q">!</span>}
                </div>
                <div className="cast-text">
                  <b>{c.person.name}</b>
                  <span className="muted small">{c.character_uz || c.person.known_for}</span>
                  {c.episode_count ? <span className="faint small">{c.episode_count} qism</span> : null}
                </div>
                <button type="button" className="cast-remove" aria-label="Olib tashlash" title="Bu kinodan olib tashlash"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`${c.person.name} bu kinodan olib tashlansinmi?`)) remove.mutate(c.id); }}>×</button>
              </div>
            ))}
          </div>
        </section>
      ))}
      {current && <PersonDrawer movieId={movie.id} row={current} onClose={() => setOpen(null)} />}
    </div>
  );
}
