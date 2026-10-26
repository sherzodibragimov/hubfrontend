import { Link } from 'react-router-dom';
import { useRefreshTags, useSimilar, useTmdbInfo } from '../api/collections';
import type { Movie } from '../api/types';
import Icon from './Icon';

const LANG: Record<string, string> = { ru: 'ruscha', en: 'inglizcha', uz: 'o‘zbekcha', tr: 'turkcha', ko: 'koreyscha', hi: 'hindcha', ja: 'yaponcha', zh: 'xitoycha' };
const COUNTRY: Record<string, string> = {
  US: 'AQSh', GB: 'Buyuk Britaniya', TR: 'Turkiya', KR: 'Janubiy Koreya', IN: 'Hindiston', RU: 'Rossiya', JP: 'Yaponiya', CN: 'Xitoy',
  FR: 'Fransiya', DE: 'Germaniya', ES: 'Ispaniya', IT: 'Italiya', CA: 'Kanada', AU: 'Avstraliya', UZ: 'O‘zbekiston', KZ: 'Qozog‘iston',
};

export default function TmdbTab({ movie }: { movie: Movie | undefined }) {
  if (!movie) return <div className="wide muted small">Avval kinoni saqlang.</div>;
  return <Inner movie={movie} />;
}

function Inner({ movie }: { movie: Movie }) {
  const { data: info, isLoading } = useTmdbInfo(movie.id);
  const { data: sim } = useSimilar(movie.id);
  const refresh = useRefreshTags(movie.id);
  const canTmdb = /^\d+$/.test(movie.tmdb_id);

  return (
    <div className="wide tmdb-tab">
      <div className="card-inset">
        <div className="panel-row">
          <button type="button" className="btn primary sm" disabled={!canTmdb || refresh.isPending} onClick={() => refresh.mutate()}>
            <Icon name="globe" size={15} />{refresh.isPending ? 'Olinmoqda…' : info ? 'TMDB dan yangilash' : 'TMDB dan olish'}</button>
          <span className="muted small">To‘plamlar, o‘xshash kinolar, yosh chegarasi, treyler va ruscha nom. Worker buni avtomatik ham qiladi.</span>
        </div>
        {refresh.error && <div className="text-error small">{(refresh.error as Error).message}</div>}
        {!canTmdb && <div className="text-warn small">Kinoda TMDB ID yo‘q — avval “TMDB dan olish” yoki Autofill.</div>}
      </div>

      {isLoading ? <div className="loader" /> : info ? (
        <div className="info-grid">
          <dl className="kv">
            {info.title_ru && <><dt>Ruscha nomi</dt><dd><b>{info.title_ru}</b></dd></>}
            {info.title_original && <><dt>Asl nomi</dt><dd>{info.title_original}</dd></>}
            {info.alt_titles.length > 0 && <><dt>Muqobil nomlar</dt><dd className="chips">{info.alt_titles.map((t) => <span key={t} className="chip">{t}</span>)}</dd></>}
            <dt>Yosh chegarasi</dt><dd>{info.age ? <span className="age-badge">{info.age}</span> : <span className="muted">—</span>}
              {movie.age && movie.age !== info.age && <span className="muted small"> · kinoda: {movie.age}</span>}</dd>
            {info.countries.length > 0 && <><dt>Davlat</dt><dd>{info.countries.map((c) => COUNTRY[c] ?? c).join(', ')}</dd></>}
            {info.original_language && <><dt>Asl tili</dt><dd>{LANG[info.original_language] ?? info.original_language}</dd></>}
            {info.release_date && <><dt>Chiqqan sana</dt><dd>{info.release_date}</dd></>}
          </dl>
          <div>
            <div className="field-label">Treylerlar <span className="muted">(ruscha birinchi)</span></div>
            <div className="trailers">
              {info.trailers.map((t) => (
                <a key={t.key} href={`https://www.youtube.com/watch?v=${t.key}`} target="_blank" rel="noreferrer" className="trailer">
                  <img src={`https://i.ytimg.com/vi/${t.key}/mqdefault.jpg`} alt="" loading="lazy" />
                  <span className="tr-lang">{LANG[t.lang] ?? t.lang}</span>
                  <span className="small tr-name">{t.name}{movie.trailer === t.key && <b className="text-ok"> · saytda</b>}</span>
                </a>
              ))}
              {!info.trailers.length && <span className="muted small">Treyler topilmadi</span>}
            </div>
          </div>
        </div>
      ) : <div className="muted small">TMDB ma’lumoti hali olinmagan.</div>}

      {sim && (sim.in_db.length > 0 || sim.missing.length > 0) && (
        <>
          <h4 className="section-title">O‘xshash kinolar <span className="muted small">— saytda “Shuni yoqtirganlar buni ham ko‘radi”</span></h4>
          {sim.in_db.length > 0 ? (
            <div className="poster-row">
              {sim.in_db.map((m) => (
                <Link key={m.movie_id} to={`/movies/${m.movie_id}`} className="pr-item">
                  {m.poster ? <img src={m.poster} alt="" loading="lazy" /> : <span className="hit-ph" />}
                  <span>{m.name}</span><span className="muted small">{m.year}</span>
                </Link>
              ))}
            </div>
          ) : <div className="muted small">Bazada o‘xshash kinolar hali yo‘q.</div>}
          {sim.missing.length > 0 && (
            <details className="excluded"><summary className="muted small">Bazada yo‘q o‘xshashlar ({sim.missing.length}) — tarjima uchun g‘oyalar</summary>
              <div className="poster-row">
                {sim.missing.map((m) => (
                  <a key={m.tmdb_id} href={`https://www.themoviedb.org/${movie.tmdb_type === 'tv' ? 'tv' : 'movie'}/${m.tmdb_id}`} target="_blank" rel="noreferrer" className="pr-item dim">
                    {m.poster ? <img src={m.poster} alt="" loading="lazy" /> : <span className="hit-ph" />}
                    <span>{m.title}</span><span className="muted small">{m.year}</span>
                  </a>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
