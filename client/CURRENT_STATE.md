# Current State - 6-Vertex Model Simulator

## Server Status
- Development server running at: http://localhost:5175
- Port: 5175 (was 5173, then 5174, now 5175)

## Known Issues to Fix

### 1. DWBC Pattern Issues
- **Problem**: DWBC High and Low patterns don't match paper Figures 2 & 3
- **Expected**: 
  - High: c2 on anti-diagonal, b1 upper-left, b2 lower-right
  - Low: c2 on main diagonal, a1 upper-right, a2 lower-left
- **Files**: `/src/lib/six-vertex/initialStates.ts`

### 2. UI State Management Issues
- **Problem**: Pattern doesn't change when switching between High/Low
- **Problem**: Lattice size doesn't update when slider changes
- **Files**: `/src/App.tsx`, state management logic

### 3. Logo Issue
- **Problem**: Current logo looks like Facebook thumbs-up
- **Solution**: Need ice crystal or vertex-themed icon

### 4. Routing Issues
- **Problem**: Routes like /performance, /model-tests may not be working
- **Need to check**: React Router setup

## Todo List Status
1. Fix DWBC High/Low patterns to match paper Figures 2 & 3 - IN PROGRESS
2. Fix lattice size not updating when slider changes - PENDING
3. Fix pattern not changing when switching between High/Low - PENDING
4. Replace Facebook-like logo with ice/vertex themed icon - PENDING
5. Verify canvas rendering shows correct patterns - PENDING

## Files Recently Modified
- TypeScript imports fixed in multiple files to use `import type`
- Enums converted to const objects for compatibility
- Build now succeeds without errors

## Commands to Restart
```bash
cd /Users/dja/Desktop/6v/client
npm run dev
# Server will start on available port (check output)
```

## Test Commands
```bash
npm test                    # Run tests
npm run build              # Build project
npm run typecheck          # Check types
```

## Key File Locations
- Main app: `/src/App.tsx`
- Physics engine: `/src/lib/six-vertex/`
- Components: `/src/components/`
- Routes: `/src/routes/`
- Tests: `/tests/`