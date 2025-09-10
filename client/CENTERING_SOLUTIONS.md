# Canvas Centering Solutions

This document describes the multiple approaches implemented to center canvases in the 6-vertex model visualization.

## Problem Statement
The original issue was that canvases rendered at position (0,0) instead of being centered in their containers when using PanZoomCanvas or other wrapper components.

## Solutions Implemented

### 1. CenteredDualDisplay Component
**Route:** `/centered-dual`  
**File:** `/src/components/CenteredDualDisplay.tsx`

Uses flexbox centering with explicit dimensions:
- Full viewport container with `display: flex` and center alignment
- Inner panels with fixed dimensions
- Canvas wrapped in positioned containers with overflow control

### 2. TransformCenteredDual Component  
**Route:** `/transform-centered`  
**File:** `/src/components/TransformCenteredDual.tsx`

Uses CSS transform for absolute centering:
- Container positioned absolutely at 50% top/left
- `transform: translate(-50%, -50%)` for perfect centering
- Most reliable method for centering regardless of content size

### 3. GridCenteredDual Component
**Route:** `/grid-centered`  
**File:** `/src/components/GridCenteredDual.tsx`

Uses CSS Grid with place-items:
- `display: grid` with `place-items: center`
- Grid template columns for side-by-side layout
- Modern approach with excellent browser support

## Key Findings

1. **PanZoomCanvas Issues:** The original PanZoomCanvas component had positioning conflicts that prevented proper centering
2. **Direct Canvas Rendering:** Removing intermediate wrapper components and rendering canvases directly provides better control
3. **Transform Method:** CSS transform with translate(-50%, -50%) is the most reliable centering method
4. **Grid Layout:** CSS Grid with place-items provides the cleanest solution for complex layouts

## Testing the Solutions

Visit each route to see the different centering approaches:
- http://localhost:5173/centered-dual - Flexbox approach
- http://localhost:5173/transform-centered - Transform approach
- http://localhost:5173/grid-centered - Grid approach

All three solutions successfully center the DWBC High and Low configuration canvases.

## Recommended Approach

For production use, the **GridCenteredDual** component is recommended because:
- Cleanest code with minimal CSS
- Modern browser feature with excellent support
- Handles responsive layouts well
- Easy to maintain and extend

## Code Comparison

### Flexbox (verbose but explicit):
```css
display: flex;
align-items: center;
justify-content: center;
```

### Transform (most reliable):
```css
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
```

### Grid (cleanest):
```css
display: grid;
place-items: center;
```

All approaches work correctly and center the canvases as intended.