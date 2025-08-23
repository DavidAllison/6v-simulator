import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainSimulator from '../../src/MainSimulator';

// Mock the simulation and renderer modules to avoid canvas errors in tests
jest.mock('../../src/lib/six-vertex/simulation', () => ({
  createSimulation: jest.fn(() => ({
    initialize: jest.fn(),
    getState: jest.fn(() => ({
      width: 10,
      height: 10,
      vertices: [],
    })),
    getStats: jest.fn(() => ({
      steps: 0,
      acceptedFlips: 0,
      rejectedFlips: 0,
      acceptanceRate: 0,
      energy: 0,
      magnetization: 0,
    })),
    on: jest.fn(),
    step: jest.fn(),
    pause: jest.fn(),
    isRunning: jest.fn(() => false),
    updateParams: jest.fn(),
    exportData: jest.fn(() => ({
      state: { width: 10, height: 10, vertices: [] },
      params: {
        temperature: 1.0,
        beta: 1.0,
        weights: { a1: 1, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 },
        boundaryCondition: 'DWBC',
        seed: 12345,
      },
      stats: {
        steps: 0,
        acceptedFlips: 0,
        rejectedFlips: 0,
        acceptanceRate: 0,
        energy: 0,
        magnetization: 0,
      },
    })),
    importData: jest.fn(),
  })),
}));

jest.mock('../../src/lib/six-vertex/renderer/pathRenderer', () => ({
  PathRenderer: jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    exportImage: jest.fn(),
    updateConfig: jest.fn(),
  })),
}));

// Mock canvas context
// @ts-expect-error - Mocking canvas context for testing
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  drawImage: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createPattern: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  isPointInPath: jest.fn(),
  isPointInStroke: jest.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
}));

describe('CollapsiblePanel Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render both collapsible panels in MainSimulator', () => {
    render(<MainSimulator />);

    // Check for both panels by looking for their collapse buttons
    const buttons = screen.getAllByRole('button');
    const collapseButtons = buttons.filter(
      (btn) =>
        btn.getAttribute('aria-label')?.includes('Collapse') ||
        btn.getAttribute('aria-label')?.includes('Expand'),
    );

    // Should have 2 collapse buttons (left and right panels)
    expect(collapseButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('should collapse left panel when clicked', async () => {
    render(<MainSimulator />);

    // Find the left panel by looking for Controls title
    const leftPanelButton = screen.getByLabelText(/Collapse Controls/i);

    // Check that panel is initially expanded
    const leftPanel = leftPanelButton.closest('.collapsible-panel');
    expect(leftPanel).not.toHaveClass('collapsed');

    // Click to collapse
    fireEvent.click(leftPanelButton);

    // Check that panel is now collapsed
    await waitFor(() => {
      expect(leftPanel).toHaveClass('collapsed');
    });

    // Check that the button label changed
    expect(leftPanelButton).toHaveAttribute('aria-label', 'Expand Controls');
  });

  it('should collapse right panel when clicked', async () => {
    render(<MainSimulator />);

    // Find the right panel by looking for Info title
    const rightPanelButton = screen.getByLabelText(/Collapse Info/i);

    // Check that panel is initially expanded
    const rightPanel = rightPanelButton.closest('.collapsible-panel');
    expect(rightPanel).not.toHaveClass('collapsed');

    // Click to collapse
    fireEvent.click(rightPanelButton);

    // Check that panel is now collapsed
    await waitFor(() => {
      expect(rightPanel).toHaveClass('collapsed');
    });

    // Check that the button label changed
    expect(rightPanelButton).toHaveAttribute('aria-label', 'Expand Info');
  });

  it('should persist panel states in localStorage', async () => {
    const { unmount } = render(<MainSimulator />);

    // Collapse the left panel
    const leftPanelButton = screen.getByLabelText(/Collapse Controls/i);
    fireEvent.click(leftPanelButton);

    // Check localStorage
    await waitFor(() => {
      expect(localStorage.getItem('panel-collapsed-controls')).toBe('true');
    });

    // Unmount and remount to simulate page refresh
    unmount();
    render(<MainSimulator />);

    // Check that the left panel is still collapsed
    const newLeftPanelButton = screen.getByLabelText(/Expand Controls/i);
    const leftPanel = newLeftPanelButton.closest('.collapsible-panel');
    expect(leftPanel).toHaveClass('collapsed');
  });

  it('should show correct arrow directions for panels', () => {
    render(<MainSimulator />);

    // Find the panels
    const leftPanelButton = screen.getByLabelText(/Collapse Controls/i);
    const rightPanelButton = screen.getByLabelText(/Collapse Info/i);

    const leftIcon = leftPanelButton.querySelector('.toggle-icon');
    const rightIcon = rightPanelButton.querySelector('.toggle-icon');

    // Left panel expanded should show left arrow (◀)
    expect(leftIcon?.textContent).toBe('◀');

    // Right panel expanded should show right arrow (▶)
    expect(rightIcon?.textContent).toBe('▶');

    // Collapse both panels
    fireEvent.click(leftPanelButton);
    fireEvent.click(rightPanelButton);

    // Left panel collapsed should show right arrow (▶)
    expect(leftIcon?.textContent).toBe('▶');

    // Right panel collapsed should show left arrow (◀)
    expect(rightIcon?.textContent).toBe('◀');
  });
});
