/**
 * Get theme-aware colors for the canvas renderer
 */

import { VertexType } from './types';

export function getThemeColors(isDark: boolean) {
  if (isDark) {
    // Dark theme colors
    return {
      background: '#1a1a1a',
      grid: '#404040',
      pathSegment: '#e0e0e0',
      arrow: '#4da3ff',
      vertexTypes: {
        [VertexType.a1]: '#ff6b6b',
        [VertexType.a2]: '#51cf66',
        [VertexType.b1]: '#4da3ff',
        [VertexType.b2]: '#ffd43b',
        [VertexType.c1]: '#ff6fff',
        [VertexType.c2]: '#4dd4ff',
      },
    };
  } else {
    // Light theme colors (original)
    return {
      background: '#ffffff',
      grid: '#e0e0e0',
      pathSegment: '#000000',
      arrow: '#4444ff',
      vertexTypes: {
        [VertexType.a1]: '#ff4444',
        [VertexType.a2]: '#44ff44',
        [VertexType.b1]: '#4444ff',
        [VertexType.b2]: '#ffff44',
        [VertexType.c1]: '#ff44ff',
        [VertexType.c2]: '#44ffff',
      },
    };
  }
}

/**
 * Get colors from CSS variables
 */
export function getThemeColorsFromCSS() {
  // Detect if dark theme is active
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Use predefined colors for consistency with the canvas
  return getThemeColors(isDark);
}
