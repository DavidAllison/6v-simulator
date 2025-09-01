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
  defaultCollapsed = false,
  className = '',
}: CollapsiblePanelProps) {
  // Create a unique key for this panel's state in localStorage
  const storageKey = `panel-collapsed-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  // Initialize state from localStorage if available, otherwise use defaultCollapsed
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Always start expanded for now to ensure visibility
    return false;
  });

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(storageKey, String(isCollapsed));
  }, [isCollapsed, storageKey]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Determine panel classes based on side and state
  const panelClass = `panel-section panel-${side} ${isCollapsed ? 'collapsed' : ''} ${className}`;

  return (
    <div className={panelClass}>
      <div className="panel-header">
        <button
          className="collapse-toggle"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
          title={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
        >
          <span className="toggle-icon">
            {side === 'left' ? (isCollapsed ? '▶' : '◀') : isCollapsed ? '◀' : '▶'}
          </span>
        </button>
        {!isCollapsed && <h3 className="panel-title">{title}</h3>}
        {isCollapsed && (
          <div className="collapsed-label">
            <span>{title}</span>
          </div>
        )}
      </div>
      {!isCollapsed && <div className="panel-content">{children}</div>}
    </div>
  );
}