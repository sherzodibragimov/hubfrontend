import { Link } from 'react-router-dom';
import { useMe, useSites, useStats } from '../api/hooks';
import { useBatches } from '../api/sources';
import { useAutofillSummary, useLogSummary } from '../api/system';
import Icon, { IconName } from '../components/Icon';

const fmt = (n: number) => n.toLocaleString('ru-RU');
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const pad = (n: number) => String(n).padStart(2, '0');
const today = (d = new Date()) => `${DAYS[d.getDay()]}, ${d.getDate()}-${MONTHS[d.getMonth()]}`;
const stamp = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? 'Xayrli tun' : h < 12 ? 'Xayrli tong' : h < 18 ? 'Xayrli kun' : 'Xayrli kech';
}

function Ring({ value, tone }: { value: number; tone: string }) {
  const r = 20, c = 2 * Math.PI * r;
  return (
    <svg className={`ring ${tone}`} viewBox="0 0 48 48" width="52" height="52" aria-hidden="true">
      <circle cx="24" cy="24" r={r} className="ring-bg" />
      <circle cx="24" cy="24" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      <text x="24" y="28" textAnchor="middle">{value}%</text>
    </svg>
  );
}

const STATUS_LABEL: Record<string, string> = { running: 'Ishlamoqda', done: 'Tugadi', error: 'Xato', cancelled: 'Bekor', pending: 'Navbatda' };

export default function DashboardPage() {
  const { data: s, isLoading } = useStats();
  const { data: sites } = useSites();
  const { data: me } = useMe();
  const { data: batches } = useBatches();
  const { data: af } = useAutofillSummary();
  const { data: logs } = useLogSummary();
  if (isLoading || !s) return <div className="loader" />;

  const films = s.movies - s.serials;
  const approved = s.movies - s.unapproved;
  const withPoster = s.movies - s.no_poster;
  const errors = (logs?.unread.ERROR ?? 0) + (logs?.unread.CRITICAL ?? 0);
  const warns = logs?.unread.WARNING ?? 0;
  const afTotal = Object.values(af ?? {}).reduce((a, b) => a + b, 0);

  const kpis: { label: string; value: number; sub: string; icon: IconName; tone: string; to?: string }[] = [
    { label: 'Jami kontent', value: s.movies, sub: `${fmt(films)} film · ${fmt(s.serials)} serial`, icon: 'film', tone: 'ember', to: '/movies' },
    { label: 'Seriallar', value: s.serials, sub: `${pct(s.serials, s.movies)}% katalogdan`, icon: 'tv', tone: 'cyan', to: '/movies?kind=serial' },
    { label: 'Tasdiqlanmagan', value: s.unapproved, sub: s.unapproved ? 'Ko‘rib chiqish kerak' : 'Hammasi tasdiqlangan', icon: 'check', tone: 'amber', to: '/movies?approve=false' },
    { label: 'Postersiz', value: s.no_poster, sub: s.no_poster ? 'Autofill bilan to‘ldiring' : 'Hammasida poster bor', icon: 'image', tone: 'rose' },
  ];

  return (
    <div className="dash">
      <header className="hero card">
        <div>
          <p className="eyebrow">{today()}</p>
          <h2>{greeting()}, {me?.username ?? ''} 👋</h2>
          <p className="muted">Katalog holati va saytlar bo‘yicha nashr — bir qarashda.</p>
        </div>
        <div className="hero-actions">
          <Link className="btn ghost" to="/sources"><Icon name="layers" /> Manbalar</Link>
          <Link className="btn primary" to="/movies/new"><Icon name="film" /> Yangi kino</Link>
        </div>
      </header>

      <div className="kpis">
        {kpis.map((k) => {
          const body = (
            <>
              <div className={`kpi-ico ${k.tone}`}><Icon name={k.icon} size={20} /></div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{fmt(k.value)}</div>
              <div className="kpi-sub">{k.sub}</div>
            </>
          );
          return k.to ? <Link key={k.label} to={k.to} className={`card kpi ${k.tone}`}>{body}</Link>
            : <div key={k.label} className={`card kpi ${k.tone}`}>{body}</div>;
        })}
      </div>

      <div className="dash-grid">
        <section className="card block">
          <div className="block-head">
            <div><h3>Saytlar bo‘yicha nashr</h3><p className="muted small">Har bir saytga yuborilgan kontent holati</p></div>
            <div className="legend"><i className="l-ok" />Sinxron<i className="l-pending" />Kutilmoqda<i className="l-error" />Xato<i className="l-deleted" />O‘chirilgan</div>
          </div>
          <div className="sites">
            {sites?.map((site) => {
              const p = s.publications[site.code] ?? {};
              const parts = [['ok', p.synced ?? 0], ['pending', p.pending ?? 0], ['error', p.error ?? 0], ['deleted', p.deleted ?? 0]] as const;
              const total = parts.reduce((a, [, v]) => a + v, 0);
              return (
                <Link key={site.id} to={`/movies?site=${site.code}`} className="site-row">
                  <div className="site-name">
                    <span className={`dot ${site.is_active ? 'on' : ''}`} />
                    <b>{site.name}</b><span className="muted small">{site.code}</span>
                  </div>
                  <div className="stack">
                    {parts.map(([k, v]) => v > 0 && <div key={k} className={`seg s-${k}`} style={{ flexGrow: v }} title={`${v}`} />)}
                    {!total && <div className="seg s-empty" style={{ flexGrow: 1 }} />}
                  </div>
                  <div className="site-nums">
                    <b>{fmt(p.synced ?? 0)}</b><span className="muted">/ {fmt(total)}</span>
                    {(p.error ?? 0) > 0 && <span className="badge error">{p.error} xato</span>}
                  </div>
                </Link>
              );
            })}
            {!sites?.length && <div className="empty">Saytlar qo‘shilmagan</div>}
          </div>
        </section>

        <aside className="dash-side">
          <section className="card block">
            <h3>Katalog sifati</h3>
            <div className="quality">
              <div><Ring value={pct(approved, s.movies)} tone="ok" /><span>Tasdiqlangan</span></div>
              <div><Ring value={pct(withPoster, s.movies)} tone="cyan" /><span>Posterli</span></div>
            </div>
          </section>

          <section className="card block">
            <div className="block-head"><h3>Tizim</h3><Link to="/system" className="small">Loglar <Icon name="arrowRight" size={12} /></Link></div>
            <ul className="health">
              <li><span className={`dot ${errors ? 'bad' : 'on'}`} />Xatolar<b className={errors ? 'text-error' : ''}>{errors}</b></li>
              <li><span className={`dot ${warns ? 'warn' : 'on'}`} />Ogohlantirishlar<b>{warns}</b></li>
              <li><span className="dot on" />Autofill navbati<b>{fmt(afTotal)}</b></li>
            </ul>
          </section>
        </aside>
      </div>

      <section className="card block">
        <div className="block-head">
          <div><h3>So‘nggi manba ishlari</h3><p className="muted small">Scrape, disk va tekshiruv batchlari</p></div>
          <Link to="/sources" className="small">Barchasi <Icon name="arrowRight" size={12} /></Link>
        </div>
        <div className="timeline">
          {batches?.slice(0, 6).map((b) => (
            <div key={b.id} className={`tl-item ${b.status}`}>
              <span className="tl-dot" />
              <div className="tl-main">
                <div className="tl-top"><b>{b.mode_label}</b><span className="muted small">{b.provider_code ?? '—'}</span>
                  <span className={`badge st-${b.status}`}>{STATUS_LABEL[b.status] ?? b.status}</span></div>
                <div className="muted small tl-msg">{b.message || '—'}</div>
                <div className="bar"><div style={{ width: `${b.pct}%` }} /></div>
              </div>
              <div className="tl-meta small muted">
                <span className="text-ok">{b.ok}</span> / <span className="text-error">{b.fail}</span>
                <span><Icon name="clock" size={12} /> {stamp(b.started_at)}</span>
              </div>
            </div>
          ))}
          {!batches?.length && <div className="empty">Hali ish yo‘q</div>}
        </div>
      </section>
    </div>
  );
}
