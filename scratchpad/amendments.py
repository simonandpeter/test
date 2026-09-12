"""Every `Amendment N` the source cites, with where and what for.

Amendments were defined in SESSIONS.md, deleted 2026-09-08. Nothing checks
these citations, because there is no document left to check them against.
"""
import io, os, re, collections

ROOT = r"C:\Users\matei\Documents\Agios Website\main"
os.chdir(ROOT)

DIRS = ["src", "e2e", "tests", "scripts", "schema"]
LOOSE = ["index.html", "vite.config.js", "playwright.config.js", "PLAN.md",
         "CLAUDE.md", "HANDOFF.md", "README.md"]
SKIP = {"node_modules", "terrain-tiles", ".git", "dist"}

files = []
for d in DIRS:
    for root, dirs, names in os.walk(d):
        dirs[:] = [x for x in dirs if x not in SKIP]
        for n in names:
            if n.endswith((".js", ".mjs", ".css", ".json", ".html", ".py", ".md")):
                files.append(os.path.join(root, n))
for d in ("docs",):
    for n in os.listdir(d):
        if n.endswith(".md"):
            files.append(os.path.join(d, n))
files += [f for f in LOOSE if os.path.exists(f)]

hits = collections.defaultdict(list)
for f in files:
    if "scratchpad" in f.replace("\\", "/"):
        continue
    try:
        text = io.open(f, encoding="utf-8").read()
    except Exception:
        continue
    for m in re.finditer(r"Amendment (\d+)", text):
        n = int(m.group(1))
        line = text.count("\n", 0, m.start()) + 1
        # the sentence around it, flattened
        a = max(0, m.start() - 190)
        b = min(len(text), m.end() + 190)
        ctx = re.sub(r"\s+", " ", text[a:b])
        ctx = re.sub(r"^\S*\s", "", ctx)
        hits[n].append((f.replace("\\", "/"), line, ctx))

print("%d distinct amendments, %d citations\n" % (len(hits), sum(len(v) for v in hits.values())))
for n in sorted(hits):
    rows = hits[n]
    where = collections.Counter(r[0] for r in rows)
    print("=" * 78)
    print("AMENDMENT %d  -  %d citation(s)" % (n, len(rows)))
    for f, c in where.most_common():
        print("   %s x%d" % (f, c))
    print("   ...%s..." % rows[0][2][:300])
    print()
