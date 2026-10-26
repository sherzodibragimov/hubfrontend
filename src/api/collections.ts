import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, upload } from './client';
import type { MovieListItem, Page } from './types';

export type CollectionKind = 'tmdb' | 'company' | 'keyword' | 'country' | 'manual';
export interface CollectionRow {
  id: number; kind: CollectionKind; tmdb_id: number | null; name: string; name_original: string; overview: string;
  overview_original: string; is_published: boolean; auto_sync: boolean; poster_url: string; backdrop_url: string;
  movie_count: number; missing_count: number; code: string; media: '' | 'movie' | 'tv';
}
export interface CollectionMovie { movie_id: number; name: string; year: string; poster: string; serial: boolean; added: 'auto' | 'manual' | 'excluded'; ord: number }
export interface CollectionDetail extends CollectionRow {
  movies: CollectionMovie[]; excluded: CollectionMovie[];
  missing: { tmdb_id: number; title: string; year: string; poster: string }[];
}
export interface TmdbHit { id: number; name: string; country: string; logo: string }

export const KIND_LABEL: Record<CollectionKind, string> = { tmdb: 'Franshiza', company: 'Studiya', keyword: 'Mavzu', country: 'Davlat', manual: 'Qo‘lda' };

const json = (method: string, body?: unknown) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
const dkey = (id: number) => ['collection', id];

export const useCollections = (p: { q: string; kind: string }) => useQuery({
  queryKey: ['collections', p], placeholderData: keepPreviousData,
  queryFn: () => api<CollectionRow[]>(`/collections?${new URLSearchParams(p)}`),
});
export const useCollection = (id: number) => useQuery({ queryKey: dkey(id), queryFn: () => api<CollectionDetail>(`/collections/${id}`) });
export const useTmdbSearch = (what: 'company' | 'keyword' | 'collection', q: string) => useQuery({
  queryKey: ['tmdb-search', what, q], enabled: q.trim().length >= 2, staleTime: 60_000,
  queryFn: () => api<TmdbHit[]>(`/tmdb/search/${what}?q=${encodeURIComponent(q.trim())}`),
});
export const useMovieSearch = (q: string) => useQuery({
  queryKey: ['movie-search', q], enabled: q.trim().length >= 2, staleTime: 30_000,
  queryFn: () => api<Page<MovieListItem>>(`/movies?q=${encodeURIComponent(q.trim())}&page_size=12`),
});

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { kind: CollectionKind; tmdb_id?: number; name?: string; code?: string; media?: string }) => api<CollectionDetail>('/collections', json('POST', b)),
    onSuccess: (d) => { qc.setQueryData(dkey(d.id), d); qc.invalidateQueries({ queryKey: ['collections'] }); },
  });
}

/** Tafsilot sahifasidagi barcha amallar — javob doim yangilangan to‘plam. */
export function useCollectionAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { kind: 'update'; body: Pick<CollectionRow, 'name' | 'overview' | 'is_published' | 'auto_sync'> }
      | { kind: 'sync' } | { kind: 'add' | 'remove'; movieId: number } | { kind: 'order'; ids: number[] }
      | { kind: 'image'; which: 'poster' | 'backdrop'; file: File }) => {
      const base = `/collections/${id}`;
      switch (a.kind) {
        case 'update': return api<CollectionDetail>(base, json('PUT', a.body));
        case 'sync': return api<CollectionDetail>(`${base}/sync`, json('POST'));
        case 'add': return api<CollectionDetail>(`${base}/movies/${a.movieId}`, json('POST'));
        case 'remove': return api<CollectionDetail>(`${base}/movies/${a.movieId}`, { method: 'DELETE' });
        case 'order': return api<CollectionDetail>(`${base}/order`, json('PUT', { movie_ids: a.ids }));
        case 'image': return upload<CollectionDetail>(`${base}/image/${a.which}`, a.file);
      }
    },
    onSuccess: (d) => { qc.setQueryData(dkey(id), d); qc.invalidateQueries({ queryKey: ['collections'] }); },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
}

export interface SimilarData { in_db: { movie_id: number; name: string; year: string; poster: string }[]; missing: { tmdb_id: number; title: string; year: string; poster: string }[] }
export interface TmdbInfo {
  title_ru: string; title_original: string; alt_titles: string[]; age: string; trailers: { key: string; lang: string; name: string }[];
  countries: string[]; original_language: string; release_date: string | null; collection_id: number | null; fetched_at: string;
}
export interface RadarItem {
  tmdb_id: number; media: 'movie' | 'tv'; title: string; original: string; date: string; rating: number; votes: number;
  popularity: number; country: string; overview: string; poster: string; movie_id: number | null;
}
export const useSimilar = (movieId: number) => useQuery({ queryKey: ['similar', movieId], queryFn: () => api<SimilarData>(`/movies/${movieId}/similar`) });
export const useTmdbInfo = (movieId: number) => useQuery({ queryKey: ['tmdb-info', movieId], queryFn: () => api<TmdbInfo | null>(`/movies/${movieId}/tmdb-info`) });
export function useRefreshTags(movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ collections: number[] }>(`/movies/${movieId}/tmdb-tags`, { method: 'POST' }),
    onSuccess: () => ['similar', 'tmdb-info', 'movie'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}
export const useRadar = (which: string) => useQuery({ queryKey: ['radar', which], staleTime: 600_000, queryFn: () => api<RadarItem[]>(`/tmdb/radar/${which}`) });
