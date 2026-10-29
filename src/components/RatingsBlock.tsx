import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface Ratings {
  status: string; kp_id?: number | null; imdb_id?: string; kp_rating?: number | null; imdb_rating?: number | null;
  tmdb_rating?: number | null; kp_votes?: number | null; note?: string; checked_at?: string | null;
}

/** Kinopoisk / IMDb / TMDB reytinglari; TMDB da yo‘q kino uchun KP ID — worker bo‘sh maydonlarni to‘ldiradi. */
export default function RatingsBlock({ movieId }: { movieId: number }) {
  const qc = useQueryClient();
  const key = ['ratings', movieId];
  const { data } = useQuery({
    queryKey: key, queryFn: () => api<Ratings>(`/movies/${movieId}/ratings`),
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 15_000 : false),
  });
  const [kp, setKp] = useState('');
  const save = useMutation({
    mutationFn: (id: number) => api<Ratings>(`/movies/${movieId}/ratings`, { method: 'PUT', body: JSON.stringify({ kp_id: id }) }),
    onSuccess: (d) => { qc.setQueryData(key, d); setKp(''); },
  });
  const r = data;
  const fmt = (v?: number | null) => (v ? v.toFixed(1) : '—');
  return (
    <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <span className="small">⭐ KP <b>{fmt(r?.kp_rating)}</b>{r?.kp_votes ? <span className="faint"> ({r.kp_votes})</span> : null}</span>
      <span className="small">IMDb <b>{fmt(r?.imdb_rating)}</b></span>
      <span className="small">TMDB <b>{fmt(r?.tmdb_rating)}</b></span>
      <span className="small faint">
        {r?.kp_id ? <a href={`https://www.kinopoisk.ru/film/${r.kp_id}/`} target="_blank" rel="noreferrer">KP #{r.kp_id}</a> : 'KP ID yo‘q'}
        {r?.imdb_id ? <> · <a href={`https://www.imdb.com/title/${r.imdb_id}/`} target="_blank" rel="noreferrer">{r.imdb_id}</a></> : null}
        {r?.status === 'pending' ? ' · olinmoqda…' : r?.status === 'not_found' ? ' · topilmadi' : ''}
      </span>
      <span style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
        <input className="input" style={{ width: 130 }} placeholder="Kinopoisk ID" value={kp} onChange={(e) => setKp(e.target.value.replace(/\D/g, ''))} />
        <button type="button" className="btn ghost sm" disabled={!kp || save.isPending} onClick={() => save.mutate(+kp)}>Kinopoisk’dan olish</button>
      </span>
      {r?.note && <div className="faint small" style={{ width: '100%' }}>{r.note}</div>}
    </div>
  );
}
