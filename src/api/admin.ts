import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ActionResult } from './types';

export interface SiteAdmin {
  id: number; code: string; name: string; is_active: boolean; api_url: string; api_key: string; api_key_set: boolean;
  public_base_url: string; seo_brand: string; notes: string; publications: number;
}
export interface CategoryAdmin { id: number; dle_id: number; name: string; alt_name: string; parent_dle_id: number; movies: number }
export interface UserAdmin {
  id: number; username: string; first_name: string; last_name: string; email: string; is_active: boolean;
  is_staff: boolean; is_superuser: boolean; last_login: string | null; date_joined: string | null;
}
export interface DupGroup { tmdb_id: string; count: number; movies: { id: number; name: string; year: string; imdb: string; kp: string; serial_status: boolean; approve: boolean; source_dle_id: number | null }[] }

const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

function crud<T extends { id: number }>(key: string, path: string) {
  const useList = () => useQuery({ queryKey: [key], queryFn: () => api<T[]>(path) });
  const useSave = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...body }: Partial<T> & { id?: number; password?: string }) =>
        api<T>(id ? `${path}/${id}` : path, json(id ? 'PUT' : 'POST', body)),
      onSuccess: () => { qc.invalidateQueries({ queryKey: [key] }); qc.invalidateQueries({ queryKey: [key.replace('admin-', '')] }); },
    });
  };
  const useRemove = () => {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (id: number) => api<void>(`${path}/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: [key] }) });
  };
  return { useList, useSave, useRemove };
}

export const sitesApi = crud<SiteAdmin>('admin-sites', '/admin/sites');
export const categoriesApi = crud<CategoryAdmin>('admin-categories', '/admin/categories');
export const usersApi = crud<UserAdmin>('admin-users', '/admin/users');
export const useDuplicates = () => useQuery({ queryKey: ['admin-dups'], queryFn: () => api<DupGroup[]>('/admin/duplicates') });
export const useAutofillQueue = () => useMutation({
  mutationFn: (movie_ids: number[]) => api<ActionResult>('/admin/autofill-queue', json('POST', { movie_ids })),
});
