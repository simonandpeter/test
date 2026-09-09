#!/usr/bin/env bash
#
# Push to main, then read the run. **Reading it is not a separate step.**
#
# The protocol has always said to read the Actions run -- its conclusion *and*
# its `flaky` line -- before starting the next thing. On 2026-09-09 a commit was
# pushed, the next task was started immediately, and `main` sat red and
# undeployed for an hour with the cause sitting in a job log nobody opened. That
# is not a discipline problem worth another line in CLAUDE.md; it is a step that
# should not have been skippable.
#
#   bash scripts/push.sh              # push HEAD to main and wait for the run
#   bash scripts/push.sh --no-wait    # push and print the run URL, do not block
#
# Exits non-zero if the push fails, if the ref does not land, or if the run
# concludes anything other than success -- so a caller that stops on failure
# stops for the right reason.
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR" || exit 1

PAT_FILE="C:/Users/matei/Documents/Agios Website Ex/update git.txt"
REMOTE_URL="https://github.com/simonandpeter/test.git"
WAIT=1
[ "${1:-}" = "--no-wait" ] && WAIT=0

if [ -n "$(git status --porcelain)" ]; then
  echo "the working tree is not clean -- commit first:"
  git status --porcelain | sed 's/^/    /'
  exit 1
fi

PAT="$(tr -d ' \r\n' < "$PAT_FILE" | grep -oE 'gh[ps]_[A-Za-z0-9]+')"
if [ -z "$PAT" ]; then
  echo "no token found in $PAT_FILE"
  exit 1
fi

SHA="$(git rev-parse HEAD)"
echo "pushing ${SHA:0:8} $(git log -1 --format=%s | cut -c1-60)"

# The token goes in the URL and never in the output.
git push "https://${PAT}@github.com/simonandpeter/test.git" main 2>&1 \
  | sed "s/${PAT}/***/g" | tail -3
PUSH_RC=${PIPESTATUS[0]}
git remote set-url origin "$REMOTE_URL"

if [ "$PUSH_RC" -ne 0 ]; then
  echo "push failed"
  exit 1
fi

# `git status` lies about this; the remote's own answer is the only one.
LANDED="$(git ls-remote origin main | cut -f1)"
if [ "$LANDED" != "$SHA" ]; then
  echo "the ref did not land: remote is at ${LANDED:0:8}, expected ${SHA:0:8}"
  exit 1
fi
echo "landed: origin/main is ${SHA:0:8}"
git fetch origin --quiet 2>/dev/null

if [ "$WAIT" -eq 0 ]; then
  echo "not waiting. read it with: python scratchpad/ci-flaky.py ${SHA:0:7}"
  exit 0
fi

echo "waiting for the run (about 13 minutes)…"
for _ in $(seq 1 40); do
  OUT="$(python scratchpad/ci.py "${SHA:0:7}" 2>&1)"
  case "$OUT" in
    *in_progress*|*queued*|*"None"*) sleep 60 ;;
    "") sleep 30 ;;
    *)
      echo "$OUT"
      # The conclusion hides a test that failed and passed on retry.
      python scratchpad/ci-flaky.py "${SHA:0:7}" 2>&1 | sed -n '2,8p'
      case "$OUT" in
        *success*) exit 0 ;;
        *) echo "the run did not succeed -- main is red and nothing deployed"; exit 1 ;;
      esac
      ;;
  esac
done
echo "gave up waiting; read it with: python scratchpad/ci-flaky.py ${SHA:0:7}"
exit 1
