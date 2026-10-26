import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, upload } from './client';
import type { Episode, EpisodesData, SeasonInfo } from './types';

const key = (movieId: number) => ['episodes', movieId];
const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const useEpisodes = (movieId: number) =>
  useQuery({ queryKey: key(movieId), queryFn: () => api<EpisodesData>(`/movies/${movieId}/episodes`) });

function useSetAll(movieId: number) {
  const qc = useQueryClient();
  return (d: EpisodesData) => qc.setQueryData(key(movieId), d);
}

function usePatchEpisode(movieId: number) {
  const qc = useQueryClient();
  return (e: Episode) => qc.setQueryData<EpisodesData>(key(movieId), (d) =>
    d && { ...d, episodes: d.episodes.map((x) => (x.id === e.id ? e : x)) });
}

export function useImportEpisodes(movieId: number) {
  const setAll = useSetAll(movieId);
  return useMutation({
    mutationFn: (b: { season: number; translate: boolean; images: boolean; map_videos: boolean; overwrite: boolean }) =>
      post<EpisodesData>(`/movies/${movieId}/episodes/tmdb`, b),
    onSuccess: setAll,
  });
}

export function useEpisodesFromLinks(movieId: number) {
  const setAll = useSetAll(movieId);
  return useMutation({ mutationFn: (season: number) => post<EpisodesData>(`/movies/${movieId}/episodes/from-links`, { season }), onSuccess: setAll });
}

export function useSaveEpisode(movieId: number) {
  const patch = usePatchEpisode(movieId);
  return useMutation({
    mutationFn: ({ id, ...b }: Pick<Episode, 'id' | 'title' | 'overview' | 'air_date' | 'runtime' | 'video_url' | 'meta_title' | 'meta_descr'>) =>
      api<Episode>(`/episodes/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
    onSuccess: patch,
  });
}

export function useRegenerateSeo(movieId: number) {
  const patch = usePatchEpisode(movieId);
  return useMutation({ mutationFn: (id: number) => post<Episode>(`/episodes/${id}/regenerate-seo`, {}), onSuccess: patch });
}

export function useUploadStill(movieId: number) {
  const patch = usePatchEpisode(movieId);
  return useMutation({ mutationFn: ({ id, file }: { id: number; file: File }) => upload<Episode>(`/episodes/${id}/still`, file), onSuccess: patch });
}

export function useDeleteEpisode(movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/episodes/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => qc.setQueryData<EpisodesData>(key(movieId), (d) => d && { ...d, episodes: d.episodes.filter((e) => e.id !== id) }),
  });
}

export function useSaveSeason(movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ number, title, overview }: { number: number; title: string; overview: string }) =>
      api<SeasonInfo>(`/movies/${movieId}/seasons/${number}`, { method: 'PUT', body: JSON.stringify({ title, overview }) }),
    onSuccess: (s) => qc.setQueryData<EpisodesData>(key(movieId), (d) => d && { ...d, seasons: d.seasons.map((x) => (x.id === s.id ? s : x)) }),
  });
}

export function useDeleteSeason(movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: number) => api<void>(`/movies/${movieId}/seasons/${number}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(movieId) }),
  });
}
