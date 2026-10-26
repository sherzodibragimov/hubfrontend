import { useBatch, useCancelBatch } from '../api/sources';

export default function BatchProgress({ provider }: { provider: string }) {
  const { data } = useBatch(provider);
  const cancel = useCancelBatch();
  const b = data?.active ?? data?.recent;
  if (!b) return null;
  const running = b.status === 'running';

  return (
    <div className={`card batch ${running ? 'running' : b.status}`}>
      <div className="batch-head">
        <strong>#{b.id} {b.mode_label}</strong>
        <span className={`badge ${running ? 'pending' : b.status === 'done' ? 'synced' : 'error'}`}>{running ? 'Ishlayapti' : b.status}</span>
        {b.provider_code && <span className="chip">{b.provider_code}</span>}
        <span className="muted small">{b.done}/{b.total} · ok {b.ok} · xato {b.fail}{b.current_external_id ? ` · #${b.current_external_id}` : ''}</span>
        {running && (
          <button type="button" className="btn danger sm" disabled={cancel.isPending}
            onClick={() => confirm('Fon ishni to‘xtatasizmi?') && cancel.mutate()}>To‘xtatish</button>
        )}
      </div>
      <div className="bar"><div style={{ width: `${b.pct}%` }} /></div>
      <div className="muted small">{b.message}</div>
    </div>
  );
}
