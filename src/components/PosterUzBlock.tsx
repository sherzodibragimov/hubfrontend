import { useState } from 'react';
import { FONTS, usePosterAction, usePosterUz } from '../api/posters';

const STATUS: Record<string, string> = {
  pending: 'Navbatda — worker tez orada yaratadi', queued: 'Qayta chizilmoqda (≈2 daqiqa)…',
  no_textless: 'TMDB da yozuvsiz poster yo‘q', failed: 'Xato',
};

export default function PosterUzBlock({ movieId }: { movieId: number }) {
  const { data: p } = usePosterUz(movieId);
  const act = usePosterAction(movieId);
  const [f, setF] = useState<Record<string, string>>({});
  if (!p) return null;
  const style = { ...p.style, ...p.override };

  return (
    <section className="poster-uz">
      <h4 className="section-title">O‘zbekcha poster <span className="muted small">— yozuvsiz TMDB poster + o‘zbekcha nom (bepul)</span></h4>
      <div className="puz-grid">
        <figure><figcaption>Hozirgi poster{p.applied ? ' (o‘zbekcha)' : ''}</figcaption>{p.current_url ? <img src={p.current_url} alt="" /> : <span className="hit-ph" />}</figure>
        <figure><figcaption>O‘zbekcha variant</figcaption>
          {p.url ? <img src={`${p.url}?v=${encodeURIComponent(p.title + JSON.stringify(style))}`} alt="" /> : <div className="puz-empty muted small">{STATUS[p.status] ?? p.status}</div>}
        </figure>
        <div className="puz-side">
          {p.status !== 'done' && p.url && <div className="text-warn small">{STATUS[p.status]}</div>}
          {p.note && <div className="text-error small">{p.note}</div>}
          {p.url && <div className="faint small">Shrift: {style.font} · {style.position} · {style.model === 'default' ? 'standart uslub' : `AI: ${style.model ?? 'qo‘lda'}`}</div>}
          <div className="form-grid flush single">
            <label><span>Posterdagi nom</span><input placeholder={p.title} value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
            <label><span>Shrift</span><select value={f.font ?? ''} onChange={(e) => setF({ ...f, font: e.target.value })}>
              <option value="">{style.font ?? 'AI tanlaydi'}</option>{FONTS.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <div className="panel-row">
              <select value={f.position ?? ''} onChange={(e) => setF({ ...f, position: e.target.value })}>
                <option value="">Joyi: {style.position ?? '—'}</option><option value="top">Tepada</option><option value="center">O‘rtada</option><option value="bottom">Pastda</option></select>
              <select value={f.case ?? ''} onChange={(e) => setF({ ...f, case: e.target.value })}>
                <option value="">Harf: {style.case ?? '—'}</option><option value="upper">KATTA</option><option value="title">Oddiy</option></select>
              <input type="color" value={f.color ?? style.color ?? '#ffffff'} onChange={(e) => setF({ ...f, color: e.target.value })} title="Rang" style={{ width: 44, padding: 2 }} />
            </div>
            <div className="img-actions">
              <button className="btn ghost sm" disabled={act.isPending || !Object.keys(f).length} onClick={() => act.mutate({ kind: 'restyle', body: f }, { onSuccess: () => setF({}) })}>Qayta chizish</button>
              <button className="btn primary sm" disabled={act.isPending || p.status !== 'done'} onClick={() => act.mutate({ kind: 'apply' })}>Asosiy poster qilish</button>
              {p.original_url && <button className="btn ghost sm" disabled={act.isPending} onClick={() => act.mutate({ kind: 'revert' })}>Aslini qaytarish</button>}
            </div>
            <div className="faint small">Asosiy qilingach saytlarga keyingi “Saqlash va yuborish”da ketadi.</div>
            {act.error && <div className="text-error small">{(act.error as Error).message}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
