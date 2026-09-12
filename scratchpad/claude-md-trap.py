import io, os, sys

os.chdir(r"C:\Users\matei\Documents\Agios Website\main")

TRAP = """18. **A bulk text pass anchors every pattern on the thing it is changing, and
    runs nothing file-wide.** On 2026-09-12 a sweep that stripped 178 dead
    citations also carried three "tidy up what the removal left" regexes, and
    they were applied to the whole of each of the 68 files rather than to the
    span each removal touched. `\\(\\s*\\)` -> `""` deleted **2,587 empty
    parameter lists** - every `foo()` and every `() =>` - and a space collapse
    flattened all indentation. 35 files stopped parsing. The intended
    substitutions were all correct; the cleanup around them did the damage.

    **`npm test` after the pass, before anything else.** It is two seconds and
    it would have caught this immediately. Three more passes were written on
    top of the broken tree first, and their patterns were then derived from
    text that had already been mangled, so they had to be written twice.

    **The repair is restore-and-replay, not repair-in-place.** The damage was
    not invertible; what made it recoverable at all was that every intended
    edit lived in a script under `scratchpad/` and could be re-run against
    files restored from `HEAD`. Write bulk edits as scripts for that reason.
    The cost of not doing so is whatever a subagent had in flight in the same
    files - one file's work was lost here.

"""

p = "CLAUDE.md"
s = io.open(p, encoding="utf-8").read()
anchor = "**When you add an instrument, ask what it would look like if it were doing\nnothing.**"
if s.count(anchor) != 1:
    print("anchor count %d" % s.count(anchor))
    sys.exit(1)
s = s.replace(anchor, TRAP + anchor)
io.open(p, "w", encoding="utf-8", newline="").write(s)
print("trap 18 added")
