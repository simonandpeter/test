"""The four brand assertions that survived the rename.

`e2e/chrome.spec.js` was restored from HEAD by the defects agent partway
through, after the rename pass had already swept it, so these four came back.
The agent found them failing and left them alone, correctly.
"""
import io, os, sys

os.chdir(r"C:\Users\matei\Documents\Agios Website\main")
bad = []


def sub(old, new, n=1):
    p = "e2e/chrome.spec.js"
    s = io.open(p, encoding="utf-8").read()
    g = s.count(old)
    if g != n:
        bad.append("wanted %d, found %d - %r" % (n, g, old[:70]))
        return
    io.open(p, "w", encoding="utf-8", newline="").write(s.replace(old, new))


# The comment describes a two-name split that no longer exists.
sub("""  // Author, 2026-08-23. The name in the head and the page's nav label. The
  // header's own corner reads a second, deliberately different name from the
  // head's \u2014 "Orthodoxy Daily" until 2026-08-27, when it was renamed "Daily
  // Dox" alongside the Byzantine-majuscule display face. The veil carried the
  // head's name until 2026-08-24 and now carries the header's; that has a
  // test of its own below. The route stays /calendar so no link breaks. Since
  // 2026-08-25 the header's name comes from the pack rather than from the
  // markup, so it follows the chosen language \u2014 the English pack says the
  // same words the markup used to.""",
    """  // Author, 2026-08-23. The name in the head and the page's nav label. The
  // head and the corner carried two deliberately different names until
  // 2026-09-12, when the author ended the split: both are AGIOS now, in every
  // language. The veil carried the head's name until 2026-08-24 and now
  // carries the corner's; that has a test of its own below. The route stays
  // /calendar so no link breaks.""")

sub("  await expect(page).toHaveTitle(/The Orthodox Saint/);",
    "  await expect(page).toHaveTitle(/AGIOS/);")

sub("  expect(html).not.toContain('The Orthodox Saint</div>');",
    "  expect(html).not.toContain('AGIOS</div>');")

sub("""  // The head keeps its own name, which is the half of the split that stands.
  expect(html).toContain('<title>The Orthodox Saint</title>');""",
    """  // And the head carries the same name. This asserted the other half of a
  // two-name split until 2026-09-12; it now asserts that there is one name.
  expect(html).toContain('<title>AGIOS</title>');""")

if bad:
    print("PROBLEMS:")
    for b in bad:
        print("  " + b)
    sys.exit(1)
print("ok")
