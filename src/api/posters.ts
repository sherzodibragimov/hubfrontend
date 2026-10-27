import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface PosterUz {
  status: 'pending' | 'queued' | 'done' | 'no_textless' | 'failed'; url: string; title: string; note: string; applied: boolean;
  current_url: string; original_url: string;
  style: { font?: string; position?: string; color?: string; case?: string; model?: string };
  override: { font?: string; position?: string; color?: string; case?: string };
}
export const FONTS = ['bebas', 'anton', 'oswald', 'montserrat', 'cinzel', 'playfair', 'bangers', 'creepster', 'russo', 'blackops', 'marker', 'lobster'];

const key = (id: number) => ['poster-uz', id];
export const usePosterUz = (id: number) => useQuery({
  queryKey: key(id), queryFn: () => api<PosterUz>(`/movies/${id}/poster-uz`),
  refetchInterval: (q) => (q.state.data?.status === 'queued' ? 15_000 : false),
});
export function usePosterAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { kind: 'apply' | 'revert' } | { kind: 'restyle'; body: Record<string, string> }) =>
      a.kind === 'restyle' ? api<PosterUz>(`/movies/${id}/poster-uz`, { method: 'PUT', body: JSON.stringify(a.body) })
        : api<PosterUz>(`/movies/${id}/poster-uz/${a.kind}`, { method: 'POST' }),
    onSuccess: (d) => { qc.setQueryData(key(id), d); qc.invalidateQueries({ queryKey: ['movie', id] }); qc.invalidateQueries({ queryKey: ['posters'] }); },
  });
}
export interface GalleryItem { movie_id: number; name: string; year: string; url: string; current_url: string; font: string }
export const useGallery = (applied: string, page: number) => useQuery({
  queryKey: ['posters', applied, page], placeholderData: keepPreviousData,
  queryFn: () => api<{ total: number; counts: Record<string, number>; items: GalleryItem[] }>(`/posters-uz?page=${page}${applied ? `&applied=${applied}` : ''}`),
});
export function useBulkApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => api<{ applied: number }>('/posters-uz/apply', { method: 'POST', body: JSON.stringify({ movie_ids: ids }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posters'] }),
  });
}
