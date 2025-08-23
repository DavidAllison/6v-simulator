#!/bin/bash

# Script to update PR description with the correct preview URL
# Usage: ./scripts/update-pr-preview-url.sh [PR_NUMBER]

set -e

# Get PR number from argument or current branch
if [ -n "$1" ]; then
    PR_NUMBER=$1
else
    # Try to get PR number from current branch
    PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null || echo "")
    
    if [ -z "$PR_NUMBER" ]; then
        echo "Error: No PR number provided and could not detect from current branch"
        echo "Usage: $0 [PR_NUMBER]"
        exit 1
    fi
fi

echo "Updating PR #$PR_NUMBER with preview URL..."

# Get current PR body
CURRENT_BODY=$(gh pr view $PR_NUMBER --json body -q .body)

# Check if preview URL is already correctly set
if echo "$CURRENT_BODY" | grep -q "https://pr-${PR_NUMBER}.dev.6v.allison.la"; then
    echo "Preview URL already correctly set for PR #$PR_NUMBER"
    exit 0
fi

# Replace placeholder with actual PR number
UPDATED_BODY=$(echo "$CURRENT_BODY" | sed "s|https://pr-PULL_REQUEST_NUMBER\.dev\.6v\.allison\.la|https://pr-${PR_NUMBER}.dev.6v.allison.la|g")
UPDATED_BODY=$(echo "$UPDATED_BODY" | sed "s|https://pr-NUMBER\.dev\.6v\.allison\.la|https://pr-${PR_NUMBER}.dev.6v.allison.la|g")

# Update PR description
gh pr edit $PR_NUMBER --body "$UPDATED_BODY"

echo "✅ PR #$PR_NUMBER updated with preview URL: https://pr-${PR_NUMBER}.dev.6v.allison.la"