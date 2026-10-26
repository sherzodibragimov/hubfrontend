const LABELS: Record<string, string> = { synced: 'Sinxron', pending: 'Kutilmoqda', error: 'Xato', deleted: 'O‘chirilgan' };

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{LABELS[status] ?? status}</span>;
}
