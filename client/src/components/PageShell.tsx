import type { ReactNode } from 'react';
import './PageShell.css';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <div className="page-shell">
      <header className="page-header">
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}

export default PageShell;
