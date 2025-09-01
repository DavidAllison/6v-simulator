#!/bin/bash

# Security check script to scan for accidentally committed secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Scanning repository for potential secrets...${NC}\n"

FOUND_ISSUES=0

# Patterns to search for
PATTERNS=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AKIA[0-9A-Z]{16}"  # AWS Access Key pattern
    "aws_access_key_id"
    "aws_secret_access_key"
    "api[_-]?key"
    "secret[_-]?key"
    "password"
    "passwd"
    "token"
    "Bearer [A-Za-z0-9+/=]{20,}"
)

# Files to exclude from search
EXCLUDE_PATTERNS=(
    "*.md"
    "*.example"
    "*.yml"
    "*.yaml"
    "check-for-secrets.sh"
    ".git/*"
    "node_modules/*"
    "dist/*"
    "build/*"
    "package-lock.json"
)

# Build exclude arguments for git grep
EXCLUDE_ARGS=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --glob=!$pattern"
done

# Check each pattern
for pattern in "${PATTERNS[@]}"; do
    echo -e "Checking for: ${pattern}"
    
    # Search in current files
    if git grep -i "$pattern" $EXCLUDE_ARGS 2>/dev/null; then
        echo -e "${RED}⚠️  Found potential secret matching: $pattern${NC}"
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
done

# Check git history for secrets (last 10 commits)
echo -e "\n${YELLOW}Checking recent git history (last 10 commits)...${NC}"
for pattern in "${PATTERNS[@]}"; do
    if git log -10 -p --all -G"$pattern" --format="%h %s" 2>/dev/null | grep -i "$pattern" 2>/dev/null; then
        echo -e "${RED}⚠️  Found potential secret in git history matching: $pattern${NC}"
        echo -e "${YELLOW}Consider using git filter-branch or BFG Repo-Cleaner to remove from history${NC}"
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
done

# Check for common secret file names
echo -e "\n${YELLOW}Checking for common secret file names...${NC}"
SECRET_FILES=(
    ".env"
    ".env.local"
    "credentials"
    "credentials.json"
    "secrets.json"
    "config.json"
    "aws-credentials.json"
)

for file in "${SECRET_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Check if file is in .gitignore
        if git check-ignore "$file" 2>/dev/null; then
            echo -e "${GREEN}✓ $file exists but is properly gitignored${NC}"
        else
            echo -e "${RED}⚠️  $file exists and is NOT gitignored!${NC}"
            FOUND_ISSUES=$((FOUND_ISSUES + 1))
        fi
    fi
done

# Final report
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $FOUND_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ Security check passed! No secrets detected.${NC}"
    exit 0
else
    echo -e "${RED}❌ Security check failed! Found $FOUND_ISSUES potential issue(s).${NC}"
    echo -e "${YELLOW}Please review and remove any secrets before committing.${NC}"
    echo -e "${YELLOW}If you've already pushed, rotate the exposed credentials immediately!${NC}"
    exit 1
fi