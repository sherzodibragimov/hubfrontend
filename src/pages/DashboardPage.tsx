import { Link } from 'react-router-dom';
import { useSites, useStats } from '../api/hooks';

export default function DashboardPage() {
  const { data: s, isLoading } = useStats();
  const { data: sites } = useSites();
  if (isLoading || !s) return <div className="loader" />;

  const tiles = [
    { label: 'Jami', value: s.movies, to: '/movies' },
    { label: 'Seriallar', value: s.serials, to: '/movies?kind=serial' },
    { label: 'Tasdiqlanmagan', value: s.unapproved, to: '/movies?approve=false' },
    { label: 'Postersiz', value: s.no_poster },
  ];

  return (
    <>
      <header className="page-head"><h2>Bosh sahifa</h2></header>
      <div className="tiles">
        {tiles.map((t) => {
          const body = <><div className="tile-value">{t.value.toLocaleString()}</div><div className="tile-label">{t.label}</div></>;
          return t.to ? <Link key={t.label} to={t.to} className="card tile">{body}</Link>
            : <div key={t.label} className="card tile">{body}</div>;
        })}
      </div>
      <h3 className="section-title">Saytlar bo‘yicha nashr</h3>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Sayt</th><th>Sinxron</th><th>Kutilmoqda</th><th>Xato</th><th>O‘chirilgan</th></tr></thead>
          <tbody>
            {sites?.map((site) => {
              const p = s.publications[site.code] ?? {};
              return (
                <tr key={site.id}>
                  <td><Link to={`/movies?site=${site.code}`}>{site.name}</Link></td>
                  <td>{p.synced ?? 0}</td><td>{p.pending ?? 0}</td>
                  <td className={p.error ? 'text-error' : ''}>{p.error ?? 0}</td><td>{p.deleted ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
