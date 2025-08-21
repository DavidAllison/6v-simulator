# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: PR Validation Requirements

**MANDATORY**: Before creating ANY pull request, you MUST:
1. Run the validation script: `./validate-pr.sh`
2. Ensure ALL checks pass (zero errors, zero warnings)
3. Verify PR is under 300 lines
4. Complete the full checklist in Section 4

**Failure to validate will result in automatic PR rejection.**

## Project Overview

This is a 6-vertex model physics simulation project implementing Domain Wall Boundary Conditions (DWBC) based on the paper "Numerical study of the 6-vertex model with DWBC" (attached_assets/0502314v1.pdf). The goal is to create a TypeScript + React web application that faithfully reproduces the Monte Carlo dynamics and visualizations from the reference C implementation.

## Key References

1. **Research Paper**: `docs/reference/attached_assets/0502314v1.pdf` - Contains the theoretical foundation, vertex diagrams (Fig. 1), and DWBC configurations (Fig. 2 & 3)
2. **Reference Implementation**: `docs/reference/attached_assets/main.c` - Working C code with correct flip dynamics, weight calculations, and Monte Carlo algorithm
3. **Implementation Spec**: `6v-prompt.txt` - Detailed requirements for the web application

## Software Development Lifecycle (SDLC)

### 1. Issue-Driven Development

#### Creating Issues
Every significant change should start with a GitHub issue:
```bash
gh issue create --title "Add feature X" --body "Description of the feature"
```

Issues should include:
- Clear description of the problem/feature
- Acceptance criteria
- Technical requirements
- Related documentation/references

#### Issue Templates
- **Bug Report**: Steps to reproduce, expected vs actual behavior
- **Feature Request**: User story, acceptance criteria, technical specs
- **Maintenance**: Dependencies to update, technical debt to address

### 2. Development Workflow

#### Starting New Work
```bash
# Create issue first
gh issue create --title "Implement feature X"

# Create feature branch from issue
git checkout -b feature/issue-NUMBER-description

# Or for fixes
git checkout -b fix/issue-NUMBER-description
```

#### Local Development
```bash
cd client
npm install          # Install dependencies
npm run dev          # Start development server at http://localhost:5173
npm run build        # Build for production
npm run preview      # Preview production build
```

#### Code Quality Commands
```bash
npm run lint         # Run ESLint checks
npm run lint -- --fix # Auto-fix ESLint issues
npm run typecheck    # Run TypeScript compiler checks
npm run format       # Format code with Prettier (if configured)
npm run format:check # Check formatting without fixing
```

#### Testing
```bash
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm test -- --passWithNoTests # Run tests even if none exist
```

### 3. Git Workflow

#### Branch Strategy
- `main` - Production-ready code, protected with CI checks
- `develop` - Integration branch for features (optional)
- `feature/*` - New features (link to issue number)
- `fix/*` - Bug fixes (link to issue number)
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates
- `chore/*` - Maintenance tasks

#### Commit Messages
Follow conventional commits format with issue references:
```bash
git commit -m "feat: add Arctic region visualization

Implements the Arctic region frozen state visualization
as specified in the research paper Fig. 3.

Refs #5"
```

Commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation
- `test:` - Testing
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes
- `perf:` - Performance improvements

#### Pull Request Process

1. **Create feature branch from main**
```bash
git checkout main
git pull origin main
git checkout -b feature/issue-NUMBER-description
```

2. **Make changes following standards**
- Write tests for new functionality
- Ensure all tests pass
- Fix linting issues
- Update documentation

3. **Verify changes locally**
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

4. **Create Pull Request**
```bash
# Push branch
git push -u origin feature/issue-NUMBER-description

# Create PR with detailed description
gh pr create \
  --title "feat: Brief description (#NUMBER)" \
  --body "## Summary
  
Detailed description of changes

## Related Issues
Fixes #NUMBER

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] No regressions identified

## Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CI checks pass"
```

5. **Monitor CI checks**
```bash
gh pr checks --watch
```

6. **Address review feedback**
- Respond to all comments
- Make requested changes
- Re-request review when ready

7. **Merge after approval**
```bash
# CI will verify all checks pass
gh pr merge --merge
```

8. **Close related issue**
```bash
gh issue close NUMBER --comment "Implemented in PR #PR_NUMBER"
```

### 4. Comprehensive PR Validation Checklist

**CRITICAL**: This checklist MUST be completed IN FULL before creating or updating any pull request. Failure to complete these checks results in wasted review time and rejected PRs.

#### Pre-PR Validation Requirements

##### Phase 1: Code Scope Validation
```bash
# STOP if any of these fail - DO NOT proceed to create PR

# 1. Verify PR scope is focused (target: <300 lines changed)
git diff main --stat | tail -1
# If > 300 lines, STOP and refactor into smaller PRs

# 2. Check for unintended files
git status --porcelain
# Remove any files not directly related to the issue:
# - No test files unless fixing tests
# - No generated files
# - No unrelated config changes
# - No documentation unless specifically required

# 3. Verify single responsibility
git log main..HEAD --oneline
# Each commit should have ONE clear purpose
# If mixing features/fixes, STOP and split into separate PRs
```

##### Phase 2: Code Quality Validation
```bash
# ALL commands must pass with ZERO errors/warnings

# 1. Clean install dependencies
cd client
rm -rf node_modules package-lock.json
npm install

# 2. Linting - MUST have zero errors
npm run lint
# If errors exist, fix them:
npm run lint -- --fix
# Then verify again:
npm run lint

# 3. TypeScript compilation - MUST have zero errors
npm run typecheck

# 4. Code formatting check
npm run format:check || npx prettier --check "src/**/*.{ts,tsx,js,jsx}"
# If formatting issues exist:
npx prettier --write "src/**/*.{ts,tsx,js,jsx}"

# 5. Import validation
npx depcheck
# Remove any unused dependencies
```

##### Phase 3: Build Validation
```bash
# Build MUST succeed with zero warnings

# 1. Development build test
npm run dev &
DEV_PID=$!
sleep 10
curl -f http://localhost:5173 || (kill $DEV_PID && exit 1)
kill $DEV_PID

# 2. Production build - MUST succeed
NODE_ENV=production npm run build
# Check for build warnings in output
# If ANY warnings exist, fix them before proceeding

# 3. Bundle size check
du -sh dist/
# Verify no unexpected size increase (>10% requires justification)

# 4. Preview production build
npm run preview &
PREVIEW_PID=$!
sleep 5
curl -f http://localhost:4173 || (kill $PREVIEW_PID && exit 1)
kill $PREVIEW_PID
```

##### Phase 4: Testing Validation
```bash
# ALL tests must pass

# 1. Run all tests
npm test
# If any test fails, fix it

# 2. Run tests in CI mode
CI=true npm test -- --coverage

# 3. Check test coverage (if applicable)
# New code should maintain or improve coverage

# 4. Manual testing checklist
# - [ ] Feature works as described in issue
# - [ ] No console errors in browser
# - [ ] No visual regressions
# - [ ] Performance is acceptable
# - [ ] Works in Chrome, Firefox, Safari (if applicable)
```

##### Phase 5: Component Validation (For UI Changes)
```bash
# For any component changes:

# 1. Check for DOM structure consistency
grep -r "className=" src/ | sort | uniq -c | sort -rn | head -20
# Look for inconsistent patterns

# 2. Verify accessibility
# - All interactive elements have proper ARIA labels
# - Color contrast meets WCAG standards
# - Keyboard navigation works

# 3. Check for prop validation
# All components should have proper TypeScript types

# 4. Verify no inline styles (use CSS modules/styled components)
grep -r "style={{" src/ | grep -v "test"
# Should return minimal or no results
```

##### Phase 6: Git History Validation
```bash
# 1. Squash WIP commits
git rebase -i main
# Combine related commits into logical units

# 2. Verify commit messages follow convention
git log main..HEAD --oneline
# Each message should start with: feat|fix|refactor|docs|test|chore|ci|perf

# 3. No merge commits from main
git log main..HEAD --merges
# Should be empty

# 4. Verify branch is up to date
git fetch origin main
git rebase origin/main
```

##### Phase 7: Documentation Validation
```bash
# 1. Update relevant documentation
# - [ ] Code comments for complex logic
# - [ ] JSDoc/TSDoc for public APIs
# - [ ] README updates if adding features
# - [ ] CHANGELOG entry if user-facing change

# 2. Remove unnecessary comments
grep -r "TODO\|FIXME\|XXX\|HACK" src/ --exclude-dir=node_modules
# Address or remove before PR

# 3. Verify examples work (if applicable)
# Test any code examples in documentation
```

##### Phase 8: Final Validation Script
Create and run this validation script before EVERY PR:
```bash
#!/bin/bash
# Save as: validate-pr.sh

set -e  # Exit on any error

echo "🔍 Starting PR Validation..."

# Check PR size
LINES_CHANGED=$(git diff main --stat | tail -1 | awk '{print $4}')
if [ "$LINES_CHANGED" -gt 300 ]; then
    echo "❌ PR too large: $LINES_CHANGED lines (max: 300)"
    echo "   Split into smaller PRs"
    exit 1
fi

# Clean state
cd client
rm -rf node_modules package-lock.json dist
npm install

# Quality checks
echo "✓ Running linter..."
npm run lint

echo "✓ Running TypeScript..."
npm run typecheck

echo "✓ Running tests..."
npm test

echo "✓ Building application..."
NODE_ENV=production npm run build

# Check for console statements
if grep -r "console\." src/ --exclude-dir=node_modules | grep -v "eslint-disable"; then
    echo "⚠️  Warning: console statements found"
fi

# Check for build output warnings
if [ -f dist/index.html ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo "🎉 All validations passed! Ready for PR."
```

#### PR Scope Guidelines

##### Acceptable PR Sizes
- **Small**: < 100 lines - Quick fixes, small features
- **Medium**: 100-200 lines - Single feature/component
- **Large**: 200-300 lines - Complex feature (requires justification)
- **Too Large**: > 300 lines - MUST be split

##### Signs Your PR is Too Large
1. Changes span multiple unrelated components
2. Mixing refactoring with new features
3. Including "while I'm here" fixes
4. Adding tests for existing code (separate PR)
5. Updating dependencies (separate PR)

##### How to Split Large PRs
1. **Feature flags**: Implement behind flags, merge incrementally
2. **Vertical slicing**: Complete one user path at a time
3. **Horizontal slicing**: Backend first, then frontend
4. **Refactor first**: Separate refactoring from features
5. **Tests separately**: Add missing tests in dedicated PR

#### Common PR Rejection Reasons

##### Immediate Rejections
- Build failures
- Linting errors
- TypeScript errors
- Failing tests
- > 300 lines without justification
- Mixed concerns (multiple issues in one PR)
- No issue reference
- Console errors in browser

##### Review Required
- No tests for new features
- Decreased test coverage
- Performance regressions
- Accessibility issues
- Security vulnerabilities
- Breaking changes without documentation

#### AI Agent Specific Guidelines

When creating PRs as an AI agent:

1. **ALWAYS run the full validation script first**
2. **NEVER include unnecessary files**:
   - No test files unless specifically fixing tests
   - No markdown files unless specifically requested
   - No example/demo files unless part of requirements
3. **ALWAYS verify the build succeeds locally**
4. **NEVER create PRs with known issues**
5. **ALWAYS keep PRs focused on single issue**
6. **VERIFY all GitHub Actions will pass**:
   ```bash
   # Simulate CI environment
   CI=true NODE_ENV=test npm test
   CI=true NODE_ENV=production npm run build
   ```

#### Emergency PR Checklist

If you must create a PR quickly:
```bash
# Absolute minimum - NEVER skip these
cd client
npm run lint         # MUST pass
npm run typecheck    # MUST pass
npm test            # MUST pass
npm run build       # MUST succeed
git diff main --stat # MUST be < 300 lines
```

### 5. Issue & PR Best Practices

#### Writing Good Issues
```markdown
## Problem Description
Clear description of what needs to be done and why

## Acceptance Criteria
- [ ] Specific measurable outcomes
- [ ] User-facing changes described
- [ ] Technical requirements listed

## Technical Details
- Implementation approach
- Files that need modification
- Dependencies or blockers

## Testing Plan
How to verify the implementation works
```

#### PR Description Template
```markdown
## Summary
Brief description of changes (2-3 sentences)

## Changes
- Bullet list of specific changes
- Link to related documentation
- Screenshots if UI changes

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No regressions identified

## Related Issues
Fixes #NUMBER

## Checklist
- [ ] Code follows project conventions
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] CI checks pass
```

#### Review Etiquette
- **Authors**: Keep PRs focused and small
- **Reviewers**: Provide constructive feedback
- **Both**: Communicate clearly and respectfully

### 6. Code Review Checklist

#### Automated Validation (MUST be completed before review)
**Prerequisites**: The PR author MUST have completed the full "Comprehensive PR Validation Checklist" (Section 4) before requesting review.

```bash
# Reviewer should verify these pass locally:
cd client
npm run lint
npm run typecheck  
npm test
NODE_ENV=production npm run build
```

#### Manual Review Checklist

##### Code Quality
- [ ] PR is focused on a single issue/feature (< 300 lines)
- [ ] No unrelated files included
- [ ] Code follows project conventions and patterns
- [ ] No unnecessary complexity added
- [ ] Error handling is appropriate
- [ ] No security vulnerabilities introduced
- [ ] No performance regressions

##### Testing
- [ ] Tests exist for new functionality
- [ ] Tests are meaningful (not just for coverage)
- [ ] Edge cases are tested
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] No skipped tests without justification

##### Physics Simulation Specific
- [ ] Ice rule (2-in/2-out) is preserved in all transformations
- [ ] Vertex types match research paper specifications
- [ ] DWBC boundary conditions are maintained
- [ ] Monte Carlo dynamics follow reference implementation
- [ ] Rendering accurately represents vertex states

##### Documentation
- [ ] Complex logic has explanatory comments
- [ ] Public APIs have JSDoc/TSDoc
- [ ] Changes are reflected in relevant documentation
- [ ] No TODO/FIXME comments without issue references

##### UI/UX (if applicable)
- [ ] UI changes match design specifications
- [ ] Accessibility requirements met (ARIA, keyboard nav)
- [ ] Responsive design maintained
- [ ] No visual regressions
- [ ] Consistent styling patterns

##### Final Checks
- [ ] CI/CD pipeline passes all checks
- [ ] No console.log statements (unless intentional)
- [ ] Bundle size impact is acceptable
- [ ] Breaking changes are documented
- [ ] Issue will be fully resolved by this PR

### 7. Release Process

#### Version Numbering
Follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

#### Release Checklist
```bash
# 1. Ensure main branch is clean
git checkout main
git pull origin main
gh pr list  # Should be empty or only approved PRs

# 2. Verify CI is passing
gh run list --branch main --limit 1
gh workflow run ci.yml --ref main  # Trigger if needed

# 3. Update version
npm version patch  # or minor/major
# This updates package.json and creates a git tag

# 4. Update CHANGELOG.md
echo "## [$(node -p "require('./package.json').version")] - $(date +%Y-%m-%d)" >> CHANGELOG.md
# Add release notes

# 5. Commit and push
git add CHANGELOG.md
git commit -m "chore: release v$(node -p "require('./package.json').version")"
git push origin main --tags

# 6. Create GitHub release
gh release create v$(node -p "require('./package.json').version") \
  --title "Release v$(node -p "require('./package.json').version")" \
  --notes-file CHANGELOG.md \
  --target main

# 7. Deploy (if automated deployment is set up)
# CI will automatically deploy tagged releases
```

### 8. Deployment

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

### 9. Monitoring & Maintenance

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

### GitHub Actions Pipeline

Our CI/CD pipeline (`.github/workflows/ci.yml`) runs automatically on:
- Push to main, develop, or feature branches
- Pull requests to main or develop

#### Pipeline Jobs

1. **Code Quality** - ESLint and TypeScript checks
2. **Test Suite** - Matrix testing on Node 20.x and 22.x
3. **Build Application** - Production build verification
4. **Security Scan** - npm audit for vulnerabilities
5. **Bundle Analysis** - Size reporting for PRs
6. **Deploy Preview** - Automated PR comments

#### Key Configuration

```yaml
# Use Node 20+ for Vite 7.0.0 compatibility
env:
  NODE_VERSION: '20.x'

# Required permissions for PR operations
permissions:
  contents: read
  pull-requests: write
  issues: write
```

#### Running CI Locally

Simulate CI checks before pushing:
```bash
cd client
npm run lint
npm run typecheck
npm test -- --passWithNoTests
NODE_ENV=production npm run build
```

### Pre-commit Hooks (Optional)

For automatic local checks, set up husky:
```bash
cd client
npx husky-init && npm install
npx husky add .husky/pre-commit "npm run lint && npm run typecheck"
npx husky add .husky/pre-push "npm test"
```

### CI/CD Best Practices

1. **Fix CI failures immediately** - Don't merge with failing checks
2. **Keep CI fast** - Parallel jobs, dependency caching
3. **Progressive enhancement** - Non-blocking warnings while fixing
4. **Monitor trends** - Track test coverage and build times
5. **Document CI changes** - Update this file when modifying pipeline

## Troubleshooting Guide

### Common Issues

#### Physics Simulation Issues
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

#### Build & CI/CD Issues
1. **Build Failures**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node version: `node --version` (should be 20+)
   - Verify TypeScript version compatibility
   - Check for import errors in build output

2. **CI Pipeline Failures**
   - **Vite build errors**: Ensure Node 20+ is used
   - **Web Worker issues**: Check error handling in workerInterface.ts
   - **Permission errors**: Verify GitHub token permissions in workflow
   - **Test failures**: Run locally with `npm test` to debug

3. **GitHub Actions Issues**
   ```bash
   # View recent workflow runs
   gh run list --limit 5
   
   # View specific run details
   gh run view RUN_ID
   
   # Download artifacts from failed run
   gh run download RUN_ID
   
   # Re-run failed jobs
   gh run rerun RUN_ID --failed
   ```

4. **PR Merge Conflicts**
   ```bash
   # Update feature branch with main
   git checkout main
   git pull origin main
   git checkout feature/your-branch
   git rebase main
   # Resolve conflicts if any
   git push --force-with-lease
   ```

## SDLC Completeness Checklist

For each feature or fix, ensure:

### Planning Phase
- [ ] GitHub issue created with clear requirements
- [ ] Acceptance criteria defined
- [ ] Technical approach documented
- [ ] Dependencies identified

### Development Phase
- [ ] Feature branch created from main
- [ ] Tests written (TDD preferred)
- [ ] Code implementation complete
- [ ] Local testing passed
- [ ] Documentation updated

### Review Phase
- [ ] PR created with detailed description
- [ ] CI checks passing
- [ ] Code review requested
- [ ] Feedback addressed
- [ ] Final approval received

### Deployment Phase
- [ ] PR merged to main
- [ ] Issue closed with summary
- [ ] Release notes updated (if applicable)
- [ ] Stakeholders notified

### Post-Deployment
- [ ] Monitor for issues
- [ ] Gather feedback
- [ ] Document lessons learned
- [ ] Create follow-up issues if needed

## Important Notes

- **Source of Truth**: Always defer to research paper and `main.c` reference implementation
- **Reproducibility**: Use seeded RNG to ensure deterministic behavior for testing
- **Performance**: Start with main-thread implementation; optimize with Web Workers if needed
- **Validation**: The `/dwbc-verify` route must visually match paper figures exactly
- **Code Style**: Follow existing patterns, avoid unnecessary comments, maintain consistency
- **SDLC Compliance**: Every change should follow the complete software development lifecycle