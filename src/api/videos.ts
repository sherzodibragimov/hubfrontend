import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface Candidate { item_id: number; provider: string; title: string; status: string }
export interface BrokenVideo {
  movie_id: number; name: string; year: string; serial: boolean; broken: number; total: number;
  sample: string; candidates: Candidate[]; checked_at: string;
}
export const useBrokenVideos = () => useQuery({ queryKey: ['broken-videos'], queryFn: () => api<BrokenVideo[]>('/videos/broken') });
export function useRedownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { movie_id: number; item_id: number }) => api<{ message?: string }>('/videos/redownload', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broken-videos'] }),
  });
}
