# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 6-vertex model physics simulation project implementing Domain Wall Boundary Conditions (DWBC) based on the paper "Numerical study of the 6-vertex model with DWBC" (attached_assets/0502314v1.pdf). The goal is to create a TypeScript + React web application that faithfully reproduces the Monte Carlo dynamics and visualizations from the reference C implementation.

## Key References

1. **Research Paper**: `docs/reference/attached_assets/0502314v1.pdf` - Contains the theoretical foundation, vertex diagrams (Fig. 1), and DWBC configurations (Fig. 2 & 3)
2. **Reference Implementation**: `docs/reference/attached_assets/main.c` - Working C code with correct flip dynamics, weight calculations, and Monte Carlo algorithm
3. **Implementation Spec**: `6v-prompt.txt` - Detailed requirements for the web application

## Software Development Lifecycle (SDLC)

### 1. Development Workflow

#### Local Development
```bash
cd client
npm install          # Install dependencies
npm run dev          # Start development server at http://localhost:5173
npm run build        # Build for production
npm run preview      # Preview production build
```

#### Code Quality
```bash
npm run lint         # Run ESLint checks
npm run typecheck    # Run TypeScript compiler checks
npm run format       # Format code with Prettier (if configured)
```

#### Testing
```bash
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### 2. Git Workflow

#### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates

#### Commit Messages
Follow conventional commits format:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation
- `test:` - Testing
- `chore:` - Maintenance tasks

Example:
```bash
git commit -m "feat: add Arctic region visualization"
git commit -m "fix: correct b1→c2 flip transformation"
git commit -m "docs: update DWBC configuration details"
```

#### Pull Request Process
1. Create feature branch from `main`
2. Make changes following code standards
3. Run tests and linting
4. Create PR with descriptive title and body
5. Address review feedback
6. Merge after approval

### 3. Code Review Checklist
- [ ] Code follows project conventions
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Ice rule is preserved in all transformations
- [ ] Performance is acceptable
- [ ] Documentation is updated

### 4. Release Process

#### Version Numbering
Follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

#### Release Steps
1. Update version in `package.json`
2. Update CHANGELOG.md
3. Run full test suite
4. Build production bundle
5. Create git tag: `git tag -a v1.0.0 -m "Release version 1.0.0"`
6. Push tag: `git push origin v1.0.0`
7. Create GitHub release with notes
8. Deploy to production

### 5. Deployment

#### Build for Production
```bash
cd client
npm run build
# Output in client/dist/
```

#### Deployment Options
- **GitHub Pages**: For static hosting
- **Vercel**: Automatic deployments from GitHub
- **Netlify**: CI/CD with preview deployments
- **Custom Server**: Serve dist/ folder with nginx/apache

### 6. Monitoring & Maintenance

#### Performance Monitoring
- Track frame rates during simulation
- Monitor memory usage with large lattices
- Profile flip operation performance

#### Error Tracking
- Implement error boundary for React components
- Log physics violations to console in development
- Track ice rule violations

#### Maintenance Tasks
- Regular dependency updates
- Security vulnerability scanning
- Performance optimization
- Documentation updates

## Architecture

The web application follows this structure:

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
│   └── routes/                # Various debug and verification routes
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

## CI/CD Configuration

### GitHub Actions Workflows

Create `.github/workflows/ci.yml` for continuous integration:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd client && npm ci
      - run: cd client && npm run lint
      - run: cd client && npm run typecheck
      - run: cd client && npm test
      - run: cd client && npm run build
```

### Pre-commit Hooks

Use husky for git hooks:
```bash
cd client
npx husky-init && npm install
npx husky add .husky/pre-commit "npm run lint && npm run typecheck"
npx husky add .husky/pre-push "npm test"
```

## Troubleshooting Guide

### Common Issues

1. **Ice Rule Violations**
   - Check flip transformations preserve 2-in/2-out
   - Verify boundary conditions are correct
   - Use `/flip-debug` route to step through flips

2. **Performance Issues**
   - Profile with Chrome DevTools
   - Check for unnecessary re-renders
   - Consider using Web Workers for large lattices

3. **Visual Discrepancies**
   - Compare with paper figures
   - Verify vertex type mappings
   - Check edge drawing logic

4. **Build Failures**
   - Clear node_modules and reinstall
   - Check TypeScript version compatibility
   - Verify all imports are correct

## Important Notes

- **Source of Truth**: Always defer to research paper and `main.c` reference implementation
- **Reproducibility**: Use seeded RNG to ensure deterministic behavior for testing
- **Performance**: Start with main-thread implementation; optimize with Web Workers if needed
- **Validation**: The `/dwbc-verify` route must visually match paper figures exactly
- **Code Style**: Follow existing patterns, avoid unnecessary comments, maintain consistency