import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { categoriesApi, sitesApi, useDuplicates, usersApi } from '../api/admin';
import type { CategoryAdmin, SiteAdmin, UserAdmin } from '../api/admin';
import { useMe } from '../api/hooks';

const err = (e: unknown) => (e ? <div className="text-error small">{(e as Error).message}</div> : null);
const dt = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');

function SiteForm({ site, onDone }: { site?: SiteAdmin; onDone: () => void }) {
  const save = sitesApi.useSave();
  const [f, setF] = useState({
    code: site?.code ?? '', name: site?.name ?? '', is_active: site?.is_active ?? true, api_url: site?.api_url ?? '',
    api_key: '', public_base_url: site?.public_base_url ?? '', seo_brand: site?.seo_brand ?? '', notes: site?.notes ?? '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });
  return (
    <form className="card form-grid" onSubmit={async (e) => { e.preventDefault(); await save.mutateAsync({ id: site?.id, ...f }); onDone(); }}>
      <label>Kod<input value={f.code} onChange={set('code')} required pattern="[-a-zA-Z0-9_]+" disabled={!!site} /></label>
      <label>Nomi<input value={f.name} onChange={set('name')} required /></label>
      <label className="wide">DLE API URL (km_hub_api)<input value={f.api_url} onChange={set('api_url')} required type="url" /></label>
      <label>API kalit<input type="password" autoComplete="new-password" value={f.api_key} onChange={set('api_key')}
        placeholder={site?.api_key_set ? `${site.api_key} (bo‘sh = o‘zgarmaydi)` : 'bo‘sh = default token'} /></label>
      <label>Sayt manzili<input value={f.public_base_url} onChange={set('public_base_url')} type="url" placeholder="https://…" /></label>
      <label>SEO brand<input value={f.seo_brand} onChange={set('seo_brand')} placeholder="bo‘sh = domen" /></label>
      <label className="check"><input type="checkbox" checked={f.is_active} onChange={set('is_active')} /> Faol</label>
      <label className="wide">Izoh<textarea value={f.notes} onChange={set('notes')} rows={2} /></label>
      <div className="panel-row wide">
        <button className="btn primary" disabled={save.isPending}>Saqlash</button>
        <button type="button" className="btn ghost" onClick={onDone}>Bekor</button>
        {err(save.error)}
      </div>
    </form>
  );
}

function Sites({ canEdit }: { canEdit: boolean }) {
  const { data } = sitesApi.useList();
  const [edit, setEdit] = useState<SiteAdmin | 'new' | null>(null);
  return (<>
    {canEdit && !edit && <div className="panel-row" style={{ marginBottom: 10 }}><button type="button" className="btn primary sm" onClick={() => setEdit('new')}>+ Sayt qo‘shish</button></div>}
    {edit && <SiteForm site={edit === 'new' ? undefined : edit} onDone={() => setEdit(null)} />}
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Kod</th><th>Nomi</th><th>SEO brand</th><th>API</th><th>Nashrlar</th><th>Holat</th><th /></tr></thead>
        <tbody>{data?.map((s) => (
          <tr key={s.id}>
            <td><code>{s.code}</code></td>
            <td>{s.name}<div className="muted small">{s.public_base_url}</div></td>
            <td>{s.seo_brand || <span className="muted small">domen</span>}</td>
            <td className="small wrap">{s.api_url}<div className="muted">kalit: {s.api_key_set ? s.api_key : 'default'}</div></td>
            <td>{s.publications}</td>
            <td><span className={`badge ${s.is_active ? 'synced' : 'deleted'}`}>{s.is_active ? 'faol' : 'o‘chiq'}</span></td>
            <td>{canEdit && <button type="button" className="btn ghost sm" onClick={() => setEdit(s)}>Tahrirlash</button>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>);
}

function CategoryRow({ c, canEdit }: { c?: CategoryAdmin; canEdit: boolean }) {
  const save = categoriesApi.useSave();
  const remove = categoriesApi.useRemove();
  const [edit, setEdit] = useState(!c);
  const [f, setF] = useState({ dle_id: c?.dle_id ?? 0, name: c?.name ?? '', alt_name: c?.alt_name ?? '', parent_dle_id: c?.parent_dle_id ?? 0 });
  if (!edit && c) {
    return (
      <tr>
        <td>{c.dle_id}</td><td>{c.name}</td><td className="muted">{c.alt_name}</td><td>{c.parent_dle_id || '—'}</td><td>{c.movies}</td>
        <td>{canEdit && <div className="panel-row">
          <button type="button" className="btn ghost sm" onClick={() => setEdit(true)}>Tahrirlash</button>
          <button type="button" className="btn ghost sm" disabled={remove.isPending}
            onClick={() => window.confirm(`«${c.name}» o‘chirilsinmi? ${c.movies} ta kinodan bog‘lanish olinadi.`) && remove.mutate(c.id)}>O‘chirish</button>
        </div>}</td>
      </tr>
    );
  }
  const num = (k: 'dle_id' | 'parent_dle_id') => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  return (
    <tr>
      <td><input type="number" min={1} value={f.dle_id || ''} onChange={num('dle_id')} style={{ width: 80 }} /></td>
      <td><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></td>
      <td><input value={f.alt_name} onChange={(e) => setF({ ...f, alt_name: e.target.value })} /></td>
      <td><input type="number" min={0} value={f.parent_dle_id} onChange={num('parent_dle_id')} style={{ width: 80 }} /></td>
      <td>{c?.movies ?? 0}</td>
      <td><div className="panel-row">
        <button type="button" className="btn primary sm" disabled={save.isPending || !f.name || !f.dle_id}
          onClick={async () => { await save.mutateAsync({ id: c?.id, ...f }); if (c) setEdit(false); else setF({ dle_id: 0, name: '', alt_name: '', parent_dle_id: 0 }); }}>Saqlash</button>
        {c && <button type="button" className="btn ghost sm" onClick={() => setEdit(false)}>Bekor</button>}
        {err(save.error)}
      </div></td>
    </tr>
  );
}

function Categories({ canEdit }: { canEdit: boolean }) {
  const { data } = categoriesApi.useList();
  return (
    <div className="card table-wrap">
      <table>
        <thead><tr><th>DLE ID</th><th>Nomi</th><th>Alt nom</th><th>Ota</th><th>Kinolar</th><th /></tr></thead>
        <tbody>
          {canEdit && <CategoryRow canEdit />}
          {data?.map((c) => <CategoryRow key={c.id} c={c} canEdit={canEdit} />)}
        </tbody>
      </table>
    </div>
  );
}

function UserForm({ user, onDone }: { user?: UserAdmin; onDone: () => void }) {
  const save = usersApi.useSave();
  const [f, setF] = useState({
    username: user?.username ?? '', first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', email: user?.email ?? '',
    is_active: user?.is_active ?? true, is_staff: user?.is_staff ?? true, is_superuser: user?.is_superuser ?? false, password: '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <form className="card form-grid" onSubmit={async (e) => {
      e.preventDefault();
      await save.mutateAsync({ id: user?.id, ...f, password: f.password || undefined });
      onDone();
    }}>
      <label>Login<input value={f.username} onChange={set('username')} required autoComplete="off" autoCapitalize="none" /></label>
      <label>{user ? 'Yangi parol (bo‘sh = o‘zgarmaydi)' : 'Parol'}
        <input type="password" autoComplete="new-password" minLength={8} required={!user} value={f.password} onChange={set('password')} /></label>
      <label>Ism<input value={f.first_name} onChange={set('first_name')} /></label>
      <label>Familiya<input value={f.last_name} onChange={set('last_name')} /></label>
      <label>Email<input type="email" value={f.email} onChange={set('email')} /></label>
      <div className="panel-row wide">
        <label className="check"><input type="checkbox" checked={f.is_active} onChange={set('is_active')} /> Faol</label>
        <label className="check"><input type="checkbox" checked={f.is_staff} onChange={set('is_staff')} /> Panelga kira oladi</label>
        <label className="check"><input type="checkbox" checked={f.is_superuser} onChange={set('is_superuser')} /> Superuser</label>
      </div>
      <div className="panel-row wide">
        <button className="btn primary" disabled={save.isPending}>Saqlash</button>
        <button type="button" className="btn ghost" onClick={onDone}>Bekor</button>
        {err(save.error)}
      </div>
    </form>
  );
}

function Users() {
  const { data, error } = usersApi.useList();
  const [edit, setEdit] = useState<UserAdmin | 'new' | null>(null);
  if (error) return err(error);
  return (<>
    {!edit && <div className="panel-row" style={{ marginBottom: 10 }}><button type="button" className="btn primary sm" onClick={() => setEdit('new')}>+ Foydalanuvchi</button></div>}
    {edit && <UserForm user={edit === 'new' ? undefined : edit} onDone={() => setEdit(null)} />}
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Login</th><th>Ism</th><th>Huquq</th><th>Oxirgi kirish</th><th /></tr></thead>
        <tbody>{data?.map((u) => (
          <tr key={u.id}>
            <td><strong>{u.username}</strong><div className="muted small">{u.email}</div></td>
            <td>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
            <td className="small">
              {!u.is_active && <span className="badge deleted">o‘chiq</span>}{' '}
              {u.is_superuser ? <span className="badge synced">superuser</span> : u.is_staff ? <span className="badge pending">xodim</span> : <span className="muted">kira olmaydi</span>}
            </td>
            <td className="small muted">{dt(u.last_login)}</td>
            <td><button type="button" className="btn ghost sm" onClick={() => setEdit(u)}>Tahrirlash</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>);
}

function Duplicates() {
  const { data, isLoading } = useDuplicates();
  if (isLoading) return <div className="loader" />;
  if (!data?.length) return <div className="card muted">TMDB ID bir xil bo‘lgan kinolar yo‘q.</div>;
  return (<>
    <p className="muted small">TMDB ID bir xil bo‘lgan kinolar: {data.length} guruh. Ortiqchasini kino sahifasidan o‘chiring.</p>
    <div className="card table-wrap">
      <table>
        <thead><tr><th>TMDB</th><th>Nechta</th><th>Kinolar</th></tr></thead>
        <tbody>{data.map((g) => (
          <tr key={g.tmdb_id}>
            <td><code>{g.tmdb_id}</code></td>
            <td><strong className="text-warn">{g.count}</strong></td>
            <td>{g.movies.map((m) => (
              <div key={m.id} className="small">
                <Link to={`/movies/${m.id}`}>#{m.id} {m.name}</Link> <span className="muted">{m.year}{m.serial_status ? ' · serial' : ''}{m.source_dle_id ? ` · DLE ${m.source_dle_id}` : ''}{m.approve ? '' : ' · tasdiqlanmagan'}</span>
              </div>
            ))}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>);
}

export default function SettingsPage() {
  const [sp, setSp] = useSearchParams();
  const { data: me } = useMe();
  const su = !!me?.is_superuser;
  const tabs: [string, string][] = [['sites', 'Saytlar'], ['categories', 'Kategoriyalar'], ['duplicates', 'TMDB dublikatlar'], ...(su ? [['users', 'Foydalanuvchilar'] as [string, string]] : [])];
  const tab = sp.get('tab') ?? 'sites';
  return (
    <>
      <header className="page-head"><h2>Sozlamalar</h2></header>
      <div className="tabs">
        {tabs.map(([k, l]) => <button type="button" key={k} className={tab === k ? 'active' : ''} onClick={() => setSp({ tab: k })}>{l}</button>)}
      </div>
      {!su && tab !== 'duplicates' && <p className="muted small">Faqat ko‘rish — o‘zgartirish uchun superuser kerak.</p>}
      {tab === 'categories' ? <Categories canEdit={su} /> : tab === 'duplicates' ? <Duplicates /> : tab === 'users' && su ? <Users /> : <Sites canEdit={su} />}
    </>
  );
}
