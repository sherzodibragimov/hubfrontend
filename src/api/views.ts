import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface ViewsItem { movie_id: number; name: string; year: string; views: number; prev: number; growth: number | null; sites: Record<string, number> }
export interface ViewsData { days: number; sites: { code: string; name: string; views: number }[]; items: ViewsItem[] }
export const useViewsTop = (days: number) =>
  useQuery({ queryKey: ['views-top', days], queryFn: () => api<ViewsData>(`/views/top?days=${days}`) });
