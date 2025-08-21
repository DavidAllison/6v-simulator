#!/bin/bash
# PR Validation Script - Run before creating any pull request
# This script ensures all quality checks pass before PR creation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Starting PR Validation...${NC}"
echo "=================================="

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}❌ Not in a git repository${NC}"
        exit 1
    fi
}

# Function to check PR size
check_pr_size() {
    echo -e "\n${YELLOW}📏 Checking PR size...${NC}"
    
    # Get the number of lines changed
    LINES_CHANGED=$(git diff main --stat 2>/dev/null | tail -1 | awk '{print $4}' | sed 's/[^0-9]*//g')
    
    if [ -z "$LINES_CHANGED" ]; then
        echo -e "${YELLOW}⚠️  Could not determine PR size (might be on main branch)${NC}"
        return
    fi
    
    if [ "$LINES_CHANGED" -gt 300 ]; then
        echo -e "${RED}❌ PR too large: $LINES_CHANGED lines (max: 300)${NC}"
        echo "   Consider splitting into smaller PRs:"
        echo "   - Separate refactoring from features"
        echo "   - Split by component or module"
        echo "   - Create feature flags for incremental merging"
        exit 1
    else
        echo -e "${GREEN}✅ PR size acceptable: $LINES_CHANGED lines${NC}"
    fi
}

# Function to check for unintended files
check_files() {
    echo -e "\n${YELLOW}📁 Checking for unintended files...${NC}"
    
    # Check for common unwanted files
    UNWANTED_FILES=$(git status --porcelain | grep -E '(\.log$|\.tmp$|\.DS_Store|node_modules|dist/|build/|coverage/)' || true)
    
    if [ ! -z "$UNWANTED_FILES" ]; then
        echo -e "${RED}❌ Found potentially unwanted files:${NC}"
        echo "$UNWANTED_FILES"
        echo -e "${YELLOW}   Remove these files or add to .gitignore${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ No unwanted files detected${NC}"
    fi
}

# Function to run code quality checks
run_quality_checks() {
    echo -e "\n${YELLOW}🔧 Running code quality checks...${NC}"
    
    # Navigate to client directory
    cd client
    
    # Clean install
    echo "  Installing dependencies..."
    rm -rf node_modules package-lock.json
    npm install --silent
    
    # Linting
    echo -e "\n  ${YELLOW}Running linter...${NC}"
    if npm run lint > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Linting passed${NC}"
    else
        echo -e "  ${RED}❌ Linting failed${NC}"
        echo "  Run 'npm run lint' to see errors"
        exit 1
    fi
    
    # TypeScript
    echo -e "\n  ${YELLOW}Running TypeScript compiler...${NC}"
    if npm run typecheck > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ TypeScript compilation passed${NC}"
    else
        echo -e "  ${RED}❌ TypeScript compilation failed${NC}"
        echo "  Run 'npm run typecheck' to see errors"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    echo -e "\n${YELLOW}🧪 Running tests...${NC}"
    
    if npm test -- --passWithNoTests > /dev/null 2>&1; then
        echo -e "${GREEN}✅ All tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed${NC}"
        echo "Run 'npm test' to see failures"
        exit 1
    fi
}

# Function to check build
check_build() {
    echo -e "\n${YELLOW}🏗️  Building application...${NC}"
    
    # Clean previous build
    rm -rf dist
    
    if NODE_ENV=production npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Build successful${NC}"
        
        # Check bundle size
        if [ -d dist ]; then
            BUNDLE_SIZE=$(du -sh dist | cut -f1)
            echo -e "  Bundle size: ${BUNDLE_SIZE}"
        fi
    else
        echo -e "${RED}❌ Build failed${NC}"
        echo "Run 'npm run build' to see errors"
        exit 1
    fi
}

# Function to check for console statements
check_console_statements() {
    echo -e "\n${YELLOW}🔍 Checking for console statements...${NC}"
    
    CONSOLE_COUNT=$(grep -r "console\." src/ --exclude-dir=node_modules 2>/dev/null | grep -v "eslint-disable" | wc -l | tr -d ' ')
    
    if [ "$CONSOLE_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Warning: $CONSOLE_COUNT console statement(s) found${NC}"
        echo "  Consider removing before PR unless intentional"
    else
        echo -e "${GREEN}✅ No console statements found${NC}"
    fi
}

# Function to check commit messages
check_commits() {
    echo -e "\n${YELLOW}📝 Checking commit messages...${NC}"
    
    # Get commits not in main
    COMMITS=$(git log main..HEAD --oneline 2>/dev/null)
    
    if [ -z "$COMMITS" ]; then
        echo -e "${YELLOW}⚠️  No commits to check (might be on main branch)${NC}"
        return
    fi
    
    # Check if commits follow conventional format
    INVALID_COMMITS=$(echo "$COMMITS" | grep -vE '^[a-f0-9]+ (feat|fix|refactor|docs|test|chore|ci|perf):' || true)
    
    if [ ! -z "$INVALID_COMMITS" ]; then
        echo -e "${YELLOW}⚠️  Some commits don't follow conventional format:${NC}"
        echo "$INVALID_COMMITS"
        echo "  Consider using: feat|fix|refactor|docs|test|chore|ci|perf"
    else
        echo -e "${GREEN}✅ All commits follow conventional format${NC}"
    fi
}

# Main execution
main() {
    check_git_repo
    check_pr_size
    check_files
    run_quality_checks
    run_tests
    check_build
    check_console_statements
    check_commits
    
    echo -e "\n=================================="
    echo -e "${GREEN}🎉 All validations passed!${NC}"
    echo -e "${GREEN}Your code is ready for pull request.${NC}"
    echo -e "\nNext steps:"
    echo "1. Push your branch: git push -u origin <branch-name>"
    echo "2. Create PR: gh pr create"
    echo "3. Monitor CI: gh pr checks --watch"
}

# Run main function
main