import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ActionResult, Page, SourceBatch, SourceItem, SourceItemDetail, SourceProvider, TrackedSeries } from './types';

const qs = (p: Record<string, string>) => new URLSearchParams(Object.entries(p).filter(([, v]) => v !== '')).toString();
const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const useProviders = () =>
  useQuery({ queryKey: ['src-providers'], queryFn: () => api<SourceProvider[]>('/sources/providers'), staleTime: 15_000 });

export const useSourceItems = (params: Record<string, string>) => useQuery({
  queryKey: ['src-items', params],
  queryFn: ({ signal }) => api<Page<SourceItem>>(`/sources/items?${qs(params)}`, { signal }),
  placeholderData: keepPreviousData,
});

export const useSourceItem = (id: number | null) =>
  useQuery({ queryKey: ['src-item', id], queryFn: () => api<SourceItemDetail>(`/sources/items/${id}`), enabled: id != null });

export function useBatch(provider: string) {
  return useQuery({
    queryKey: ['src-batch', provider],
    queryFn: () => api<{ active: SourceBatch | null; recent: SourceBatch | null }>(`/sources/batch?${qs({ provider })}`),
    refetchInterval: (q) => (q.state.data?.active ? 3000 : 20_000),
  });
}

export const useBatches = () => useQuery({ queryKey: ['src-batches'], queryFn: () => api<SourceBatch[]>('/sources/batches?limit=30') });

export const useTracked = (params: Record<string, string>) => useQuery({
  queryKey: ['src-tracked', params],
  queryFn: () => api<Page<TrackedSeries>>(`/sources/tracked?${qs(params)}`),
  placeholderData: keepPreviousData,
});

/** Barcha manba mutatsiyalari: tugagach ro‘yxat/batch keshini yangilaydi. */
function useSourceMutation<V = void>(fn: (v: V) => Promise<ActionResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => ['src-items', 'src-item', 'src-batch', 'src-batches', 'src-providers', 'src-tracked', 'movies']
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export const usePanelAction = () => useSourceMutation((b: {
  provider_code: string; action: string; external?: string; start_id?: number; end_id?: number; force?: boolean;
}) => post<ActionResult>('/sources/panel', b));
export const useItemAction = () => useSourceMutation(({ action, ids }: { action: 'rescrape' | 'promote_link' | 'promote_disk'; ids: number[] }) =>
  post<ActionResult>('/sources/items/action', { action, item_ids: ids }));
export const useRejectItems = () => useSourceMutation((ids: number[]) => post<ActionResult>('/sources/items/reject', { item_ids: ids }));
export const useSyncItems = () => useSourceMutation(({ ids, siteIds }: { ids: number[]; siteIds: number[] }) =>
  post<ActionResult>('/sources/items/sync', { item_ids: ids, site_ids: siteIds }));
export const useCancelBatch = () => useSourceMutation(() => post<ActionResult>('/sources/batch/cancel', {}));
export const useAnimeCheckNow = () => useSourceMutation(() => post<ActionResult>('/sources/anime/check-now', {}));
export const useTrackedCheck = () => useSourceMutation((ids: number[]) => post<ActionResult>('/sources/tracked/check', { tracked_ids: ids }));
export function useTrackedToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api<TrackedSeries>(`/sources/tracked/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['src-tracked'] }),
  });
}
