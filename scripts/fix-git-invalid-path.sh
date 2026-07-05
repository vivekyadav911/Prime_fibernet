#!/bin/bash
set -e
cd "$(dirname "$0")/.."
export FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch -f --index-filter '
  git ls-files | grep -F vivekyadav | while read -r f; do
    git -c core.protectNTFS=false rm --cached --ignore-unmatch "$f" 2>/dev/null || true
    git -c core.protectNTFS=false update-index --force-remove -- "$f" 2>/dev/null || true
  done
' origin/main

echo "Checking for bad paths..."
if git ls-tree -r refs/heads/origin/main --name-only | grep -F vivekyadav; then
  echo "ERROR: bad path still present"
  exit 1
fi

echo "Success. Clean origin/main at $(git rev-parse refs/heads/origin/main)"
