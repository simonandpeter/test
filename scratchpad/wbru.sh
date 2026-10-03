#!/usr/bin/env bash
# One batch through BRIEF.md §7 steps 1-6. Stops at the first red.
# Judgement steps stay out of here: the gate's folds, the back-out and the
# commit are the writer's, not a script's.
set -u
day="$1"
batch="ru-$day"
cd "$(dirname "$0")/.." || exit 1

# Up to eight splits, inherited from wbel.sh, which stopped at four and let a
# file go unwritten with its batch record missing rather than red. A Russian
# day needs the headroom more than a Greek one: the synaxes of the new martyrs
# enumerate dozens of names.
drafts=(.tmp/ru-drafts/"$day".json)
for n in 1 2 3 4 5 6 7 8; do drafts+=(.tmp/ru-drafts/"$day"-$n.json); done
found=()
for f in "${drafts[@]}"; do [ -f "$f" ] && found+=("$f"); done
if [ ${#found[@]} -eq 0 ] && [ ! -f .tmp/ru-drafts/up-"$day".json ]; then echo "NO DRAFT for $day"; exit 1; fi

for f in "${found[@]}"; do
  echo "=== dry $f"
  node scripts/draft-saint.mjs "$f" 2>&1 | grep -E '^(✗|\?|!)|problem|Refus' | head -30
  echo "=== write $f"
  node scripts/draft-saint.mjs "$f" --write 2>&1 | tail -4 || exit 1
done

up=".tmp/ru-drafts/up-$day.json"
if [ -f "$up" ]; then
  n=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$up','utf8')).length)")
  if [ "$n" != "0" ]; then
    echo "=== upgrades ($n)"
    PYTHONIOENCODING=utf-8 python .tmp/upgrade.py "$up" || exit 1
    PYTHONIOENCODING=utf-8 python .tmp/upgrade.py "$up" --write || exit 1
  else
    echo "=== upgrades: empty list, nothing to apply"
  fi
fi

echo "=== manifest"
npm run build:manifest 2>&1 | tail -3 | grep -q Built || { npm run build:manifest 2>&1 | tail -12; exit 1; }
echo "=== tests"
npm test 2>&1 | grep -E '(pass|fail) [0-9]+$' || exit 1
echo "=== audits"
node scripts/language-audit.mjs 2>&1 | grep -iE 'mismatch|^!' | head -5
node scripts/date-audit.mjs 2>&1 | grep -iE '^(impossible|wide|backwards)' | head -5
echo "=== gate"
node scripts/corpus-gate.mjs --batch "$batch" 2>&1 | tail -8
