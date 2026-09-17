"""Stage K's proof: every life.md changed in the working tree holds exactly the
text it held at HEAD once all whitespace is collapsed. Reads HEAD from git, not
from the splitter, so it is independent of what wrote the files."""
import subprocess
import sys

changed = subprocess.run(['git', 'diff', '--name-only', 'HEAD', '--', 'saints'],
                         capture_output=True, text=True, check=True).stdout.split()
bad, ok, other = [], 0, []
for path in changed:
    if not path.endswith('life.md'):
        other.append(path)
        continue
    old = subprocess.run(['git', 'show', f'HEAD:{path}'], capture_output=True, check=True).stdout.decode('utf-8')
    with open(path, encoding='utf-8') as f:
        new = f.read()
    if ' '.join(old.split()) == ' '.join(new.split()):
        ok += 1
    else:
        bad.append(path)
print(f'{ok} life.md files changed, text identical under whitespace collapse; {len(bad)} differ')
for p in bad:
    print('DIFFERS', p)
for p in other:
    print('NOT A LIFE', p)
sys.exit(1 if bad else 0)
