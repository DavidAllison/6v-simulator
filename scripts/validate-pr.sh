#!/bin/bash

# PR Validation Script
# Ensures PRs meet quality standards before submission
# Usage: ./scripts/validate-pr.sh [options]
# Options:
#   --strict    Use strict mode (300 lines max)
#   --extended  Use extended mode (500 lines max)
#   --help      Show this help message

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration defaults
MAX_LINES=300
EXTENDED_MAX_LINES=500
CURRENT_LIMIT=$MAX_LINES
ERRORS=0
WARNINGS=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --strict)
            CURRENT_LIMIT=$MAX_LINES
            shift
            ;;
        --extended)
            CURRENT_LIMIT=$EXTENDED_MAX_LINES
            shift
            ;;
        --help)
            echo "PR Validation Script"
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --strict    Use strict mode (300 lines max)"
            echo "  --extended  Use extended mode (500 lines max)"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Utility functions
print_header() {
    echo ""
    echo -e "${BLUE}${BOLD}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD}  $1${NC}"
    echo -e "${BLUE}${BOLD}═══════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
}

# Get current branch
get_current_branch() {
    git rev-parse --abbrev-ref HEAD
}

# Check PR size
check_pr_size() {
    print_header "Checking PR Size"
    
    local base_branch="main"
    local current_branch=$(get_current_branch)
    
    if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
        print_warning "You're on the main branch. Checking unstaged changes instead."
        local lines_changed=$(git diff --stat | tail -1 | awk '{print $4}')
    else
        # Get the merge base with main
        local merge_base=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "")
        
        if [[ -z "$merge_base" ]]; then
            print_warning "Cannot find merge base with main branch"
            local lines_changed=$(git diff --stat | tail -1 | awk '{print $4}')
        else
            local lines_changed=$(git diff --stat $merge_base..HEAD | tail -1 | awk '{print $4}')
        fi
    fi
    
    # Handle empty diff
    if [[ -z "$lines_changed" ]]; then
        lines_changed=0
    fi
    
    echo "Lines changed: $lines_changed (Limit: $CURRENT_LIMIT)"
    
    if [[ $lines_changed -gt $CURRENT_LIMIT ]]; then
        print_error "PR exceeds size limit ($lines_changed > $CURRENT_LIMIT lines)"
        echo "Consider splitting this PR into smaller, focused changes"
        
        # Show file breakdown
        echo ""
        echo "Files with most changes:"
        if [[ "$current_branch" == "main" ]]; then
            git diff --stat | head -10
        else
            git diff --stat $merge_base..HEAD 2>/dev/null | head -10 || git diff --stat | head -10
        fi
    elif [[ $lines_changed -gt $MAX_LINES ]]; then
        print_warning "PR is large ($lines_changed lines). Consider if it can be split."
    else
        print_success "PR size is acceptable ($lines_changed lines)"
    fi
}

# Check for console.log statements
check_console_logs() {
    print_header "Checking for Console Logs"
    
    # Get files to check, excluding tests and client directory initially
    local files_to_check=$(git ls-files client/src | grep -E '\.(ts|tsx|js|jsx)$' | grep -v test | grep -v spec 2>/dev/null || true)
    
    if [[ -z "$files_to_check" ]]; then
        print_success "No source files to check for console logs"
        return
    fi
    
    local console_logs=""
    while IFS= read -r file; do
        if [[ -f "$file" ]] && grep -q "console\.\(log\|error\|warn\|debug\)" "$file" 2>/dev/null; then
            console_logs="${console_logs}${file}\n"
        fi
    done <<< "$files_to_check"
    
    if [[ -n "$console_logs" ]]; then
        print_warning "Found console statements in:"
        echo "$console_logs" | while read file; do
            if [[ ! "$file" =~ test|spec|\.test\.|\.spec\. ]]; then
                echo "  - $file"
                grep -n "console\.\(log\|error\|warn\|debug\)" "$file" | head -3 | sed 's/^/    /'
            fi
        done
        echo "Remove debugging statements before creating PR"
    else
        print_success "No console.log statements found"
    fi
}

# Check for TODO/FIXME comments
check_todos() {
    print_header "Checking for TODO/FIXME Comments"
    
    local todos=$(git ls-files | grep -E '\.(ts|tsx|js|jsx|css|md)$' | xargs grep -l "TODO\|FIXME\|XXX\|HACK" 2>/dev/null || true)
    
    if [[ -n "$todos" ]]; then
        local count=$(echo "$todos" | wc -l)
        print_warning "Found TODO/FIXME comments in $count file(s):"
        echo "$todos" | head -5 | while read file; do
            echo "  - $file"
            grep -n "TODO\|FIXME\|XXX\|HACK" "$file" | head -2 | sed 's/^/    /'
        done
        if [[ $count -gt 5 ]]; then
            echo "  ... and $((count - 5)) more files"
        fi
        echo "Consider addressing these before creating PR"
    else
        print_success "No TODO/FIXME comments found"
    fi
}

# Check for large blocks of commented code
check_commented_code() {
    print_header "Checking for Commented Code Blocks"
    
    local files=$(git ls-files | grep -E '\.(ts|tsx|js|jsx)$')
    local found_issues=false
    
    echo "$files" | while read file; do
        if [[ -f "$file" ]]; then
            # Look for blocks of 5+ consecutive comment lines
            local blocks=$(awk '/^[[:space:]]*(\/\/|\/\*|\*)/{count++; next} {if(count>=5) print NR-count "-" NR-1; count=0} END{if(count>=5) print NR-count+1 "-" NR}' "$file")
            
            if [[ -n "$blocks" ]]; then
                if [[ "$found_issues" == "false" ]]; then
                    print_warning "Found large commented code blocks:"
                    found_issues=true
                fi
                echo "  - $file"
                echo "$blocks" | head -2 | while read range; do
                    echo "    Lines: $range"
                done
            fi
        fi
    done
    
    if [[ "$found_issues" == "false" ]]; then
        print_success "No large commented code blocks found"
    fi
}

# Run linting checks
check_linting() {
    print_header "Running Linting Checks"
    
    cd client 2>/dev/null || cd . 
    
    if [[ -f "package.json" ]]; then
        if npm run lint > /dev/null 2>&1; then
            print_success "Linting passed"
        else
            print_error "Linting failed - run 'npm run lint' to see errors"
        fi
    else
        print_info "No package.json found, skipping lint check"
    fi
    
    cd - > /dev/null 2>&1
}

# Run TypeScript checks
check_typescript() {
    print_header "Running TypeScript Checks"
    
    cd client 2>/dev/null || cd .
    
    if [[ -f "tsconfig.json" ]]; then
        if npm run typecheck > /dev/null 2>&1; then
            print_success "TypeScript compilation passed"
        else
            print_error "TypeScript errors found - run 'npm run typecheck' to see errors"
        fi
    else
        print_info "No tsconfig.json found, skipping TypeScript check"
    fi
    
    cd - > /dev/null 2>&1
}

# Check for tests
check_tests() {
    print_header "Checking Test Coverage"
    
    local current_branch=$(get_current_branch)
    
    if [[ "$current_branch" == "main" ]]; then
        print_info "On main branch, skipping test file check"
    else
        # Check if any source files were modified
        local source_files=$(git diff --name-only origin/main...HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' | grep -v test | grep -v spec || true)
        
        if [[ -n "$source_files" ]]; then
            # Check if corresponding test files exist or were modified
            local tests_found=false
            echo "$source_files" | while read file; do
                local test_file="${file%.ts}.test.ts"
                local spec_file="${file%.ts}.spec.ts"
                
                if git diff --name-only origin/main...HEAD 2>/dev/null | grep -q -E "(${test_file}|${spec_file})" 2>/dev/null; then
                    tests_found=true
                fi
            done
            
            if [[ "$tests_found" == "false" ]]; then
                print_warning "Source files modified but no test files updated"
                echo "Consider adding or updating tests for your changes"
            else
                print_success "Test files found for changes"
            fi
        else
            print_info "No source files modified"
        fi
    fi
}

# Check branch naming
check_branch_naming() {
    print_header "Checking Branch Naming"
    
    local current_branch=$(get_current_branch)
    
    if [[ "$current_branch" =~ ^(feat|fix|docs|style|refactor|test|chore)/issue-[0-9]+-.+ ]]; then
        print_success "Branch naming follows convention: $current_branch"
    elif [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
        print_warning "Working on main branch - create a feature branch before PR"
    else
        print_warning "Branch name doesn't follow convention: $current_branch"
        echo "Expected format: {type}/issue-{number}-{description}"
        echo "Example: feat/issue-20-pr-validation"
    fi
}

# Generate summary report
generate_report() {
    print_header "Validation Summary"
    
    local total_issues=$((ERRORS + WARNINGS))
    
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}${BOLD}Found $ERRORS error(s) that must be fixed${NC}"
    fi
    
    if [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}${BOLD}Found $WARNINGS warning(s) to review${NC}"
    fi
    
    if [[ $total_issues -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}✅ All checks passed! PR is ready for submission${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Run: git add -A"
        echo "2. Run: git commit -m 'Your commit message'"
        echo "3. Run: git push -u origin $(get_current_branch)"
        echo "4. Run: gh pr create"
        return 0
    else
        echo ""
        echo -e "${BOLD}PR Validation Result: ${RED}NEEDS ATTENTION${NC}"
        echo ""
        echo "Please address the issues above before creating a PR."
        echo "For urgent changes, you can use --extended mode for a higher line limit."
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BOLD}🔍 PR Validation Script v1.0${NC}"
    echo "Validating with ${CURRENT_LIMIT} line limit"
    echo ""
    
    check_git_repo
    check_branch_naming
    check_pr_size
    check_console_logs
    check_todos
    check_commented_code
    check_linting
    check_typescript
    check_tests
    
    echo ""
    generate_report
}

# Run main function
main