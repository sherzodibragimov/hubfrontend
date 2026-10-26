import type { SiteResult } from '../api/types';

export default function SiteResults({ results, title }: { results: SiteResult[]; title?: string }) {
  if (!results.length) return null;
  const ok = results.every((r) => r.ok);
  return (
    <div className={`alert ${ok ? 'ok' : 'error'}`}>
      {title && <strong>{title}</strong>}
      <ul className="result-list">
        {results.map((r) => <li key={r.site_id}>{r.ok ? '✓' : '✗'} <b>{r.site_code}</b>: {r.message}</li>)}
      </ul>
    </div>
  );
}
