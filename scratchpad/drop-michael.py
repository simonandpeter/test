"""Remove the Archangel Michael troparion filed under Alexander Nevsky.

The text is «Небесних војинстав архистратиже», the Archangel's troparion, in
Serbian spelling. pravoslavno.rs publishes it under Nevsky's own heading, so
the misfiling is upstream and not a scrape error - which is why it was held
rather than deleted until the author ruled on 2026-09-12.

Prints what it is about to delete before deleting it.
"""
import io, json, os, sys

os.chdir(r"C:\Users\matei\Documents\Agios Website\main")

SAINT = "saints/alexander-nevsky/saint.json"
HOLD = "scripts/hymn-wrong-saint.json"

hold = json.load(io.open(HOLD, encoding="utf-8"))
targets = [h for h in hold if h["slug"] == "alexander-nevsky"]
if not targets:
    print("nothing held for alexander-nevsky")
    sys.exit(0)

d = json.load(io.open(SAINT, encoding="utf-8"))
hymns = d.get("hymns", [])
keep, dropped = [], []
for h in hymns:
    if any(t["text"].strip() == (h.get("text") or "").strip() for t in targets):
        dropped.append(h)
    else:
        keep.append(h)

print("alexander-nevsky has %d hymns; dropping %d" % (len(hymns), len(dropped)))
for h in dropped:
    print("  %s / %s / %s / %s" % (h.get("church"), h.get("lang"), h.get("kind"), h.get("tone")))
    print("    %s" % (h.get("source") or {}).get("url"))
    print("    %s..." % (h.get("text") or "")[:90])
print("keeping:")
for h in keep:
    print("  %s / %s / %s / %s" % (h.get("church"), h.get("lang"), h.get("kind"), h.get("tone")))

if "--go" not in sys.argv:
    print("\npass --go to write")
    sys.exit(0)

if not dropped:
    print("nothing matched - the hold list and the folder disagree; not writing")
    sys.exit(1)

d["hymns"] = keep
io.open(SAINT, "w", encoding="utf-8", newline="").write(
    json.dumps(d, ensure_ascii=False, indent=2) + "\n")

rest = [h for h in hold if h["slug"] != "alexander-nevsky"]
io.open(HOLD, "w", encoding="utf-8", newline="").write(
    json.dumps(rest, ensure_ascii=False, indent=2) + "\n")
print("\nwritten. hold list now holds %d" % len(rest))
