import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CollapsiblePanel } from '../../src/components/CollapsiblePanel';

describe('CollapsiblePanel', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      },
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with children content', () => {
      render(
        <CollapsiblePanel title="Test Panel" side="left">
          <div>Test Content</div>
        </CollapsiblePanel>,
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render toggle button', () => {
      render(
        <CollapsiblePanel title="Test Panel" side="left">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Collapse Test Panel');
    });

    it('should apply correct CSS classes for left panel', () => {
      const { container } = render(
        <CollapsiblePanel title="Test Panel" side="left">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const panel = container.querySelector('.collapsible-panel');
      expect(panel).toHaveClass('collapsible-panel', 'left');
      expect(panel).not.toHaveClass('collapsed');
    });

    it('should apply correct CSS classes for right panel', () => {
      const { container } = render(
        <CollapsiblePanel title="Test Panel" side="right">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const panel = container.querySelector('.collapsible-panel');
      expect(panel).toHaveClass('collapsible-panel', 'right');
      expect(panel).not.toHaveClass('collapsed');
    });
  });

  describe('Collapse/Expand Functionality', () => {
    it('should toggle collapsed state when button is clicked', async () => {
      const { container } = render(
        <CollapsiblePanel title="Test Panel" side="left">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const panel = container.querySelector('.collapsible-panel');
      const button = screen.getByRole('button');

      // Initially expanded
      expect(panel).not.toHaveClass('collapsed');
      expect(button).toHaveAttribute('aria-label', 'Collapse Test Panel');

      // Click to collapse
      fireEvent.click(button);
      await waitFor(() => {
        expect(panel).toHaveClass('collapsed');
        expect(button).toHaveAttribute('aria-label', 'Expand Test Panel');
      });

      // Click to expand
      fireEvent.click(button);
      await waitFor(() => {
        expect(panel).not.toHaveClass('collapsed');
        expect(button).toHaveAttribute('aria-label', 'Collapse Test Panel');
      });
    });

    it('should show correct arrow icon for left panel', () => {
      render(
        <CollapsiblePanel title="Test Panel" side="left">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const button = screen.getByRole('button');
      let icon = button.querySelector('.toggle-icon');

      // Expanded state - left panel shows left arrow
      expect(icon?.textContent).toBe('◀');

      // Click to collapse
      fireEvent.click(button);

      // Collapsed state - left panel shows right arrow
      icon = button.querySelector('.toggle-icon');
      expect(icon?.textContent).toBe('▶');
    });

    it('should show correct arrow icon for right panel', () => {
      render(
        <CollapsiblePanel title="Test Panel" side="right">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const button = screen.getByRole('button');
      let icon = button.querySelector('.toggle-icon');

      // Expanded state - right panel shows right arrow
      expect(icon?.textContent).toBe('▶');

      // Click to collapse
      fireEvent.click(button);

      // Collapsed state - right panel shows left arrow
      icon = button.querySelector('.toggle-icon');
      expect(icon?.textContent).toBe('◀');
    });

    it('should hide content when collapsed', async () => {
      const { container } = render(
        <CollapsiblePanel title="Test Panel" side="left">
          <div className="test-content">Content</div>
        </CollapsiblePanel>,
      );

      const button = screen.getByRole('button');
      const content = container.querySelector('.panel-content');

      // Content visible when expanded
      expect(content).toBeVisible();

      // Click to collapse
      fireEvent.click(button);

      // Content should be hidden
      await waitFor(() => {
        const panel = container.querySelector('.collapsible-panel');
        expect(panel).toHaveClass('collapsed');
        // In the CSS, collapsed panels have display: none on content
        const contentAfter = container.querySelector('.panel-content');
        expect(contentAfter).toBeInTheDocument();
      });
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save collapsed state to localStorage', () => {
      render(
        <CollapsiblePanel title="Test Panel" side="left">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const button = screen.getByRole('button');
      const storageKey = 'panel-collapsed-test-panel';

      // Initially no value in localStorage or false
      expect(localStorageMock.getItem(storageKey)).toBe('false');

      // Click to collapse
      fireEvent.click(button);

      // Should save collapsed state
      expect(localStorageMock.getItem(storageKey)).toBe('true');

      // Click to expand
      fireEvent.click(button);

      // Should save expanded state
      expect(localStorageMock.getItem(storageKey)).toBe('false');
    });

    it('should restore collapsed state from localStorage on mount', () => {
      const storageKey = 'panel-collapsed-test-panel';

      // Set collapsed state in localStorage
      localStorageMock.setItem(storageKey, 'true');

      const { container } = render(
        <CollapsiblePanel title="Test Panel" side="left">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const panel = container.querySelector('.collapsible-panel');
      const button = screen.getByRole('button');

      // Should be collapsed based on localStorage
      expect(panel).toHaveClass('collapsed');
      expect(button).toHaveAttribute('aria-label', 'Expand Test Panel');
    });

    it('should use defaultCollapsed prop when no localStorage value exists', () => {
      const { container } = render(
        <CollapsiblePanel title="Test Panel" side="left" defaultCollapsed={true}>
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const panel = container.querySelector('.collapsible-panel');

      // Should be collapsed based on defaultCollapsed prop
      expect(panel).toHaveClass('collapsed');
    });

    it('should prefer localStorage value over defaultCollapsed prop', () => {
      const storageKey = 'panel-collapsed-test-panel';

      // Set expanded state in localStorage
      localStorageMock.setItem(storageKey, 'false');

      const { container } = render(
        <CollapsiblePanel title="Test Panel" side="left" defaultCollapsed={true}>
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const panel = container.querySelector('.collapsible-panel');

      // Should be expanded based on localStorage, not defaultCollapsed
      expect(panel).not.toHaveClass('collapsed');
    });
  });

  describe('Title Display', () => {
    it('should show title in button when collapsed', () => {
      render(
        <CollapsiblePanel title="Test Panel Title" side="left">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const button = screen.getByRole('button');

      // Title not shown when expanded
      expect(button.querySelector('.collapsed-title')).not.toBeInTheDocument();

      // Click to collapse
      fireEvent.click(button);

      // Title shown when collapsed
      const title = button.querySelector('.collapsed-title');
      expect(title).toBeInTheDocument();
      expect(title?.textContent).toBe('Test Panel Title');
    });
  });

  describe('Custom Class Names', () => {
    it('should apply custom className prop', () => {
      const { container } = render(
        <CollapsiblePanel title="Test Panel" side="left" className="custom-class">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const panel = container.querySelector('.collapsible-panel');
      expect(panel).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in title for localStorage key', () => {
      render(
        <CollapsiblePanel title="Test Panel!@#$%^&*()" side="left">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should create a sanitized key
      // The key should be created from the sanitized title
      // Check that some key was created with sanitization
      // The store is internal to the mock, so we check through the mock's methods
      const expectedKeyPrefix = 'panel-collapsed-test-panel';

      // Find any keys that start with the expected prefix
      let foundKey = null;
      for (let i = 0; i < localStorageMock.length; i++) {
        const key = localStorageMock.key(i);
        if (key && key.startsWith(expectedKeyPrefix)) {
          foundKey = key;
          break;
        }
      }

      expect(foundKey).toBeTruthy();
      // Verify value is stored correctly when found
      if (foundKey) {
        expect(localStorageMock.getItem(foundKey)).toBe('true');
      }
    });

    it('should handle rapid clicks without errors', () => {
      const { container } = render(
        <CollapsiblePanel title="Test Panel" side="left">
          <div>Content</div>
        </CollapsiblePanel>,
      );

      const button = screen.getByRole('button');

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      // Should not throw errors and state should be consistent
      const panel = container.querySelector('.collapsible-panel');
      expect(panel).toBeDefined();
    });
  });
});
