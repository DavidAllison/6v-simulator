import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { ThemeProvider } from '../src/contexts/ThemeContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('should render the toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should show moon icon in light mode', () => {
    localStorageMock.getItem.mockReturnValue('light');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');

    // Check for moon icon path (simplified check)
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const path = svg?.querySelector('path');
    expect(path).toHaveAttribute('d', expect.stringContaining('M21 12.79'));
  });

  it('should show sun icon in dark mode', () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');

    // Check for sun icon (has circle element)
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const circle = svg?.querySelector('circle');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute('cx', '12');
    expect(circle).toHaveAttribute('cy', '12');
  });

  it('should toggle theme when clicked', () => {
    localStorageMock.getItem.mockReturnValue('light');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button');

    // Initially in light mode
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');

    // Click to switch to dark mode
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');

    // Click to switch back to light mode
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('should have proper accessibility attributes', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button).toHaveAttribute('title');
  });

  it('should have theme-toggle class', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('theme-toggle');
  });
});
