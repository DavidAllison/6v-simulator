# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
# Note: After creation, update the PR description to include the preview URL
gh pr create \
  --title "feat: Brief description (#NUMBER)" \
  --body "## 🚀 Preview Deployment
**Preview URL:** https://pr-NUMBER.dev.6v.allison.la
> Will update with actual PR number after creation

## Summary
  
Detailed description of changes

## Related Issues
Fixes #NUMBER

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] No regressions identified
- [ ] Preview deployment tested

## Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CI checks pass
- [ ] Preview link included"
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

### 4. Issue & PR Best Practices

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
## 🚀 Preview Deployment
**Preview URL:** https://pr-NUMBER.dev.6v.allison.la
> Replace NUMBER with the actual PR number after creation

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
- [ ] Preview deployment tested

## Related Issues
Fixes #NUMBER

## Checklist
- [ ] Code follows project conventions
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] CI checks pass
- [ ] Preview link included and tested
```

#### Review Etiquette
- **Authors**: Keep PRs focused and small
- **Reviewers**: Provide constructive feedback
- **Both**: Communicate clearly and respectfully

#### PR Scope Guidelines
1. **Single Responsibility**: Each PR should address ONE concern
2. **Line Count**: Aim for <500 lines changed per PR
3. **File Count**: Prefer <10 files changed per PR
4. **No Mixed Concerns**: Never mix:
   - Bug fixes with features
   - Refactoring with new functionality
   - Infrastructure with application code
   - Formatting with logic changes

#### Splitting Large PRs
When a PR grows too large:
1. Use `pr-scope-reviewer` agent to analyze
2. Create separate issues for each concern
3. Cherry-pick relevant changes to new branches
4. Close the bloated PR with explanation

### 5. Code Review Checklist
- [ ] Code follows project conventions
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Ice rule is preserved in all transformations
- [ ] Performance is acceptable
- [ ] Documentation is updated
- [ ] Single responsibility principle maintained (one concern per PR)
- [ ] No unrelated changes mixed in

### 6. Automated PR Review Process

#### Using Specialized Agents for Reviews
When reviewing PRs, use specialized Claude Code agents for comprehensive analysis:

1. **Code Architecture Review** (`code-review-architect`)
   - Validates single responsibility principle
   - Checks architectural compliance
   - Identifies security concerns
   - Ensures test coverage

2. **DevOps Review** (`devops-engineer`)
   - Reviews CI/CD changes
   - Validates hook configurations
   - Checks deployment impacts
   - Assesses security implications

3. **Performance Review** (`site-reliability-engineer`)
   - Analyzes performance impacts
   - Reviews monitoring changes
   - Checks for potential bottlenecks

#### PR Merge Order Strategy
When managing multiple related PRs:

1. **Determine Dependencies**
   - Core bug fixes merge first
   - Code improvements merge second
   - Infrastructure changes merge last

2. **Handle Merge Conflicts**
   ```bash
   # Checkout PR branch
   gh pr checkout PR_NUMBER
   
   # Fetch and merge latest main
   git fetch origin main
   git merge origin/main
   
   # Resolve conflicts
   # Edit conflicted files
   git add -A
   git commit -m "Merge branch 'main' into branch-name"
   git push
   ```

3. **Verify CI Status**
   ```bash
   # Check PR status
   gh pr checks PR_NUMBER
   
   # Watch until complete
   gh pr checks PR_NUMBER --watch
   ```

### 7. Issue Closure Documentation

When closing issues after PR merge:

1. **Include in closure comment:**
   - Summary of changes made
   - PR reference link
   - Key improvements/fixes
   - Any remaining work identified

2. **Example closure:**
   ```markdown
   ## ✅ Issue Resolved
   
   This issue has been resolved in PR #NUMBER
   
   ### Summary of Changes:
   - [List key changes]
   
   ### Key Improvements:
   - [List improvements]
   
   Merged in: [PR link]
   ```

### 8. Release Process

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

### 7. Deployment

#### PR Preview Deployments

Every pull request automatically receives a preview deployment:

1. **Automatic Deployment**
   - Triggered on PR open, sync, or reopen
   - Deploys to `https://pr-{NUMBER}.dev.6v.allison.la`
   - Updates automatically with new commits
   - Cleaned up when PR is closed

2. **Preview URL Format**
   ```
   https://pr-{PR_NUMBER}.dev.6v.allison.la
   ```
   Example: PR #29 deploys to https://pr-29.dev.6v.allison.la

3. **Including Preview Links in PRs**
   - Use the PR template in `.github/pull_request_template.md`
   - Update the preview URL after PR creation with actual number
   - Use helper script: `./scripts/update-pr-preview-url.sh [PR_NUMBER]`
   - Test the preview deployment before requesting review

4. **Preview Deployment Status**
   ```bash
   # Check deployment status
   gh pr checks PR_NUMBER
   
   # View deployment logs
   gh run list --workflow="pr-preview.yml" --limit=5
   ```

5. **Troubleshooting Preview Deployments**
   - Ensure build passes locally: `npm run build`
   - Check TypeScript errors: `npm run typecheck`
   - View workflow logs: `gh run view RUN_ID --log`

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
- **PR Previews**: Automatic S3/CloudFront deployments for all PRs

### 8. Monitoring & Maintenance

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

### Pre-commit Hooks (Active)

Pre-commit hooks are now configured and active using husky and lint-staged:

#### Current Configuration
- **Husky**: Git hooks management (v9.1.7)
- **Lint-staged**: Runs linters on staged files only (v16.1.5)
- **Location**: `.husky/pre-commit`

#### What Happens on Commit
1. ESLint runs with auto-fix on TypeScript/TSX files
2. Prettier formats all supported files
3. Only staged files are checked (performance optimization)
4. Clear success/failure messages displayed

#### Bypass When Needed
```bash
# Skip hooks for emergency fixes
git commit --no-verify -m "Emergency fix"
```

#### Troubleshooting
- If hooks don't run: `git config core.hooksPath .husky`
- To reinstall: `cd client && npm install`
- Check hook permissions: `ls -la .husky/pre-commit` (should be executable)

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