import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useViewsTop } from '../api/views';

const PERIODS = [1, 7, 30, 90];

export default function ViewsPage() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useViewsTop(days);
  return (
    <>
      <header className="page-head">
        <div><h2>Ko‘rishlar</h2>
          <p className="muted small" style={{ margin: 0 }}>Saytlar har 10 daqiqada kunlik ko‘rishlarni yuboradi. O‘sish — oldingi shuncha kunga nisbatan.</p></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map((d) => (
            <button key={d} className={`btn sm ${d === days ? '' : 'ghost'}`} onClick={() => setDays(d)}>{d === 1 ? 'Bugun' : `${d} kun`}</button>
          ))}
        </div>
      </header>
      {isLoading || !data ? <div className="loader" /> : (
        <>
          <div className="card small" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {data.sites.map((s) => <div key={s.code}><span className="muted">{s.name}:</span> <b>{s.views.toLocaleString()}</b></div>)}
          </div>
          {!data.items.length ? <div className="card empty">Bu davrda ko‘rish yo‘q.</div> : (
            <div className="card table-wrap">
              <table>
                <thead><tr><th>#</th><th>Kino</th><th>Jami</th>{data.sites.map((s) => <th key={s.code}>{s.name}</th>)}<th>O‘sish</th></tr></thead>
                <tbody>
                  {data.items.map((i, n) => (
                    <tr key={i.movie_id}>
                      <td className="faint">{n + 1}</td>
                      <td><Link to={`/movies/${i.movie_id}`} className="title-link">{i.name}</Link> <span className="faint small">{i.year}</span></td>
                      <td><b>{i.views.toLocaleString()}</b></td>
                      {data.sites.map((s) => <td key={s.code}>{(i.sites[s.code] ?? 0).toLocaleString()}</td>)}
                      <td className="small">{i.growth === null ? '🆕' : i.growth >= 0 ? `▲ ${i.growth}%` : `▼ ${-i.growth}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
