import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CollapsiblePanel } from '../src/components/CollapsiblePanel';

describe('CollapsiblePanel', () => {
  // Clear localStorage before each test
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render with children when not collapsed', () => {
    render(
      <CollapsiblePanel title="Test Panel" side="left">
        <div>Test Content</div>
      </CollapsiblePanel>,
    );

    // Content should be visible
    expect(screen.getByText('Test Content')).toBeInTheDocument();

    // Title should not be visible in button when expanded
    expect(screen.queryByText('Test Panel')).not.toBeInTheDocument();
  });

  it('should hide children when collapsed', () => {
    render(
      <CollapsiblePanel title="Test Panel" side="left" defaultCollapsed={true}>
        <div>Test Content</div>
      </CollapsiblePanel>,
    );

    // Content should be hidden
    const content = document.querySelector('.panel-content');
    expect(content).toBeInTheDocument();

    // Check CSS class
    const panel = document.querySelector('.collapsible-panel');
    expect(panel).toHaveClass('collapsed');
  });

  it('should toggle collapse state when button is clicked', () => {
    render(
      <CollapsiblePanel title="Test Panel" side="left">
        <div>Test Content</div>
      </CollapsiblePanel>,
    );

    const button = screen.getByRole('button');
    const panel = document.querySelector('.collapsible-panel');

    // Initially expanded
    expect(panel).not.toHaveClass('collapsed');

    // Click to collapse
    fireEvent.click(button);
    expect(panel).toHaveClass('collapsed');

    // Click to expand
    fireEvent.click(button);
    expect(panel).not.toHaveClass('collapsed');
  });

  it('should show correct arrow icons for left side panel', () => {
    render(
      <CollapsiblePanel title="Test Panel" side="left">
        <div>Test Content</div>
      </CollapsiblePanel>,
    );

    const toggleIcon = document.querySelector('.toggle-icon');

    // Left panel expanded shows left arrow
    expect(toggleIcon?.textContent).toBe('◀');

    // Click to collapse
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Left panel collapsed shows right arrow
    expect(toggleIcon?.textContent).toBe('▶');
  });

  it('should show correct arrow icons for right side panel', () => {
    render(
      <CollapsiblePanel title="Test Panel" side="right">
        <div>Test Content</div>
      </CollapsiblePanel>,
    );

    const toggleIcon = document.querySelector('.toggle-icon');

    // Right panel expanded shows right arrow
    expect(toggleIcon?.textContent).toBe('▶');

    // Click to collapse
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Right panel collapsed shows left arrow
    expect(toggleIcon?.textContent).toBe('◀');
  });

  it('should persist collapsed state in localStorage', () => {
    const { rerender } = render(
      <CollapsiblePanel title="Test Panel" side="left">
        <div>Test Content</div>
      </CollapsiblePanel>,
    );

    const button = screen.getByRole('button');

    // Collapse the panel
    fireEvent.click(button);

    // Check localStorage
    const storageKey = 'panel-collapsed-test-panel';
    expect(localStorage.getItem(storageKey)).toBe('true');

    // Re-render component (simulating page refresh)
    rerender(
      <CollapsiblePanel title="Test Panel" side="left">
        <div>Test Content</div>
      </CollapsiblePanel>,
    );

    // Panel should still be collapsed
    const panel = document.querySelector('.collapsible-panel');
    expect(panel).toHaveClass('collapsed');
  });

  it('should have proper aria-label for accessibility', () => {
    render(
      <CollapsiblePanel title="Test Panel" side="left">
        <div>Test Content</div>
      </CollapsiblePanel>,
    );

    const button = screen.getByRole('button');

    // Initially expanded
    expect(button).toHaveAttribute('aria-label', 'Collapse Test Panel');
    expect(button).toHaveAttribute('title', 'Collapse Test Panel');

    // Click to collapse
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Expand Test Panel');
    expect(button).toHaveAttribute('title', 'Expand Test Panel');
  });

  it('should apply custom className when provided', () => {
    render(
      <CollapsiblePanel title="Test Panel" side="left" className="custom-class">
        <div>Test Content</div>
      </CollapsiblePanel>,
    );

    const panel = document.querySelector('.collapsible-panel');
    expect(panel).toHaveClass('custom-class');
  });
});
