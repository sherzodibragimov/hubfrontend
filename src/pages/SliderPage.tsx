import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMovies } from '../api/hooks';
import { SiteSlider, useSliderAction, useSliders } from '../api/slider';

function PinSearch({ site }: { site: SiteSlider }) {
  const [q, setQ] = useState('');
  const [days, setDays] = useState('5');
  const { data } = useMovies({ q, site: site.code, page_size: '8' });
  const act = useSliderAction();
  return (
    <div className="slider-pin">
      <input className="input" placeholder="Kino qidirish — qo‘lda qo‘shish uchun" value={q} onChange={(e) => setQ(e.target.value)} />
      <select className="input" value={days} onChange={(e) => setDays(e.target.value)} style={{ width: 'auto' }}>
        {['3', '5', '7', '14', '30'].map((d) => <option key={d} value={d}>{d} kun</option>)}
        <option value="">muddatsiz</option>
      </select>
      {q.trim().length > 1 && !!data?.items.length && (
        <div className="slider-results">
          {data.items.map((m) => (
            <div key={m.id} className="slider-result">
              <span className="small">{m.name} <span className="faint">{m.year}</span></span>
              <button className="btn ghost sm" onClick={() => act.mutate({ site: site.site_id, kind: 'rule', movie_id: m.id, mode: 'pin', days: days ? +days : undefined }, { onSuccess: () => setQ('') })}>📌 Qo‘shish</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SiteBlock({ s }: { s: SiteSlider }) {
  const act = useSliderAction();
  const pinned = new Set(s.rules.filter((r) => r.mode === 'pin').map((r) => r.movie_id));
  return (
    <section className="card slider-site">
      <header className="page-head" style={{ marginBottom: 12 }}>
        <div><h3 style={{ margin: 0 }}>{s.name}</h3>
          <p className="muted small" style={{ margin: 0 }}>
            {s.rebuild ? 'Qayta tuzilmoqda…' : s.built_at ? `Tuzilgan: ${new Date(s.built_at).toLocaleString('uz')}` : 'Hali tuzilmagan'} · har kuni avtomatik yangilanadi
          </p></div>
        <div className="actions">
          <select className="input" value={s.size} style={{ width: 'auto' }}
            onChange={(e) => act.mutate({ site: s.site_id, kind: 'conf', size: +e.target.value, profile: s.profile })}>
            {[5, 6, 7].map((n) => <option key={n} value={n}>{n} ta</option>)}
          </select>
          <select className="input" value={s.profile} style={{ width: 'auto' }}
            onChange={(e) => act.mutate({ site: s.site_id, kind: 'conf', size: s.size, profile: e.target.value })}>
            <option value="all">Hamma kinolar</option>
            <option value="family">Oilaviy (12+ gacha)</option>
          </select>
          <button className="btn ghost sm" disabled={s.rebuild} onClick={() => act.mutate({ site: s.site_id, kind: 'rebuild' })}>🔄 Qayta tuzish</button>
        </div>
      </header>
      {!s.items.length ? <div className="empty muted small">Slider bo‘sh — worker tez orada tuzadi.</div> : (
        <div className="slider-row">
          {s.items.map((i) => (
            <div key={i.movie_id} className="slider-card">
              <img src={i.backdrop_url} alt="" loading="lazy" />
              <div className="slider-meta">
                <Link to={`/movies/${i.movie_id}`} className="title-link small">{i.position + 1}. {i.name}</Link>
                <span className="faint small">{pinned.has(i.movie_id) ? '📌 qo‘lda' : `${i.reason || '—'} · ${i.score}`}{i.serial ? ' · serial' : ''}</span>
                <div className="actions">
                  {pinned.has(i.movie_id)
                    ? <button className="btn ghost sm" onClick={() => act.mutate({ site: s.site_id, kind: 'unrule', movie_id: i.movie_id })}>Pinni olish</button>
                    : <button className="btn ghost sm" onClick={() => act.mutate({ site: s.site_id, kind: 'rule', movie_id: i.movie_id, mode: 'pin', days: 7 })}>📌 7 kun</button>}
                  <button className="btn ghost sm" onClick={() => act.mutate({ site: s.site_id, kind: 'rule', movie_id: i.movie_id, mode: 'block' })}>🚫 Chiqarmaslik</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <PinSearch site={s} />
      {!!s.rules.length && (
        <div className="geo-chips" style={{ marginTop: 10 }}>
          {s.rules.map((r) => (
            <span key={r.movie_id} className="chip">
              {r.mode === 'pin' ? '📌' : '🚫'} {r.name}{r.until ? ` (${new Date(r.until).toLocaleDateString('uz')} gacha)` : ''}
              <button className="btn ghost sm" onClick={() => act.mutate({ site: s.site_id, kind: 'unrule', movie_id: r.movie_id })}>×</button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SliderPage() {
  const { data, isLoading } = useSliders();
  return (
    <>
      <header className="page-head">
        <div><h2>Slider</h2>
          <p className="muted small" style={{ margin: 0 }}>Har sayt uchun alohida, har kuni avtomatik: yangi, mashhur, reytingi yuqori kinolar, janrlar aralash. Xohlasangiz qo‘lda 📌 qo‘shing yoki 🚫 chiqarmang.</p></div>
      </header>
      {isLoading ? <div className="loader" /> : data?.map((s) => <SiteBlock key={s.site_id} s={s} />)}
    </>
  );
}
