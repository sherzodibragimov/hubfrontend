import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { ApiError, upload } from './client';
import type { Category, DeleteResult, ImageKind, TmdbResult, TmdbSeason, Movie, MovieAction, MovieFields, MovieListItem, Page, Site, Stats, User } from './types';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<User>('/auth/me'), retry: false });
export const useStats = () => useQuery({ queryKey: ['stats'], queryFn: () => api<Stats>('/stats') });
export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories'), staleTime: 10 * 60_000 });
export const useSites = () =>
  useQuery({ queryKey: ['sites'], queryFn: () => api<Site[]>('/sites'), staleTime: 10 * 60_000 });

export function useMovies(params: Record<string, string>) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '')).toString();
  return useQuery({
    queryKey: ['movies', qs],
    queryFn: ({ signal }) => api<Page<MovieListItem>>(`/movies?${qs}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export const useMovie = (id: number | null) =>
  useQuery({ queryKey: ['movie', id], queryFn: () => api<Movie>(`/movies/${id}`), enabled: id != null });

export function useSaveMovie(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MovieFields) =>
      api<Movie>(id ? `/movies/${id}` : '/movies', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
    onSuccess: (m) => {
      qc.setQueryData(['movie', m.id], m);
      qc.invalidateQueries({ queryKey: ['movies'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

function useInvalidateLists() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['movies'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };
}

export function useSiteAction(kind: 'sync' | 'unpublish') {
  const qc = useQueryClient();
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: ({ id, siteIds }: { id: number; siteIds?: number[] }) =>
      api<MovieAction>(`/movies/${id}/${kind}`, { method: 'POST', body: JSON.stringify({ site_ids: siteIds ?? null }) }),
    onSuccess: (r) => {
      if (r.movie) qc.setQueryData(['movie', r.movie_id], r.movie);
      invalidate();
    },
  });
}

export function useBulkSync() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: ({ movieIds, siteIds }: { movieIds: number[]; siteIds?: number[] }) =>
      api<MovieAction[]>('/movies/bulk-sync', {
        method: 'POST', body: JSON.stringify({ movie_ids: movieIds, site_ids: siteIds?.length ? siteIds : null }),
      }),
    onSettled: invalidate,
  });
}

export function useDeleteMovie() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: async ({ id, siteIds, unpublish }: { id: number; siteIds: number[]; unpublish: boolean }) => {
      const qs = new URLSearchParams({ unpublish: String(unpublish) });
      siteIds.forEach((s) => qs.append('site_ids', String(s)));
      try {
        return await api<DeleteResult>(`/movies/${id}?${qs}`, { method: 'DELETE' });
      } catch (e) {
        // 502: saytlardan biri o‘chmadi — natijalarni qaytaramiz
        if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'results' in e.body) return e.body as DeleteResult;
        throw e;
      }
    },
    onSettled: invalidate,
  });
}

export const useTmdbImport = () => useMutation({
  mutationFn: (b: { tmdb_id: number; media_type: string; season: number }) =>
    api<TmdbResult>('/tmdb/import', { method: 'POST', body: JSON.stringify(b) }),
});

export const useTmdbSeasons = () => useMutation({
  mutationFn: (tmdb_id: number) =>
    api<{ seasons: TmdbSeason[] }>('/tmdb/seasons', { method: 'POST', body: JSON.stringify({ tmdb_id }) }),
});

/** Kino obyektini qaytaradigan media mutatsiyalari uchun umumiy keshlash. */
function useMovieMutation<V, R extends Movie | { movie: Movie }>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      const m = 'movie' in r ? r.movie : (r as Movie);
      qc.setQueryData(['movie', m.id], m);
      qc.invalidateQueries({ queryKey: ['movies'] });
    },
  });
}

export const useImagesFromUrls = () => useMovieMutation(({ id, images }: { id: number; images: Partial<Record<ImageKind, string>> }) =>
  api<{ applied: string[]; failed: string[]; movie: Movie }>(`/movies/${id}/images/from-urls`, { method: 'POST', body: JSON.stringify({ images }) }));

export const useUploadImage = () => useMovieMutation(({ id, kind, file }: { id: number; kind: ImageKind; file: File }) =>
  upload<Movie>(`/movies/${id}/images/${kind}`, file));

export const useDeleteImage = () => useMovieMutation(({ id, kind }: { id: number; kind: ImageKind }) =>
  api<Movie>(`/movies/${id}/images/${kind}`, { method: 'DELETE' }));

export const useUploadHistory = () => useMovieMutation(({ id, file, onProgress }: { id: number; file: File; onProgress?: (p: number) => void }) =>
  upload<Movie>(`/movies/${id}/history-video`, file, onProgress));

export const useDeleteHistory = () => useMovieMutation(({ id }: { id: number }) =>
  api<Movie>(`/movies/${id}/history-video`, { method: 'DELETE' }));
