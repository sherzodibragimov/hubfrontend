import { useMemo, useState } from 'react';
import { GEO_COUNTRIES, GEO_PRIORITY } from '../geo';

const NAMES = Object.fromEntries(GEO_COUNTRIES);
// DMCA da ko‘p ishlatiladigan to‘plam: O‘rta Osiyo + qo‘shnilar
const PRESET = ['UZB', 'KAZ', 'KGZ', 'TJK', 'TKM', 'AFG', 'TUR'];

interface Props { value: string[]; onChange: (v: string[]) => void }

/** Ko‘rishga ruxsat etilgan davlatlar — DLE `country` xfield; bo‘sh = hamma davlatda ko‘rinadi. Barcha saytlarga bir xil ketadi. */
export default function GeoSelect({ value, onChange }: Props) {
  const [q, setQ] = useState('');
  const set = new Set(value);
  const toggle = (c: string) => onChange(set.has(c) ? value.filter((x) => x !== c) : [...value, c]);
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? GEO_COUNTRIES.filter(([c, n]) => n.toLowerCase().includes(s) || c.toLowerCase().includes(s)).slice(0, 30) : [];
  }, [q]);

  return (
    <div className="wide geo-select">
      <p className="muted small">
        DMCA uchun: faqat tanlangan davlatlarda ko‘rinadi. <b>Hech narsa tanlanmasa — barcha davlatlarda.</b>{' '}
        Saqlab yuborilganda barcha saytlarga bir xil ketadi.
      </p>
      <div className="geo-chips">
        {value.length ? value.map((c) => (
          <button type="button" key={c} className="chip on" onClick={() => toggle(c)} title="Olib tashlash">{NAMES[c] || c} ✕</button>
        )) : <span className="chip all">🌍 Barcha davlatlar</span>}
      </div>
      <div className="geo-actions">
        <button type="button" className="btn ghost sm" onClick={() => onChange([...new Set([...value, ...PRESET])])}>+ O‘rta Osiyo va Turkiya</button>
        {value.length > 0 && <button type="button" className="btn ghost sm" onClick={() => onChange([])}>Tozalash (barcha davlatlar)</button>}
      </div>
      <div className="geo-chips">
        {GEO_PRIORITY.filter((c) => !set.has(c)).map((c) => (
          <button type="button" key={c} className="chip" onClick={() => toggle(c)}>+ {NAMES[c] || c}</button>
        ))}
      </div>
      <input placeholder="Davlat qidirish…" value={q} onChange={(e) => setQ(e.target.value)} />
      {found.length > 0 && (
        <div className="geo-chips">
          {found.map(([c, n]) => (
            <button type="button" key={c} className={`chip ${set.has(c) ? 'on' : ''}`} onClick={() => toggle(c)}>{set.has(c) ? '✓ ' : '+ '}{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}
