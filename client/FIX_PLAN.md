# Fix Plan for 6-Vertex Model Simulator

## Issues Found

### 1. 🔴 CRITICAL: No React Router Setup
- **Problem**: Routes exist but React Router isn't installed/configured
- **Impact**: /dwbc-verify, /performance, /model-tests routes don't work
- **Solution**: 
  - Install react-router-dom
  - Set up routing in main.tsx
  - Create missing route components

### 2. 🔴 CRITICAL: DWBC Patterns Incorrect
- **Problem**: Patterns don't match paper Figures 2 & 3
- **Impact**: Physics simulation not accurate
- **Solution**: Fix pattern generation in initialStates.ts

### 3. 🔴 CRITICAL: UI State Not Updating
- **Problem**: Canvas doesn't update when changing settings
- **Impact**: User can't see changes in real-time
- **Solution**: Fix state management and re-rendering

### 4. 🟡 MEDIUM: Logo Issue
- **Problem**: Looks like Facebook logo
- **Impact**: Unprofessional appearance
- **Solution**: Create ice crystal SVG icon

## Fix Order

### Phase 1: React Router Setup
```bash
npm install react-router-dom
```
- Update main.tsx with BrowserRouter
- Update App.tsx to use Routes
- Create route components for missing pages

### Phase 2: Fix DWBC Patterns
- Study paper Figures 2 & 3 carefully
- Rewrite pattern generation logic
- Test with visual verification

### Phase 3: Fix State Management
- Ensure simulation recreates on parameter change
- Fix canvas re-rendering
- Add proper useEffect dependencies

### Phase 4: Create New Logo
- Design hexagonal ice crystal icon
- Replace in index.html and components

## Files to Modify

1. **Router Setup**
   - `/src/main.tsx` - Add BrowserRouter
   - `/src/App.tsx` - Add Routes component
   - Create `/src/routes/modelTests.tsx`

2. **Pattern Fixes**
   - `/src/lib/six-vertex/initialStates.ts`
   - `/src/lib/six-vertex/physicsFlips.ts`

3. **State Management**
   - `/src/App.tsx` - Fix useEffect and state
   - `/src/components/VisualizationCanvas.tsx`

4. **Logo**
   - `/index.html`
   - Create new SVG icon file

## Verification Steps

1. All routes should load:
   - http://localhost:5175/
   - http://localhost:5175/dwbc-verify
   - http://localhost:5175/performance
   - http://localhost:5175/model-tests

2. DWBC patterns should be visually distinct:
   - High: Clear anti-diagonal pattern
   - Low: Clear main diagonal pattern

3. UI should be responsive:
   - Changing lattice size updates display
   - Switching High/Low changes pattern
   - All sliders work in real-time

4. Logo should be ice/vertex themed

## Commands After Fix

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Test all routes
curl http://localhost:[PORT]/
curl http://localhost:[PORT]/dwbc-verify
curl http://localhost:[PORT]/performance
curl http://localhost:[PORT]/model-tests

# Run tests
npm test
```

## State Saved
- Current issues documented in CURRENT_STATE.md
- This fix plan in FIX_PLAN.md
- Ready to restart and continue fixes