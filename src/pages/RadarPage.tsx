import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRadar } from '../api/collections';
import Icon from '../components/Icon';

const LISTS = [
  ['trending_movie', 'Haftaning trend kinolari'], ['trending_tv', 'Trend seriallar'], ['upcoming', 'Tez orada (kinoteatr)'],
  ['now_playing', 'Hozir kinoteatrlarda'], ['on_the_air', 'Efirdagi seriallar'], ['popular_tr', 'Turk seriallari'], ['popular_kr', 'Koreys dramalari'],
] as const;

export default function RadarPage() {
  const [which, setWhich] = useState<string>('trending_movie');
  const [onlyMissing, setOnlyMissing] = useState(true);
  const { data, isLoading, isFetching, error } = useRadar(which);
  const items = (data ?? []).filter((i) => !onlyMissing || !i.movie_id);

  return (
    <>
      <header className="page-head">
        <div><h2>Radar</h2><p className="muted small" style={{ margin: 0 }}>TMDB trendlari — qaysi kinoni birinchi tarjima qilishni tanlang. Nomlar ruscha (auditoriya shunday qidiradi).</p></div>
        <label className="check small"><input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />Faqat bazada yo‘qlari</label>
      </header>
      <div className="tabs">{LISTS.map(([k, l]) => <button key={k} type="button" className={k === which ? 'active' : ''} onClick={() => setWhich(k)}>{l}</button>)}</div>
      {error && <div className="alert error">{(error as Error).message}</div>}
      {isLoading ? <div className="loader" /> : (
        <div className={`radar-grid ${isFetching ? 'fetching' : ''}`}>
          {items.map((i, n) => (
            <div key={i.tmdb_id} className="radar-card">
              <a className="radar-poster" href={`https://www.themoviedb.org/${i.media}/${i.tmdb_id}`} target="_blank" rel="noreferrer">
                {i.poster ? <img src={i.poster} alt="" loading="lazy" /> : <Icon name="film" size={28} />}
                <span className="radar-rank">{n + 1}</span>
                {i.rating > 0 && <span className="radar-rating">★ {i.rating}</span>}
              </a>
              <div className="radar-body">
                <b title={i.overview}>{i.title}</b>
                {i.original !== i.title && <span className="muted small">{i.original}</span>}
                <span className="faint small">{i.date?.slice(0, 4)}{i.country ? ` · ${i.country}` : ''} · {i.media === 'tv' ? 'serial' : 'kino'} · TMDB {i.tmdb_id}</span>
                {i.movie_id ? <Link to={`/movies/${i.movie_id}`} className="badge synced">Bazada bor →</Link>
                  : <span className="badge pending">Bazada yo‘q</span>}
              </div>
            </div>
          ))}
          {!items.length && <div className="empty">Bu ro‘yxatdagi hammasi bazada bor 🎉</div>}
        </div>
      )}
    </>
  );
}
