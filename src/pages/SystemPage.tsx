import { Fragment, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMe } from '../api/hooks';
import { useLogAction, useLogs, useLogSummary, useSaveToken, useSyncTokens, useTokens } from '../api/system';
import type { Token } from '../api/system';
import { useDebounce } from '../hooks/useDebounce';

function TokenRow({ t, canEdit }: { t: Token; canEdit: boolean }) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState('');
  const save = useSaveToken();
  return (
    <tr>
      <td><strong>{t.name}</strong><div className="muted small">{t.code}</div></td>
      <td className="wrap small muted">{t.description}</td>
      <td>{t.is_set ? <code className="small">{t.preview}</code> : <span className="muted small">bo‘sh (.env ishlatiladi)</span>}</td>
      <td>
        {edit ? (
          <div className="panel-row">
            <input type={t.is_secret ? 'password' : 'text'} autoComplete="off" value={value} placeholder="Yangi qiymat (bo‘sh = .env)" onChange={(e) => setValue(e.target.value)} />
            <button type="button" className="btn primary sm" disabled={save.isPending}
              onClick={async () => { await save.mutateAsync({ code: t.code, value }); setEdit(false); setValue(''); }}>Saqlash</button>
            <button type="button" className="btn ghost sm" onClick={() => { setEdit(false); setValue(''); }}>Bekor</button>
          </div>
        ) : canEdit && <button type="button" className="btn ghost sm" onClick={() => setEdit(true)}>O‘zgartirish</button>}
        {save.error && <div className="text-error small">{(save.error as Error).message}</div>}
      </td>
    </tr>
  );
}

function Tokens() {
  const { data } = useTokens();
  const { data: me } = useMe();
  const sync = useSyncTokens();
  const groups = [...new Set(data?.map((t) => t.group))];
  return (<>
    <div className="panel-row" style={{ marginBottom: 10 }}>
      <span className="muted small">API kalitlari. Bo‘sh bo‘lsa .env dagi qiymat ishlatiladi. Qiymatlar maskalangan.</span>
      {me?.is_superuser && <button type="button" className="btn ghost sm" disabled={sync.isPending} onClick={() => sync.mutate()}>Katalogni sync qilish</button>}
      {sync.data && <span className="text-ok small">{sync.data.message}</span>}
    </div>
    {groups.map((g) => (
      <div key={g} className="card table-wrap" style={{ marginBottom: 12 }}>
        <table><thead><tr><th colSpan={4}>{g}</th></tr></thead>
          <tbody>{data!.filter((t) => t.group === g).map((t) => <TokenRow key={t.code} t={t} canEdit={!!me?.is_superuser} />)}</tbody></table>
      </div>
    ))}
  </>);
}

const LEVEL_CLS: Record<string, string> = { ERROR: 'error', CRITICAL: 'error', WARNING: 'pending', INFO: 'synced', DEBUG: 'deleted' };

function Logs() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 350);
  const [open, setOpen] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { data: me } = useMe();
  const page = Number(sp.get('page') ?? 1);
  const p = { level: sp.get('level') ?? '', source: sp.get('source') ?? '', is_read: sp.get('is_read') ?? '', q: dq, page: String(page), page_size: '50' };
  const { data, isFetching } = useLogs(p);
  const { data: summary } = useLogSummary();
  const act = useLogAction();
  const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1;
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };
  const ids = [...selected];
  const done = () => setSelected(new Set());

  return (<>
    <div className="filters">
      <input className="search" placeholder="Xabar yoki traceback…" value={q} onChange={(e) => setQ(e.target.value)} />
      <select value={p.level} onChange={(e) => set('level', e.target.value)}>
        <option value="">Daraja</option>{['ERROR', 'CRITICAL', 'WARNING', 'INFO', 'DEBUG'].map((l) => <option key={l} value={l}>{l}{summary?.unread[l] ? ` (${summary.unread[l]} yangi)` : ''}</option>)}
      </select>
      <select value={p.source} onChange={(e) => set('source', e.target.value)}>
        <option value="">Manba</option>{summary?.sources.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={p.is_read} onChange={(e) => set('is_read', e.target.value)}>
        <option value="">Hammasi</option><option value="false">O‘qilmagan</option><option value="true">O‘qilgan</option>
      </select>
      <button type="button" className="btn ghost sm" disabled={act.isPending} onClick={() => confirm('O‘qilgan loglar o‘chirilsinmi?') && act.mutate({ kind: 'clear', scope: 'read' })}>O‘qilganlarni tozalash</button>
      {me?.is_superuser && <button type="button" className="btn danger sm" disabled={act.isPending} onClick={() => confirm('BARCHA loglar o‘chirilsinmi?') && act.mutate({ kind: 'clear', scope: 'all' })}>Hammasini tozalash</button>}
    </div>
    {selected.size > 0 && (
      <div className="card bulk-bar">
        <strong>{selected.size} ta</strong>
        <button className="btn ghost sm" onClick={() => act.mutate({ kind: 'mark', ids, is_read: true }, { onSuccess: done })}>O‘qilgan</button>
        <button className="btn ghost sm" onClick={() => act.mutate({ kind: 'mark', ids, is_read: false }, { onSuccess: done })}>O‘qilmagan</button>
        <button className="btn danger sm" onClick={() => confirm('O‘chirilsinmi?') && act.mutate({ kind: 'delete', ids }, { onSuccess: done })}>O‘chirish</button>
      </div>
    )}
    <div className={`card table-wrap ${isFetching ? 'fetching' : ''}`}>
      <table>
        <thead><tr><th className="sel"></th><th>Vaqt</th><th>Daraja</th><th>Manba</th><th>Xabar</th></tr></thead>
        <tbody>{data?.items.map((l) => (<Fragment key={l.id}>
          <tr className={l.is_read ? 'muted' : ''}>
            <td className="sel"><input type="checkbox" checked={selected.has(l.id)}
              onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n; })} /></td>
            <td className="small">{new Date(l.created_at).toLocaleString()}</td>
            <td><span className={`badge ${LEVEL_CLS[l.level] ?? ''}`}>{l.level}</span></td>
            <td className="small">{l.source}</td>
            <td className="wrap"><button type="button" className="as-btn" onClick={() => {
              setOpen(open === l.id ? null : l.id);
              if (!l.is_read) act.mutate({ kind: 'mark', ids: [l.id], is_read: true });
            }}>{l.message.slice(0, 220)}</button></td>
          </tr>
          {open === l.id && <tr><td colSpan={5}><pre className="pre">{l.message}{l.detail ? `\n\n${l.detail}` : ''}</pre></td></tr>}
        </Fragment>))}
        {data && !data.items.length && <tr><td colSpan={5} className="empty">Log yo‘q</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="pager">
      <button className="btn ghost sm" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>← Oldingi</button>
      <span>{page} / {pages}</span>
      <button className="btn ghost sm" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>Keyingi →</button>
    </div>
  </>);
}

export default function SystemPage() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') ?? 'logs';
  return (
    <>
      <header className="page-head"><h2>Tizim</h2></header>
      <div className="tabs">
        {[['logs', 'Loglar'], ['tokens', 'Tokenlar']].map(([k, l]) => (
          <button type="button" key={k} className={tab === k ? 'active' : ''} onClick={() => setSp({ tab: k })}>{l}</button>
        ))}
      </div>
      {tab === 'tokens' ? <Tokens /> : <Logs />}
    </>
  );
}
