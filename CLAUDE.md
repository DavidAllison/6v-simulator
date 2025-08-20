# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 6-vertex model physics simulation project implementing Domain Wall Boundary Conditions (DWBC) based on the paper "Numerical study of the 6-vertex model with DWBC" (attached_assets/0502314v1.pdf). The goal is to create a TypeScript + React web application that faithfully reproduces the Monte Carlo dynamics and visualizations from the reference C implementation.

## Key References

1. **Research Paper**: `attached_assets/0502314v1.pdf` - Contains the theoretical foundation, vertex diagrams (Fig. 1), and DWBC configurations (Fig. 2 & 3)
2. **Reference Implementation**: `attached_assets/main.c` - Working C code with correct flip dynamics, weight calculations, and Monte Carlo algorithm
3. **Implementation Spec**: `6v-prompt.txt` - Detailed requirements for the web application

## Development Commands

Since this is a greenfield project, the following commands should be set up:

```bash
# Initial setup (once project is created)
npm create vite@latest client -- --template react-ts
cd client
npm install

# Development
npm run dev          # Start development server
npm test            # Run Jest tests
npm run test:watch  # Run tests in watch mode
npm run build       # Build for production
npm run preview     # Preview production build

# Code quality
npm run lint        # Run ESLint
npm run typecheck   # Run TypeScript compiler checks
```

## Architecture

The web application should follow this structure:

```
client/
├── src/
│   ├── lib/six-vertex/
│   │   ├── types.ts           # VertexType enum (a₁,a₂,b₁,b₂,c₁,c₂)
│   │   ├── vertexShapes.ts    # Maps vertex types to bold edges (from Fig. 1)
│   │   ├── initialStates.ts   # DWBC High/Low generators
│   │   ├── rng.ts             # Seeded PRNG for reproducibility
│   │   ├── flips.ts           # Flip detection and execution logic
│   │   ├── simulation.ts      # Monte Carlo engine
│   │   └── renderer/
│   │       └── pathRenderer.ts # Canvas rendering (bold segments style)
│   ├── App.tsx                # Main UI with controls and stats
│   └── dwbcVerify.tsx         # Visual verification route
└── tests/
    └── six-vertex/            # Comprehensive test suite
```

## Critical Implementation Details

### Vertex Types
The six vertex types (a₁, a₂, b₁, b₂, c₁, c₂) must match exactly with the paper's Fig. 1. Each vertex has two incoming and two outgoing arrows (ice rule).

### DWBC Configurations
- **High**: c₂ vertices on anti-diagonal, vertical-dominant upper-left, horizontal-dominant lower-right
- **Low**: c₂ vertices on main diagonal, a₁ region upper-right, a₂ region lower-left

### Flip Dynamics
- Flips affect a 2×2 neighborhood (not single cells)
- Use heat-bath/detailed balance algorithm from `main.c`
- Track success/failure rates and maintain flippable site list

### Rendering Modes
- **Paths**: Bold connected segments without arrows (paper style)
- **Arrows**: Optional overlay showing arrow directions

## Testing Requirements

All tests must pass before any commit:
1. Vertex shape mappings match Fig. 1 exactly
2. DWBC generators produce correct patterns for N=8 and N=24
3. Flips preserve ice rule (2-in/2-out)
4. Heat-bath probabilities match theoretical expectations
5. Visual regression tests for rendered output

## Important Notes

- **Source of Truth**: Always defer to `attached_assets/0502314v1.pdf` and `attached_assets/main.c` over any verbal descriptions
- **Reproducibility**: Use seeded RNG to ensure deterministic behavior for testing
- **Performance**: Start with main-thread implementation; optimize with Web Workers if needed
- **Validation**: The `/dwbc-verify` route must visually match paper figures exactly