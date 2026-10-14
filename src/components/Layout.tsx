import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Today', end: true },
  { to: '/personal', label: 'Personal' },
  { to: '/professional', label: 'Professional' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">Tracker</span>
        <nav className="app-nav">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
