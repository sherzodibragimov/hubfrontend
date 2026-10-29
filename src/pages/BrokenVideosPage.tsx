import { Link } from 'react-router-dom';
import { useBrokenVideos, useRedownload } from '../api/videos';

export default function BrokenVideosPage() {
  const { data, isLoading } = useBrokenVideos();
  const re = useRedownload();
  return (
    <>
      <header className="page-head">
        <div><h2>Buzuq videolar</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Saytda havolasi bor, lekin fayl CDN da ochilmaydi (404). Har kuni tekshiriladi
            {data?.[0] ? ` · oxirgi: ${new Date(data[0].checked_at).toLocaleString('uz')}` : ''}. Boshqa manbada topilgan bo‘lsa — tanlab qayta yuklang.
          </p></div>
      </header>
      {re.isSuccess && <div className="alert ok">Yuklash boshlandi — Manbalar sahifasida jarayon ko‘rinadi.</div>}
      {re.isError && <div className="alert error">{String(re.error)}</div>}
      {isLoading ? <div className="loader" /> : !data?.length ? <div className="card empty">Buzuq video yo‘q 🎉</div> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Kino</th><th>Buzuq</th><th>Boshqa manbada</th></tr></thead>
            <tbody>
              {data.map((v) => (
                <tr key={v.movie_id}>
                  <td><Link to={`/movies/${v.movie_id}`} className="title-link">{v.name}</Link>
                    <div className="faint small">{v.year}{v.serial ? ' · serial' : ''}</div></td>
                  <td><b>{v.broken}</b> / {v.total}<div className="faint small" title={v.sample} style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.sample}</div></td>
                  <td>{!v.candidates.length ? <span className="faint small">topilmadi</span> : v.candidates.map((c) => (
                    <div key={c.item_id} className="slider-result">
                      <span className="small">{c.provider}: {c.title} <span className="faint">({c.status})</span></span>
                      <button className="btn ghost sm" disabled={re.isPending}
                        onClick={() => confirm(`«${v.name}» videosini ${c.provider} dan qayta yuklaymi?`) && re.mutate({ movie_id: v.movie_id, item_id: c.item_id })}>Yuklash</button>
                    </div>))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
