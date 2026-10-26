const KEY = 'onetv_theme';
export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  try { const t = localStorage.getItem(KEY); if (t === 'dark' || t === 'light') return t; } catch { /* ignore */ }
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}
