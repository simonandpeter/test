#!/usr/bin/env bash
#
# Where this repo actually is, against the reference that is not stale.
#
# Two questions were answered wrongly on 2026-09-09 by comparing against the
# wrong thing. "Has another session pushed?" was checked with `git log
# origin/main`, and `origin/main` is a tracking ref that a PAT-URL push never
# updates. "Did this file change?" was checked against `HEAD`, and `HEAD` had
# moved -- another session had committed the file, so it matched, and the answer
# came back "only the mtime changed".
#
# So this asks the remote itself, and remembers what it last showed you.
#
#   bash scripts/state.sh
#
# The marker lives in `.tmp-last-seen`, which is gitignored.
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR" || exit 1

MARKER=".tmp-last-seen"
HEAD_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git ls-remote origin main 2>/dev/null | cut -f1)"

printf 'local  HEAD   %s  %s\n' "${HEAD_SHA:0:8}" "$(git log -1 --format=%s | cut -c1-58)"
if [ -z "$REMOTE_SHA" ]; then
  printf 'remote main   (unreachable)\n'
elif [ "$REMOTE_SHA" = "$HEAD_SHA" ]; then
  printf 'remote main   %s  same\n' "${REMOTE_SHA:0:8}"
else
  printf 'remote main   %s  **DIFFERENT**\n' "${REMOTE_SHA:0:8}"
  if git cat-file -e "$REMOTE_SHA" 2>/dev/null; then
    AHEAD="$(git rev-list --count "$REMOTE_SHA..$HEAD_SHA" 2>/dev/null || echo '?')"
    BEHIND="$(git rev-list --count "$HEAD_SHA..$REMOTE_SHA" 2>/dev/null || echo '?')"
    printf '              %s ahead, %s behind\n' "$AHEAD" "$BEHIND"
  else
    printf '              that commit is not here yet -- `git fetch origin`\n'
  fi
fi

DIRTY="$(git status --porcelain | wc -l | tr -d ' ')"
if [ "$DIRTY" = "0" ]; then
  printf 'tree          clean\n'
else
  printf 'tree          %s changed\n' "$DIRTY"
  git status --porcelain | head -8 | sed 's/^/                /'
  [ "$DIRTY" -gt 8 ] && printf '                … and %s more\n' "$((DIRTY - 8))"
fi

# What moved since you last looked, which is the question `git log` cannot
# answer on its own -- it does not know when you last looked.
if [ -f "$MARKER" ]; then
  SEEN="$(cat "$MARKER")"
  if [ "$SEEN" = "$HEAD_SHA" ]; then
    printf 'since last   nothing\n'
  elif git cat-file -e "$SEEN" 2>/dev/null && ! git merge-base --is-ancestor "$SEEN" "$HEAD_SHA" 2>/dev/null; then
    # The marker exists but is not behind HEAD: the branch was reset or
    # rebased under it, which is a different event from "commits were added"
    # and reads as zero of them if it is not said.
    printf 'since last   %s is no longer an ancestor — reset or rebased away\n' "${SEEN:0:8}"
  elif git cat-file -e "$SEEN" 2>/dev/null; then
    N="$(git rev-list --count "$SEEN..$HEAD_SHA" 2>/dev/null || echo '?')"
    printf 'since last   %s commit(s) on top of %s:\n' "$N" "${SEEN:0:8}"
    git log --format='                %h %ad %s' --date=format:'%d %b %H:%M' \
      "$SEEN..$HEAD_SHA" 2>/dev/null | head -8 | cut -c1-110
  else
    printf 'since last   %s is no longer here (rebased or reset)\n' "${SEEN:0:8}"
  fi
else
  printf 'since last   no marker yet — this run sets one\n'
fi

echo "$HEAD_SHA" > "$MARKER"
