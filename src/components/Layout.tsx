import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '../api/client';
import { useMe } from '../api/hooks';
import { useLogSummary } from '../api/system';
import { applyTheme, getTheme, Theme } from '../lib/theme';
import Icon, { IconName } from './Icon';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Bosh sahifa', icon: 'home', end: true },
  { to: '/movies', label: 'Kinolar', icon: 'film' },
  { to: '/collections', label: 'To‘plamlar', icon: 'stack' },
  { to: '/radar', label: 'Radar', icon: 'activity' },
  { to: '/sources', label: 'Manbalar', icon: 'layers' },
  { to: '/autofill', label: 'Autofill', icon: 'sparkles' },
  { to: '/system', label: 'Tizim', icon: 'bell' },
  { to: '/settings', label: 'Sozlamalar', icon: 'settings' },
];

export default function Layout() {
  const { data: me } = useMe();
  const { data: logs } = useLogSummary();
  const unreadErrors = (logs?.unread.ERROR ?? 0) + (logs?.unread.CRITICAL ?? 0);
  const nav = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const [theme, setTheme] = useState<Theme>(getTheme);
  const [open, setOpen] = useState(false);
  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => setOpen(false), [loc.pathname]);
  const logout = () => { tokenStore.clear(); qc.clear(); nav('/login'); };

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-mark"><Icon name="tv" size={18} /></div>
          <div>OneTV <span>Hub</span></div>
          <button className="icon-btn only-mobile" onClick={() => setOpen((v) => !v)} aria-label="Menyu"><Icon name="menu" /></button>
        </div>
        <nav>
          <div className="nav-cap">Asosiy</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <Icon name={n.icon} /><span>{n.label}</span>
              {n.to === '/system' && unreadErrors > 0 && <span className="nav-badge">{unreadErrors}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="me">
            <div className="avatar">{(me?.username ?? '?').slice(0, 1).toUpperCase()}</div>
            <div className="me-text"><b>{me?.username}</b><small>{me?.is_superuser ? 'Superuser' : 'Muharrir'}</small></div>
          </div>
          <div className="foot-actions">
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Mavzu" title="Mavzuni almashtirish">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <button className="icon-btn" onClick={logout} aria-label="Chiqish" title="Chiqish"><Icon name="logout" /></button>
          </div>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}
