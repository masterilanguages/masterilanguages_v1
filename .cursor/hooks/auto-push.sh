#!/bin/bash
# Commits and pushes any pending changes when the Cursor agent finishes a task.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  exit 0
fi

cd "$ROOT"

if git diff --quiet && git diff --cached --quiet; then
  exit 0
fi

git add -A

if git diff --cached --quiet; then
  exit 0
fi

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
git commit -m "chore: cursor auto-save ${TIMESTAMP}"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git push origin "$BRANCH"

exit 0
