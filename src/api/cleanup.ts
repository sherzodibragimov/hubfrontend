import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface CleanupItem { movie_id: number; name: string; year: string; status: 'candidate' | 'keep'; views_90d: number; delete_at: string | null; days_left: number }
export interface CleanupData {
  rules: { min_views: number; window_days: number; min_age_days: number; grace_days: number };
  sites: { code: string; name: string; first: string | null; last: string | null; ready: boolean }[];
  items: CleanupItem[];
}
export const useCleanup = () => useQuery({ queryKey: ['cleanup'], queryFn: () => api<CleanupData>('/cleanup') });
export function useKeep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { id: number; keep: boolean }) => api(`/cleanup/${a.id}/keep`, { method: a.keep ? 'POST' : 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cleanup'] }),
  });
}
