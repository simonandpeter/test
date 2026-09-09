"""The feast mark's day value, and every ratio quoted in tokens.css beside it.

docs/daily-desktop-visuals.md §10.5: darken `#ac7700` at constant hue until it
clears 3.05:1 on **both** `--gesso` and `--field`, computed with
`tests/contrast.test.mjs`'s own sRGB luminance function rather than a picker.
`#ac7700` is 3.11:1 on gesso and 2.89:1 on the field, and the field is where
the mark sits.

"Constant hue" here is the three channels scaled together, which holds HSL hue
and saturation exactly; integer rounding then moves the hue by hundredths, so
the search below keeps only candidates within 0.08 deg of the original's
41.51 and takes the lightest that clears the floor.

    python scratchpad/feast-value.py
"""


def chan(c):
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(hex_):
    h = hex_.lstrip('#')
    r, g, b = (chan(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)


def rnd(n):
    return round(n * 100) / 100


DAY = {'gesso': '#ece5d6', 'field': '#e6ddca'}
VIGIL = {'gesso': '#1a1412', 'field': '#221a18', 'bub': '#201917'}

BASE = '#ac7700'
HUE = 60 * (0x77 / 0xAC)

print(f'{BASE} (the value the design arrived with)')
for where, ground in DAY.items():
    print(f'  day {where:6} {rnd(ratio(BASE, ground))}:1')

candidates = []
for r in range(0x78, 0xAD):
    for g in range(0x3C, 0x8C):
        if abs(60 * (g / r) - HUE) > 0.08:
            continue
        hx = '#%02x%02x00' % (r, g)
        rg, rf = ratio(hx, DAY['gesso']), ratio(hx, DAY['field'])
        if rg >= 3.05 and rf >= 3.05:
            candidates.append((r, hx, rnd(60 * (g / r)), rnd(rg), rnd(rf)))
candidates.sort(reverse=True)

print(f'\nlightest constant-hue darkenings clearing 3.05:1 on both (hue {rnd(HUE)} deg)')
for _, hx, hue, rg, rf in candidates[:4]:
    print(f'  {hx}  hue {hue}  gesso {rg}:1  field {rf}:1')

print('\nvigil #a67600, which needed no lifting')
for where, ground in VIGIL.items():
    print(f'  {where:6} {rnd(ratio("#a67600", ground))}:1')
