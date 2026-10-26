import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CollectionKind, KIND_LABEL, useCollections, useCreateCollection, useTmdbSearch } from '../api/collections';
import Icon from '../components/Icon';

const COUNTRIES = [['TR', 'Turkiya'], ['KR', 'Janubiy Koreya'], ['IN', 'Hindiston'], ['RU', 'Rossiya'], ['CN', 'Xitoy'], ['JP', 'Yaponiya'],
  ['US', 'AQSh'], ['GB', 'Buyuk Britaniya'], ['FR', 'Fransiya'], ['ES', 'Ispaniya'], ['UZ', 'O‘zbekiston'], ['KZ', 'Qozog‘iston'], ['IR', 'Eron'], ['PK', 'Pokiston']];

const CREATE_HELP: Record<Exclude<CollectionKind, 'tmdb'>, string> = {
  country: 'Davlat bo‘yicha (masalan “Turk seriallari”) — shu davlatda ishlangan kinolar avtomatik qo‘shiladi.',
  company: 'Studiya yoki platforma (Marvel Studios, Pixar, Netflix…) — bazadagi shu studiya kinolari avtomatik qo‘shiladi.',
  keyword: 'TMDB kalit so‘zi (masalan “marvel cinematic universe”, “superhero”, “zombie”) — mos kinolar avtomatik qo‘shiladi.',
  manual: 'Kinolarni o‘zingiz tanlaysiz va tartiblaysiz (masalan “Yangi yil kinolari”).',
};

function CreateModal({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const [kind, setKind] = useState<Exclude<CollectionKind, 'tmdb'> | 'tmdb'>('company');
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [pick, setPick] = useState<{ id: number; name: string } | null>(null);
  const [country, setCountry] = useState({ code: 'TR', media: 'tv' });
  const free = kind === 'manual' || kind === 'country';
  const search = useTmdbSearch(kind === 'tmdb' ? 'collection' : free ? 'company' : kind, free ? '' : q);
  const create = useCreateCollection();

  const submit = () => create.mutate(
    kind === 'manual' ? { kind, name } : kind === 'country' ? { kind, name, ...country } : { kind, tmdb_id: pick!.id, name },
    { onSuccess: (d) => nav(`/collections/${d.id}`) },
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal wide-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Yangi to‘plam</h3>
        <div className="tabs">
          {(['company', 'keyword', 'country', 'tmdb', 'manual'] as const).map((k) => (
            <button key={k} type="button" className={k === kind ? 'active' : ''} onClick={() => { setKind(k); setPick(null); setQ(''); }}>{KIND_LABEL[k]}</button>
          ))}
        </div>
        <p className="muted small">{kind === 'tmdb' ? 'Franshizalar kino TMDB dan olinganda o‘zi yaratiladi. Bu yerda qo‘lda ham qo‘shish mumkin.' : CREATE_HELP[kind]}</p>
        {kind === 'country' && (
          <div className="panel-row">
            <select value={country.code} onChange={(e) => setCountry({ ...country, code: e.target.value })}>
              {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
            <select value={country.media} onChange={(e) => setCountry({ ...country, media: e.target.value })}>
              <option value="tv">Seriallar</option><option value="movie">Kinolar</option><option value="">Hammasi</option></select>
          </div>
        )}
        {!free && (
          <>
            <div className="input-ico"><Icon name="globe" />
              <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setPick(null); }} placeholder="TMDB dan qidirish (inglizcha)…" />
            </div>
            <div className="hits">
              {search.isFetching && <div className="muted small">Qidirilmoqda…</div>}
              {search.data?.map((h) => (
                <button type="button" key={h.id} className={`hit ${pick?.id === h.id ? 'on' : ''}`} onClick={() => setPick(h)}>
                  {h.logo ? <img src={h.logo} alt="" /> : <span className="hit-ph"><Icon name="layers" size={14} /></span>}
                  <span>{h.name}</span>{h.country && <span className="muted small">{h.country}</span>}
                  <span className="muted small hit-id">#{h.id}</span>
                </button>
              ))}
              {search.data?.length === 0 && <div className="muted small">Topilmadi</div>}
            </div>
          </>
        )}
        <label className="field"><span>Nomi (o‘zbekcha){!free && <span className="muted"> — bo‘sh qolsa TMDB dan tarjima</span>}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'keyword' ? 'Marvel kinematografik olami' : pick?.name ?? ''} />
        </label>
        {create.error && <div className="alert error">{(create.error as Error).message}</div>}
        <div className="actions end">
          <button type="button" className="btn ghost" onClick={onClose}>Bekor</button>
          <button type="button" className="btn primary" disabled={create.isPending || (free ? !name.trim() : !pick)} onClick={submit}>
            {create.isPending ? 'Yaratilmoqda…' : 'Yaratish'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isFetching } = useCollections({ q, kind });

  return (
    <>
      <header className="page-head">
        <h2>To‘plamlar <small>{data?.length ?? ''}</small></h2>
        <button className="btn primary" onClick={() => setCreating(true)}><Icon name="layers" size={16} /> Yangi to‘plam</button>
      </header>
      <div className="filters">
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi bo‘yicha qidirish…" />
        <div className="tabs flat">
          {['', 'tmdb', 'country', 'company', 'keyword', 'manual'].map((k) => (
            <button key={k} type="button" className={k === kind ? 'active' : ''} onClick={() => setKind(k)}>{k ? KIND_LABEL[k as CollectionKind] : 'Barchasi'}</button>
          ))}
        </div>
      </div>
      {isLoading ? <div className="loader" /> : !data?.length ? (
        <div className="card empty">To‘plamlar hali yo‘q. Franshizalar kinolar TMDB dan olinganda avtomatik paydo bo‘ladi.</div>
      ) : (
        <div className={`coll-grid ${isFetching ? 'fetching' : ''}`}>
          {data.map((c) => (
            <Link key={c.id} to={`/collections/${c.id}`} className={`coll-card ${c.is_published ? '' : 'off'}`}>
              <div className="coll-art" style={c.backdrop_url ? { backgroundImage: `url(${c.backdrop_url})` } : undefined}>
                {c.poster_url ? <img src={c.poster_url} alt="" loading="lazy" className={c.kind === 'company' ? 'logo' : ''} /> : <Icon name="layers" size={34} />}
                <span className={`kind-tag k-${c.kind}`}>{KIND_LABEL[c.kind]}</span>
              </div>
              <div className="coll-body">
                <b>{c.name || c.name_original}</b>
                <span className="muted small">
                  {c.movie_count} ta kino{c.missing_count ? <span className="text-warn"> · {c.missing_count} ta yo‘q</span> : null}
                  {!c.is_published && <span> · yashirin</span>}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {creating && <CreateModal onClose={() => setCreating(false)} />}
    </>
  );
}
