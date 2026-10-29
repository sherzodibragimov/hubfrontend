import { Link } from 'react-router-dom';
import { useCleanup, useKeep } from '../api/cleanup';

export default function CleanupPage() {
  const { data, isLoading } = useCleanup();
  const keep = useKeep();
  if (isLoading || !data) return <div className="loader" />;
  const r = data.rules;
  const ready = data.sites.every((s) => s.ready);
  return (
    <>
      <header className="page-head">
        <div><h2>Tozalash</h2>
          <p className="muted small" style={{ margin: 0 }}>
            {r.window_days} kunda uchala saytda jami {r.min_views} martadan kam ko‘rilgan, {r.min_age_days} kundan eski kinolar nomzod bo‘ladi
            (davom etayotgan serial, slider, reytingi 7.5+ va «saqlash» qilinganlar bundan mustasno). Nomzod {r.grace_days} kundan keyin saytlar, Hub va diskdan o‘chadi.
          </p></div>
      </header>
      <div className={`alert ${ready ? 'ok' : ''}`}>
        {ready ? 'Barcha saytlardan statistika keladi — tozalash ishlayapti.' : 'Tozalash hali o‘chiq: hamma saytdan kamida 90 kunlik ko‘rish statistikasi kerak.'}
        <div className="small" style={{ marginTop: 6 }}>
          {data.sites.map((s) => <div key={s.code}>{s.ready ? '✅' : '⏳'} {s.name}: {s.last ? `${s.first} → ${s.last}` : 'ko‘rishlar hali yuborilmagan'}</div>)}
        </div>
      </div>
      {!data.items.length ? <div className="card empty">Nomzod yo‘q.</div> : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Kino</th><th>90 kunda ko‘rish</th><th>Holat</th><th /></tr></thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.movie_id}>
                  <td><Link to={`/movies/${i.movie_id}`} className="title-link">{i.name}</Link> <span className="faint small">{i.year}</span></td>
                  <td>{i.views_90d}</td>
                  <td className="small">{i.status === 'keep' ? '📌 saqlanadi' : `${i.days_left} kundan keyin o‘chadi`}</td>
                  <td>{i.status === 'keep'
                    ? <button className="btn ghost sm" onClick={() => keep.mutate({ id: i.movie_id, keep: false })}>Saqlashni olish</button>
                    : <button className="btn ghost sm" onClick={() => keep.mutate({ id: i.movie_id, keep: true })}>📌 Saqlash</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
