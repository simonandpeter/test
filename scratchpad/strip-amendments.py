"""Strip every `Amendment N` reference. The sentences stay; the pointer goes.

Amendments were defined in SESSIONS.md, deleted 2026-09-08, so all 177 of these
pointed at nothing. Ordered rules: the most specific shape first, so a broad one
never eats a narrow one. Anything left over is printed for a hand to read.
"""
import io, os, re, sys, collections

ROOT = r"C:\Users\matei\Documents\Agios Website\main"
os.chdir(ROOT)

DIRS = ["src", "e2e", "tests", "scripts", "schema", "docs"]
LOOSE = ["index.html", "vite.config.js", "playwright.config.js", "PLAN.md",
         "CLAUDE.md", "HANDOFF.md", "README.md"]
SKIP = {"node_modules", "terrain-tiles", ".git", "dist", "scratchpad"}
A = r"Amendment \d+"

RULES = [
    # "(git log, Amendment 28)" / "(`git log` Amendment 16)" -> keep the git log
    (r"\(git log, %s\)" % A, "(git log)"),
    (r"\(`git log` %s\)" % A, "(`git log`)"),
    (r"`git log` %s" % A, "`git log`"),
    # "(Amendment 31, 2026-08-23)" / "(Amendment 88 (2026-08-31))" -> keep the date
    (r"\(%s, (\d{4}-\d{2}-\d{2})\)" % A, r"(\1)"),
    (r"%s \((\d{4}-\d{2}-\d{2})\)" % A, r"\1"),
    # bare parenthetical, with or without leading punctuation
    (r" \(%s\)" % A, ""),
    (r"\(%s\)" % A, ""),
    (r"; %s\b" % A, ""),
    (r", %s\b(?=[,.)])" % A, ""),
    # possessive: "Amendment 24's budget test" -> "the budget test"
    (r"\b%s's\b" % A, "the"),
    # "at Amendment 25" / "since Amendment 56" / "until Amendment 105"
    (r"\bat %s\b" % A, "then"),
    (r"\bsince %s\b" % A, "since"),
    (r"\buntil %s\b" % A, "until then"),
    (r"\bfrom %s\b" % A, "from the start"),
    # "see Amendment N" / "Amendment N then measured"
    (r"\bsee %s\b" % A, "see the commit"),
]

files = []
for d in DIRS:
    for root, dirs, names in os.walk(d):
        dirs[:] = [x for x in dirs if x not in SKIP]
        for n in names:
            if n.endswith((".js", ".mjs", ".css", ".json", ".html", ".py", ".md")):
                files.append(os.path.join(root, n))
files += [f for f in LOOSE if os.path.exists(f)]

before = after = 0
touched = []
left = []
for f in files:
    try:
        s = io.open(f, encoding="utf-8").read()
    except Exception:
        continue
    n0 = len(re.findall(A, s))
    if not n0:
        continue
    before += n0
    out = s
    for pat, rep in RULES:
        out = re.sub(pat, rep, out)
    # Tidy ONLY what a removal can leave, and nothing file-wide. An earlier
    # version ran three whitespace regexes over the whole file: the empty-paren
    # one deleted every empty parameter list in 68 files (2,587 sites) and the
    # space collapse flattened all indentation. Both are gone; do not add them.
    n1 = len(re.findall(A, out))
    after += n1
    if out != s:
        io.open(f, "w", encoding="utf-8", newline="").write(out)
        touched.append((f.replace("\\", "/"), n0 - n1))
    for m in re.finditer(A, out):
        a = max(0, m.start() - 90)
        b = min(len(out), m.end() + 90)
        left.append((f.replace("\\", "/"), out.count("\n", 0, m.start()) + 1,
                     re.sub(r"\s+", " ", out[a:b])))

print("%d references before, %d left, %d files touched\n" % (before, after, len(touched)))
for f, n in sorted(touched, key=lambda r: -r[1]):
    print("  -%-3d %s" % (n, f))
if left:
    print("\nLEFT FOR A HAND (%d):" % len(left))
    for f, line, ctx in left:
        print("\n  %s:%d\n    ...%s..." % (f, line, ctx))
