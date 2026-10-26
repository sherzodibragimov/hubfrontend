import { useRef } from 'react';
import { useDeleteImage, useUploadImage } from '../api/hooks';
import type { ImageKind, Movie } from '../api/types';

const KINDS: [ImageKind, string][] = [
  ['poster', 'Poster'], ['poster-long', 'Poster (keng)'], ['cadre1', 'Kadr 1'], ['cadre2', 'Kadr 2'], ['cadre3', 'Kadr 3'],
];

interface Props { movie: Movie | undefined; pending: Partial<Record<ImageKind, string>> }

function Slot({ movie, kind, label, pendingUrl }: { movie?: Movie; kind: ImageKind; label: string; pendingUrl?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const up = useUploadImage();
  const del = useDeleteImage();
  const img = movie?.images.find((i) => i.kind === kind);
  const src = img?.url || pendingUrl;
  const err = up.error || del.error;

  return (
    <div className={`img-slot ${kind === 'poster' ? 'tall' : ''}`}>
      <div className="img-frame">
        {src ? <img src={src} alt={label} loading="lazy" /> : <span className="muted small">Yo‘q</span>}
        {!img?.url && pendingUrl && <span className="img-tag">saqlanganda yuklanadi</span>}
      </div>
      <div className="img-head">
        <strong>{label}</strong>
        {movie ? (
          <span className="img-actions">
            <button type="button" className="link-btn plain" disabled={up.isPending} onClick={() => input.current?.click()}>
              {up.isPending ? '…' : img ? 'almashtirish' : 'yuklash'}
            </button>
            {img && <button type="button" className="link-btn" disabled={del.isPending}
              onClick={() => confirm(`${label} o‘chirilsinmi?`) && del.mutate({ id: movie.id, kind })}>o‘chirish</button>}
          </span>
        ) : null}
      </div>
      {err && <div className="text-error small">{(err as Error).message}</div>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f && movie) up.mutate({ id: movie.id, kind, file: f }); e.target.value = ''; }} />
    </div>
  );
}

export default function ImagesTab({ movie, pending }: Props) {
  return (
    <div className="wide">
      {!movie && <div className="muted small" style={{ marginBottom: 10 }}>Rasm yuklash uchun avval kinoni saqlang (TMDB rasmlari saqlanganda avtomatik yuklanadi).</div>}
      <div className="img-grid">
        {KINDS.map(([k, l]) => <Slot key={k} movie={movie} kind={k} label={l} pendingUrl={pending[k]} />)}
      </div>
    </div>
  );
}
