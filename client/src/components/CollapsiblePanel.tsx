import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import './CollapsiblePanel.css';

interface CollapsiblePanelProps {
  children: ReactNode;
  title: string;
  side: 'left' | 'right';
  defaultCollapsed?: boolean;
  className?: string;
}

export function CollapsiblePanel({
  children,
  title,
  side,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultCollapsed = false, // Default to expanded
  className = '',
}: CollapsiblePanelProps) {
  // Create a unique key for this panel's state in localStorage
  const storageKey = `panel-collapsed-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  // Initialize state from localStorage if available, otherwise use defaultCollapsed
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // For debugging: ignore localStorage and always start expanded
    // const stored = localStorage.getItem(storageKey);
    // return stored !== null ? stored === 'true' : defaultCollapsed;
    return false; // Always start expanded for now
  });

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(storageKey, String(isCollapsed));
  }, [isCollapsed, storageKey]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`collapsible-panel ${side} ${isCollapsed ? 'collapsed' : ''} ${className}`}>
      <button
        className="collapse-toggle"
        onClick={toggleCollapse}
        aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
        title={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
      >
        <span className="toggle-icon">
          {side === 'left' ? (isCollapsed ? '▶' : '◀') : isCollapsed ? '◀' : '▶'}
        </span>
        {isCollapsed && <span className="collapsed-title">{title}</span>}
      </button>
      <div className="panel-content">{children}</div>
    </div>
  );
}
