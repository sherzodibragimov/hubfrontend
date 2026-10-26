export interface Category { id: number; dle_id: number; name: string; alt_name: string; parent_dle_id: number }
export interface Site { id: number; code: string; name: string; is_active: boolean }
export interface Image { id: number; kind: string; url: string; source_path: string }
export interface Publication {
  site_id: number; site_code: string; status: string; dle_post_id: number | null;
  last_error: string; last_synced_at: string | null; remote_url: string;
}
export interface MovieListItem {
  id: number; name: string; title: string; year: string; imdb: string; kp: string; tmdb_id: string;
  serial_status: boolean; approve: boolean; source_dle_id: number | null; published_at: string | null;
  poster: string; sites: string[];
}
export interface Page<T> { items: T[]; total: number; page: number; page_size: number }

export interface MovieFields {
  title: string; alt_name: string; short_story: string; full_story: string; meta_title: string;
  meta_descr: string; keywords: string; tags: string; name: string; altername: string; year: string;
  age: string; imdb: string; kp: string; genres: string; directors: string; actors: string;
  countries: string; time: string; quality: string; translator: string; tmdb_id: string; tmdb_type: string;
  last_season: string; last_episode: string; all_season: string; all_episode: string; num_episodes: string;
  serial_status: boolean; serial_life: string; trailer: string; media_player: string; video_links: string;
  mover_iframe: string; okru: string; lumex: string; approve: boolean; allow_main: boolean;
  published_at: string | null; author: string; category_ids: number[];
}
export interface Movie extends MovieFields {
  id: number; source_dle_id: number | null; history_file: string; history_video: string; history_video_url: string; news_read: number; rating: number;
  vote_num: number; created_at: string; updated_at: string; categories: Category[]; images: Image[];
  publications: Publication[];
}
export interface Stats {
  movies: number; serials: number; unapproved: number; no_poster: number;
  publications: Record<string, Record<string, number>>;
}
export interface User { id: number; username: string; is_superuser: boolean }
export interface SiteResult { site_id: number; site_code: string; ok: boolean; message: string; dle_post_id: number | null }
export interface MovieAction { movie_id: number; results: SiteResult[]; movie: Movie | null }
export interface DeleteResult { deleted: boolean; images_removed: number; results: SiteResult[] }
export type ImageKind = 'poster' | 'poster-long' | 'cadre1' | 'cadre2' | 'cadre3';
export interface TmdbResult {
  ok: boolean; tmdb_id: number; media_type: 'movie' | 'tv';
  fields: Partial<Record<keyof MovieFields, string | boolean>>;
  editors: { short_story?: string; full_story?: string };
  title_suggest: string; images: Partial<Record<ImageKind, string>>;
  meta: Record<string, unknown>;
}
export interface TmdbSeason { number: number; name: string; episode_count: number; air_date: string; poster: string }
export interface SourceProvider {
  id: number; code: string; name: string; base_url: string; is_active: boolean; last_checked_id: number;
  last_daily_check_at: string | null; last_check_report: string; counts: Record<string, number>;
}
export interface SourceItem {
  id: number; provider_code: string; external_id: number; external_key: string; title: string; status: string;
  source_type: string; is_series: boolean; video_mode: string; local_video_url: string; movie_id: number | null;
  last_error: string; poster_url: string; video_source_url: string; created_at: string; updated_at: string;
}
export interface SourceItemDetail extends SourceItem { raw: Record<string, unknown>; legacy_dle_post_id: number | null }
export interface SourceBatch {
  id: number; provider_code: string | null; mode: string; mode_label: string; status: string; total: number;
  done: number; ok: number; fail: number; pct: number; message: string; current_external_id: number | null;
  started_at: string; finished_at: string | null; updated_at: string;
}
export interface TrackedSeries {
  id: number; provider_code: string; external_id: number; external_key: string; title: string; last_episode: string;
  legacy_dle_post_id: number | null; movie_id: number | null; is_active: boolean; updated_at: string;
}
export interface ActionMessage { level: 'success' | 'info' | 'warning' | 'error'; text: string }
export interface ActionResult { ok: boolean; messages: ActionMessage[] }
export interface SeasonInfo { id: number; number: number; title: string; overview: string; air_date: string | null; poster_url: string }
export interface Episode {
  id: number; season: number; number: number; title: string; title_original: string; overview: string;
  overview_original: string; air_date: string | null; runtime: number | null; still_url: string;
  still_source_url: string; video_url: string; meta_title: string; meta_descr: string;
}
export interface EpisodesData { seasons: SeasonInfo[]; episodes: Episode[]; warnings?: string[] }
