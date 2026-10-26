import { useState } from 'react';
import { useTmdbImport, useTmdbSeasons } from '../api/hooks';
import type { TmdbResult } from '../api/types';

interface Props { initialId: string; initialType: string; onApply: (r: TmdbResult) => Promise<string | void> }

export default function TmdbPanel({ initialId, initialType, onApply }: Props) {
  const [id, setId] = useState(initialId);
  const [type, setType] = useState(initialType || 'auto');
  const [season, setSeason] = useState(0);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const imp = useTmdbImport();
  const seasons = useTmdbSeasons();

  const tid = Number(id);
  const valid = Number.isInteger(tid) && tid > 0;

  async function run() {
    if (!valid) return setStatus({ text: 'TMDB ID kiriting (raqam)', error: true });
    setStatus({ text: season ? `TMDB fasl ${season} yuklanmoqda…` : 'TMDB + tarjima yuklanmoqda…' });
    try {
      const r = await imp.mutateAsync({ tmdb_id: tid, media_type: type, season });
      if (r.media_type) setType(r.media_type);
      const extra = await onApply(r);
      const bits = [r.fields.imdb && `IMDb ${r.fields.imdb}`, r.fields.kp && `KP ${r.fields.kp}`, r.fields.age && `yosh ${r.fields.age}`, extra]
        .filter(Boolean).join(', ');
      setStatus({ text: `Tayyor ✓ (${r.media_type} #${r.tmdb_id})${bits ? ' — ' + bits : ''}` });
    } catch (e) {
      setStatus({ text: (e as Error).message, error: true });
    }
  }

  async function loadSeasons() {
    if (!valid) return setStatus({ text: 'TMDB ID kiriting', error: true });
    try {
      const r = await seasons.mutateAsync(tid);
      setType('tv');
      setStatus({ text: `${r.seasons.length} ta fasl topildi` });
    } catch (e) {
      setStatus({ text: (e as Error).message, error: true });
    }
  }

  return (
    <div className="card tmdb">
      <strong>TMDB</strong>
      <input className="tmdb-id" placeholder="TMDB ID" value={id} inputMode="numeric"
        onChange={(e) => setId(e.target.value.trim())}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } }} />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="auto">Avto</option><option value="movie">Kino</option><option value="tv">Serial</option>
      </select>
      {type === 'tv' && (
        seasons.data?.seasons.length ? (
          <select value={season} onChange={(e) => setSeason(Number(e.target.value))}>
            <option value={0}>Barcha fasllar</option>
            {seasons.data.seasons.map((s) => <option key={s.number} value={s.number}>{s.name} ({s.episode_count} qism)</option>)}
          </select>
        ) : <button type="button" className="btn ghost sm" onClick={loadSeasons} disabled={seasons.isPending}>Fasllar</button>
      )}
      <button type="button" className="btn primary sm" onClick={run} disabled={imp.isPending}>
        {imp.isPending ? 'Yuklanmoqda…' : 'TMDB dan olish'}
      </button>
      {status && <span className={`small ${status.error ? 'text-error' : 'muted'}`}>{status.text}</span>}
    </div>
  );
}
