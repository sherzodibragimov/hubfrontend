import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, upload } from './client';
import type { CastRow, Person } from './types';

const key = (movieId: number) => ['cast', movieId];
const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

export const useCast = (movieId: number) => useQuery({ queryKey: key(movieId), queryFn: () => api<CastRow[]>(`/movies/${movieId}/cast`) });

export function useImportCast(movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { max_cast: number; force: boolean }) => api<CastRow[]>(`/movies/${movieId}/cast/tmdb`, json('POST', b)),
    onSuccess: (d) => qc.setQueryData(key(movieId), d),
  });
}

function usePatchPerson(movieId: number) {
  const qc = useQueryClient();
  return (p: Person) => qc.setQueryData<CastRow[]>(key(movieId), (d) => d?.map((c) => (c.person.id === p.id ? { ...c, person: p } : c)));
}

export function useSavePerson(movieId: number) {
  const patch = usePatchPerson(movieId);
  return useMutation({
    mutationFn: ({ id, ...b }: Pick<Person, 'id' | 'name' | 'biography' | 'place_of_birth' | 'known_for'>) => api<Person>(`/people/${id}`, json('PUT', b)),
    onSuccess: patch,
  });
}

export function useUploadPhoto(movieId: number) {
  const patch = usePatchPerson(movieId);
  return useMutation({ mutationFn: ({ id, file }: { id: number; file: File }) => upload<Person>(`/people/${id}/photo`, file), onSuccess: patch });
}

export function useSaveCharacter(movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, character_uz }: { id: number; character_uz: string }) => api<CastRow[]>(`/movie-cast/${id}`, json('PUT', { character_uz })),
    onSuccess: (d) => qc.setQueryData(key(movieId), d),
  });
}

export function useRemoveCast(movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/movie-cast/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => qc.setQueryData<CastRow[]>(key(movieId), (d) => d?.filter((c) => c.id !== id)),
  });
}
