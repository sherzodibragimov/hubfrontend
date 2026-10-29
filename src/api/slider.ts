import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface SliderEntry {
  position: number; movie_id: number; name: string; year: string; serial: boolean; score: number; reason: string;
  backdrop_url: string; poster_url: string;
}
export interface SliderRule { movie_id: number; name: string; mode: 'pin' | 'block'; until: string | null }
export interface SiteSlider {
  site_id: number; code: string; name: string; size: number; profile: 'all' | 'family'; rebuild: boolean;
  built_at: string | null; items: SliderEntry[]; rules: SliderRule[];
}

export const useSliders = () => useQuery({
  queryKey: ['sliders'], queryFn: () => api<SiteSlider[]>('/sliders'),
  refetchInterval: (q) => (q.state.data?.some((s) => s.rebuild) ? 10_000 : false),
});
export function useSliderAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { site: number } & (
      | { kind: 'rebuild' } | { kind: 'conf'; size: number; profile: string }
      | { kind: 'rule'; movie_id: number; mode: 'pin' | 'block'; days?: number } | { kind: 'unrule'; movie_id: number })) =>
      a.kind === 'rebuild' ? api(`/sliders/${a.site}/rebuild`, { method: 'POST' })
        : a.kind === 'conf' ? api(`/sliders/${a.site}`, { method: 'PUT', body: JSON.stringify({ size: a.size, profile: a.profile }) })
          : a.kind === 'rule' ? api(`/sliders/${a.site}/rules`, { method: 'POST', body: JSON.stringify({ movie_id: a.movie_id, mode: a.mode, days: a.days }) })
            : api(`/sliders/${a.site}/rules/${a.movie_id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sliders'] }),
  });
}
