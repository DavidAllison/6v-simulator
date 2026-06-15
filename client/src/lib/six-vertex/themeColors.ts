/**
 * Theme-aware colors for the renderer and the DOM legends.
 *
 * This file is the SINGLE source of truth for the six vertex-type colors so the
 * Canvas and the React legends (ControlPanel, StatisticsPanel, flipDebug) never
 * disagree. The palette is based on the Okabe–Ito colour-vision-deficiency-safe
 * qualitative palette so the six types stay distinguishable for colour-blind users.
 */

import { VertexType } from './types';

export type VertexColorMap = Record<VertexType, string>;

/** Okabe–Ito based, tuned for legibility on a white background. */
const VERTEX_COLORS_LIGHT: VertexColorMap = {
  [VertexType.a1]: '#d55e00', // vermillion
  [VertexType.a2]: '#e69f00', // orange
  [VertexType.b1]: '#0072b2', // blue
  [VertexType.b2]: '#56b4e9', // sky blue
  [VertexType.c1]: '#009e73', // bluish green
  [VertexType.c2]: '#cc79a7', // reddish purple
};

/** Same hues, brightened slightly for contrast on the dark background. */
const VERTEX_COLORS_DARK: VertexColorMap = {
  [VertexType.a1]: '#ff7d3b',
  [VertexType.a2]: '#ffbf47',
  [VertexType.b1]: '#4da3ff',
  [VertexType.b2]: '#8fd0f5',
  [VertexType.c1]: '#3ad4a8',
  [VertexType.c2]: '#e89cc4',
};

/** The canonical vertex-color map for the given theme. */
export function getVertexColors(isDark: boolean): VertexColorMap {
  return isDark ? VERTEX_COLORS_DARK : VERTEX_COLORS_LIGHT;
}

/** True when the dark theme is currently active on the document. */
export function isDarkTheme(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
}

/** Vertex colors for the currently-active theme (for DOM legends). */
export function getCurrentVertexColors(): VertexColorMap {
  return getVertexColors(isDarkTheme());
}

/**
 * Get theme-aware colors for the canvas renderer.
 */
export function getThemeColors(isDark: boolean) {
  if (isDark) {
    return {
      background: '#1a1a1a',
      grid: '#404040',
      pathSegment: '#e0e0e0',
      arrow: '#4da3ff',
      vertexTypes: getVertexColors(true),
    };
  }
  return {
    background: '#ffffff',
    grid: '#e0e0e0',
    pathSegment: '#000000',
    arrow: '#4444ff',
    vertexTypes: getVertexColors(false),
  };
}

/**
 * Get colors from the active theme (kept for backwards compatibility).
 */
export function getThemeColorsFromCSS() {
  return getThemeColors(isDarkTheme());
}
