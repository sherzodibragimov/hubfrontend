import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ActionResult, Page } from './types';

export interface Token { code: string; name: string; group: string; description: string; is_secret: boolean; is_set: boolean; preview: string; updated_at: string }
export interface LogRow { id: number; level: string; source: string; message: string; detail: string; is_read: boolean; created_at: string }
export interface AutofillJob {
  id: number; movie_id: number; movie_name: string; status: string; hub_year: string; vision_title: string;
  vision_year: number | null; year_ok: boolean; tmdb_id: number | null; media_type: string; match_title: string;
  match_year: string; match_score: number | null; imdb: string; kp: string; accept_fields: boolean;
  accept_poster: boolean; accept_poster_long: boolean; accept_cadres: boolean; old_poster: string; new_poster: string;
  error: string; updated_at: string;
}
export interface AutofillJobDetail extends AutofillJob {
  kp_id: string; new_poster_long: string; new_cadres: string[]; proposed_fields: Record<string, unknown>;
  proposed_editors: Record<string, string>; candidates: Record<string, unknown>[]; meta: Record<string, unknown>;
  images_applied: string;
}
export interface AutofillBatch { id: number; mode_label: string; status: string; total: number; done: number; ok: number; fail: number; pct: number; message: string; current_movie_id: number | null }

const qs = (p: Record<string, string>) => new URLSearchParams(Object.entries(p).filter(([, v]) => v !== '')).toString();
const post = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const useTokens = () => useQuery({ queryKey: ['tokens'], queryFn: () => api<Token[]>('/system/tokens') });
export function useSaveToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, value }: { code: string; value: string }) => api<Token>(`/system/tokens/${code}`, { method: 'PUT', body: JSON.stringify({ value }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tokens'] }),
  });
}
export function useSyncTokens() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => post<{ message: string }>('/system/tokens/sync'), onSuccess: () => qc.invalidateQueries({ queryKey: ['tokens'] }) });
}

export const useLogs = (p: Record<string, string>) => useQuery({
  queryKey: ['logs', p], queryFn: () => api<Page<LogRow>>(`/system/logs?${qs(p)}`), placeholderData: keepPreviousData,
});
export const useLogSummary = () => useQuery({
  queryKey: ['logs-summary'], queryFn: () => api<{ unread: Record<string, number>; sources: string[] }>('/system/logs/summary'), refetchInterval: 60_000,
});
export function useLogAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, ids, is_read, scope }: { kind: 'mark' | 'delete' | 'clear'; ids?: number[]; is_read?: boolean; scope?: 'read' | 'all' }) =>
      kind === 'clear' ? post(`/system/logs/clear?scope=${scope}`) : post(`/system/logs/${kind}`, { ids, is_read }),
    onSettled: () => { qc.invalidateQueries({ queryKey: ['logs'] }); qc.invalidateQueries({ queryKey: ['logs-summary'] }); },
  });
}

export const useAutofillJobs = (p: Record<string, string>) => useQuery({
  queryKey: ['af-jobs', p], queryFn: () => api<Page<AutofillJob>>(`/autofill/jobs?${qs(p)}`), placeholderData: keepPreviousData,
});
export const useAutofillSummary = () => useQuery({ queryKey: ['af-summary'], queryFn: () => api<Record<string, number>>('/autofill/jobs/summary') });
export const useAutofillJob = (id: number | null) => useQuery({ queryKey: ['af-job', id], queryFn: () => api<AutofillJobDetail>(`/autofill/jobs/${id}`), enabled: id != null });
export const useAutofillBatch = () => useQuery({
  queryKey: ['af-batch'], queryFn: () => api<{ active: AutofillBatch | null; recent: AutofillBatch | null }>('/autofill/batch'),
  refetchInterval: (q) => (q.state.data?.active ? 3000 : 20_000),
});

function useAfMutation<V = void, R = ActionResult>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => ['af-jobs', 'af-job', 'af-batch', 'af-summary', 'movies'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })) });
}
export const useAutofillRun = () => useAfMutation(({ ids, mode }: { ids: number[]; mode: string }) => post<ActionResult>('/autofill/run', { job_ids: ids, mode }));
export const useAutofillCancel = () => useAfMutation(() => post<ActionResult>('/autofill/batch/cancel'));
export const useAutofillEnqueue = () => useAfMutation(() => post<ActionResult>('/autofill/enqueue?limit=50'));
export const useAutofillSync = () => useAfMutation((ids: number[]) => post<ActionResult>('/autofill/sync', { job_ids: ids }));
export const useAutofillPatch = () => useAfMutation(({ id, ...b }: { id: number } & Partial<Pick<AutofillJob, 'tmdb_id' | 'media_type' | 'accept_fields' | 'accept_poster' | 'accept_poster_long' | 'accept_cadres'>>) =>
  api<AutofillJobDetail>(`/autofill/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(b) }));
