import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '../api/client';
import { useMe } from '../api/hooks';
import { useLogSummary } from '../api/system';

export default function Layout() {
  const { data: me } = useMe();
  const { data: logs } = useLogSummary();
  const unreadErrors = (logs?.unread.ERROR ?? 0) + (logs?.unread.CRITICAL ?? 0);
  const nav = useNavigate();
  const qc = useQueryClient();
  const logout = () => { tokenStore.clear(); qc.clear(); nav('/login'); };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">OneTV <span>Hub</span></div>
        <nav>
          <NavLink to="/" end>Bosh sahifa</NavLink>
          <NavLink to="/movies">Kinolar</NavLink>
          <NavLink to="/sources">Manbalar</NavLink>
          <NavLink to="/autofill">Autofill</NavLink>
          <NavLink to="/system">Tizim {unreadErrors > 0 && <span className="nav-badge">{unreadErrors}</span>}</NavLink>
          <NavLink to="/settings">Sozlamalar</NavLink>
        </nav>
        <div className="sidebar-foot">
          <span>{me?.username}</span>
          <button className="btn ghost sm" onClick={logout}>Chiqish</button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}
