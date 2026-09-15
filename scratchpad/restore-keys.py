import io, re

VALUES = {
    'src/ui/strings.js':       ("Also commemorated", "Also today"),
    'src/ui/locales/ru.js':    ("\u0422\u0430\u043a\u0436\u0435 \u0441\u043e\u0432\u0435\u0440\u0448\u0430\u0435\u0442\u0441\u044f \u043f\u0430\u043c\u044f\u0442\u044c", "\u0422\u0430\u043a\u0436\u0435 \u0441\u0435\u0433\u043e\u0434\u043d\u044f"),
    'src/ui/locales/ro.js':    ("Se mai pomenesc", "Tot ast\u0103zi"),
    'src/ui/locales/el.js':    ("\u0395\u03c0\u03af\u03c3\u03b7\u03c2 \u03b5\u03bf\u03c1\u03c4\u03ac\u03b6\u03bf\u03bd\u03c4\u03b1\u03b9", "\u0395\u03c0\u03af\u03c3\u03b7\u03c2 \u03c3\u03ae\u03bc\u03b5\u03c1\u03b1"),
    'src/ui/locales/sr.js':    ("\u0422\u0430\u043a\u043e\u0452\u0435 \u0441\u0435 \u043f\u0440\u0430\u0437\u043d\u0443\u0458\u0443", "\u0422\u0430\u043a\u043e\u0452\u0435 \u0434\u0430\u043d\u0430\u0441"),
}

for path, (also, today) in VALUES.items():
    src = io.open(path, encoding='utf-8').read()
    m = re.search(r'^\s{4}nameDays: \{.*\n', src, re.M)
    assert m, path
    block = "    alsoCommemorated: '%s',\n    alsoToday: '%s',\n" % (also, today)
    src = src[:m.start()] + block + src[m.start():]
    io.open(path, 'w', encoding='utf-8', newline='').write(src)
    print('ok', path)
