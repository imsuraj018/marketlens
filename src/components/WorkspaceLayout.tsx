
import type { ReactNode } from 'react';
import type { Role } from '../lib';

import Sidebar, {
  type NavigationItem,
} from './Sidebar';

type WorkspaceLayoutProps = {
  role: Role;
  userName?: string;
  activePage: string;
  pageTitle: string;
  pageDescription?: string;
  items: NavigationItem[];
  onNavigate: (page: string) => void;
  onSignOut: () => void | Promise<void>;
  children: ReactNode;
};

export default function WorkspaceLayout({
  role,
  userName,
  activePage,
  pageTitle,
  pageDescription,
  items,
  onNavigate,
  onSignOut,
  children,
}: WorkspaceLayoutProps) {
  return (
    <div className="ml-workspace">
      <Sidebar
        role={role}
        userName={userName}
        activePage={activePage}
        items={items}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      />

      <main className="ml-main">
        <header className="ml-page-header">
          <div>
            <span className="ml-eyebrow">MARKETLENS WORKSPACE</span>
            <h1>{pageTitle}</h1>

            {pageDescription && (
              <p>{pageDescription}</p>
            )}
          </div>

          <div className="ml-header-badge">
            Sant Tukaram Nagar
          </div>
        </header>

        <div className="ml-page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
