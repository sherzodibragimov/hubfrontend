import { useRef, useState } from 'react';
import { useDeleteHistory, useUploadHistory } from '../api/hooks';
import type { Movie } from '../api/types';

export default function HistoryVideo({ movie }: { movie: Movie | undefined }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const up = useUploadHistory();
  const del = useDeleteHistory();

  if (!movie) return <div className="wide muted small">History video yuklash uchun avval kinoni saqlang.</div>;

  async function pick(f: File) {
    setProgress(0);
    try { await up.mutateAsync({ id: movie!.id, file: f, onProgress: setProgress }); } finally { setProgress(null); }
  }

  return (
    <div className="wide history">
      <span className="field-label">History video</span>
      {movie.history_video_url
        ? <video src={movie.history_video_url} controls preload="metadata" />
        : <div className="muted small">Yuklanmagan{movie.history_file && <> · DLE yo‘li: <code>{movie.history_file}</code></>}</div>}
      <div className="img-actions">
        <button type="button" className="btn ghost sm" disabled={progress !== null} onClick={() => input.current?.click()}>
          {progress !== null ? `Yuklanmoqda… ${Math.round(progress * 100)}%` : movie.history_video ? 'Almashtirish' : 'Video yuklash (mp4)'}
        </button>
        {movie.history_video && (
          <button type="button" className="btn danger sm" disabled={del.isPending}
            onClick={() => confirm('History video o‘chirilsinmi?') && del.mutate({ id: movie.id })}>O‘chirish</button>
        )}
      </div>
      {progress !== null && <progress value={progress} max={1} />}
      {(up.error || del.error) && <div className="text-error small">{((up.error || del.error) as Error).message}</div>}
      <span className="muted small">Saqlab, saytlarga yuborilganda DLE history maydoniga yoziladi.</span>
      <input ref={input} type="file" accept="video/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
    </div>
  );
}
