import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface Short {
  id: number; title: string; video_url: string; movie_id: number | null; movie_name: string; poster_url: string;
  site_ids: number[]; is_active: boolean; sort_order: number; views: number; created_at: string;
}

export const useShorts = (q: string, page: number) => useQuery({
  queryKey: ['shorts', q, page],
  queryFn: () => api<{ total: number; items: Short[] }>(`/shorts?${new URLSearchParams({ q, page: String(page) })}`),
});

export function useShortAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { kind: 'create'; form: FormData } | { kind: 'patch'; id: number; data: Record<string, unknown> } | { kind: 'delete'; id: number }) =>
      a.kind === 'create' ? api('/shorts', { method: 'POST', body: a.form })
        : a.kind === 'patch' ? api(`/shorts/${a.id}`, { method: 'PATCH', body: JSON.stringify(a.data) })
          : api(`/shorts/${a.id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shorts'] }),
  });
}
