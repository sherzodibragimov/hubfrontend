import { useEffect, useState } from 'react';
import type { Movie, Site } from '../api/types';
import SitePicker from './SitePicker';

interface Props {
  movie: Movie; sites: Site[]; busy: boolean;
  onCancel: () => void; onConfirm: (siteIds: number[], unpublish: boolean) => void;
}

export default function DeleteDialog({ movie, sites, busy, onCancel, onConfirm }: Props) {
  const linked = movie.publications.filter((p) => p.status !== 'deleted').map((p) => p.site_id);
  const onetv = sites.find((s) => s.code === 'onetvuz');
  const initial = linked.length ? linked
    : movie.source_dle_id && onetv && !movie.publications.some((p) => p.site_id === onetv.id) ? [onetv.id] : [];
  const [selected, setSelected] = useState<number[]>(initial);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="card modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>«{movie.name || movie.title}» o‘chirilsinmi?</h3>
        <p className="muted">Avval belgilangan saytlardan o‘chiriladi. Hammasi muvaffaqiyatli bo‘lsa, kino Hub dan va uning rasmlari diskdan o‘chiriladi.</p>
        <SitePicker sites={sites} value={selected} onChange={setSelected} linked={linked} />
        {linked.some((id) => !selected.includes(id)) && (
          <div className="alert error small">Belgilanmagan bog‘langan saytlarda post qoladi va Hub bilan aloqasi uziladi.</div>
        )}
        <div className="actions end">
          <button type="button" className="btn ghost" onClick={onCancel}>Bekor qilish</button>
          <button type="button" className="btn danger solid" disabled={busy} onClick={() => onConfirm(selected, selected.length > 0)}>
            {busy ? 'O‘chirilmoqda…' : 'O‘chirish'}
          </button>
        </div>
      </div>
    </div>
  );
}
