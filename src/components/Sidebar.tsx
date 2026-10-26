
import { useState } from 'react';
import type { Role } from '../lib';

export type NavigationItem = {
  id: string;
  label: string;
  icon: string;
};

type SidebarProps = {
  role: Role;
  activePage: string;
  onNavigate: (page: string) => void;
  onSignOut: () => void | Promise<void>;
  userName?: string;
  items: NavigationItem[];
};

const roleLabels: Record<Role, string> = {
  customer: 'Customer',
  business_owner: 'Business Owner',
  analyst: 'Market Analyst',
  admin: 'Administrator',
};

export default function Sidebar({
  role,
  activePage,
  onNavigate,
  onSignOut,
  userName,
  items,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigate(page: string) {
    onNavigate(page);
    setMobileOpen(false);
  }

  return (
    <>
      <header className="ml-mobile-header">
        <div className="ml-logo">
          <span className="ml-logo-icon">◈</span>
          MarketLens
        </div>

        <button
          type="button"
          className="ml-menu-toggle"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="ml-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`ml-sidebar ${mobileOpen ? 'ml-sidebar-open' : ''}`}
      >
        <div className="ml-sidebar-brand">
          <div className="ml-logo">
            <span className="ml-logo-icon">◈</span>
            MarketLens
          </div>
          <p>Local commerce intelligence</p>
        </div>

        <div className="ml-sidebar-section">WORKSPACE</div>

        <nav className="ml-navigation" aria-label="Account navigation">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ml-nav-item ${
                activePage === item.id ? 'active' : ''
              }`}
              onClick={() => navigate(item.id)}
            >
              <span className="ml-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="ml-sidebar-bottom">
          <div className="ml-account-card">
            <div className="ml-account-avatar">
              {(userName || 'U').charAt(0).toUpperCase()}
            </div>

            <div className="ml-account-details">
              <strong>{userName || 'My Account'}</strong>
              <span>{roleLabels[role]}</span>
            </div>
          </div>

          <button
            type="button"
            className="ml-signout"
            onClick={() => void onSignOut()}
          >
            <span aria-hidden="true">↪</span>
            Sign out
          </button>

          <p className="ml-location">
            Sant Tukaram Nagar · Pimpri
          </p>
        </div>
      </aside>
    </>
  );
}
