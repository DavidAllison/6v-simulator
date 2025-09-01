import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TestDualLayout from './TestDualLayout';

describe('TestDualLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(<TestDualLayout />);
    expect(container).toBeInTheDocument();
  });

  it('displays control panel with correct labels', () => {
    render(<TestDualLayout />);
    
    expect(screen.getByText('Control Panel')).toBeInTheDocument();
    expect(screen.getByText('Static Display')).toBeInTheDocument();
    expect(screen.getByText('Dual 6-Vertex')).toBeInTheDocument();
    expect(screen.getByText('3-Column')).toBeInTheDocument();
    expect(screen.getByText('24 × 24')).toBeInTheDocument();
  });

  it('displays info panel with DWBC descriptions', () => {
    render(<TestDualLayout />);
    
    expect(screen.getByText('Display Info')).toBeInTheDocument();
    expect(screen.getByText('DWBC High (Top)')).toBeInTheDocument();
    expect(screen.getByText('DWBC Low (Bottom)')).toBeInTheDocument();
    expect(screen.getByText('c2 on anti-diagonal')).toBeInTheDocument();
    expect(screen.getByText('c2 on main diagonal')).toBeInTheDocument();
  });

  it('creates two canvas elements', () => {
    const { container } = render(<TestDualLayout />);
    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(2);
  });

  it('has reset button', () => {
    render(<TestDualLayout />);
    const resetButton = screen.getByText('Reset Display');
    expect(resetButton).toBeInTheDocument();
  });

  it('displays correct color scheme info', () => {
    render(<TestDualLayout />);
    expect(screen.getByText('High: Cyan (#4ECDC4)')).toBeInTheDocument();
    expect(screen.getByText('Low: Pink (#F38181)')).toBeInTheDocument();
  });

  it('sets up correct layout structure', async () => {
    const { container } = render(<TestDualLayout />);
    
    // Wait for initial render
    await waitFor(() => {
      // Check for 3-column layout: left sidebar, middle content, right sidebar
      const sidebars = container.querySelectorAll('[style*="width: 250px"]');
      expect(sidebars).toHaveLength(2); // Two sidebars
      
      // Check for middle column with flex layout
      const middleColumn = container.querySelector('[style*="flex: 1"]');
      expect(middleColumn).toBeInTheDocument();
      
      // Check for two canvas containers with 50% flex
      const canvasContainers = container.querySelectorAll('[style*="flex: 1 1 50%"]');
      expect(canvasContainers).toHaveLength(2);
    });
  });
});