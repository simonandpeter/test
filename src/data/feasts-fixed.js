/**
 * The fixed feasts the corpus cannot hold.
 *
 * `saints/` is a register of *persons*: a folder is a slug, a life, a set of
 * attestations and a name in five languages, and the Daily page's hero is one
 * of those folders. Eight civil days therefore printed nothing, or printed the
 * wrong subject, because the day's principal commemoration is not a person —
 * it is a feast of the Lord, of the Theotokos or of the bodiless powers. No
 * amount of saint-shaped data can carry one, and a folder invented to carry it
 * would have to be counted among the saints, searched among them and linked
 * like them, all three of which would be false.
 *
 * So they live here, as records of a different kind, with three properties the
 * corpus does not have:
 *
 *   - **They are not clickable and have no route.** There is no page behind a
 *     feast, so there is no link to one: the hero prints the title, the icon
 *     and the lede and stops. A "read more" would be a promise the site cannot
 *     keep.
 *   - **They are not saints and are never counted as any.** Nothing here
 *     reaches the manifest, so the All Saints register, its facets and every
 *     count on the site are untouched by this file.
 *   - **They lead the day over any saint of it.** See `lib/fixed-feasts.js`,
 *     which argues the ranking and is the only reader of this array.
 *
 * `observance` is recorded per church **in that church's own calendar**,
 * exactly as a saint's attestation is (`lib/feasts.js` converts both): Greek
 * and Romanian keep these on the revised-Julian reckoning, Russian and Serbian
 * on the Julian, which is why the Nativity stands on the civil 25 December for
 * two churches and on the civil 7 January for the other two. Nothing
 * pre-converted is stored.
 *
 * The titles are the same words `STRINGS.calendar.feasts.names` prints in the
 * Great Feast chip, carried here as well on purpose: the chip's words belong to
 * the reader's language pack and are keyed by `lib/liturgy.js`'s own table,
 * which has nine keys and not these eight — it includes the Exaltation and the
 * Meeting, whose days already have saints, and excludes the Synaxis of the
 * Archangels, which is not a Great Feast. A record that owns its title does not
 * have to agree with that table about what a Great Feast is.
 */

/** Every church keeps all eight; only the reckoning differs. */
const inAllChurches = (day, month) => [
  { church: 'greek', feast: { day, month, calendar: 'revised-julian' } },
  { church: 'romanian', feast: { day, month, calendar: 'revised-julian' } },
  { church: 'russian', feast: { day, month, calendar: 'julian' } },
  { church: 'serbian', feast: { day, month, calendar: 'julian' } },
];

export const FIXED_FEASTS = [
  {
    id: 'theophany',
    title: {
      en: 'Theophany',
      el: 'Τα Θεοφάνεια',
      ro: 'Botezul Domnului',
      ru: 'Богоявление',
      sr: 'Богојављење',
    },
    lede:
      'The baptism of Christ in the Jordan at the hands of John the Forerunner, and the showing of God as Trinity at it: the Father speaks from heaven, the Spirit descends as a dove, the Son stands in the water. The name means the showing-forth of God, and the feast is kept for that showing rather than for the washing, which Christ did not need. Its waters are blessed on the day in every one of the four churches.',
    observance: inAllChurches(6, 1),
    image: {
      file: 'feasts/theophany/icon.jpg',
      meta: 'feasts/theophany/icon.meta.json',
      w: 1000,
      h: 1500,
    },
  },
  {
    id: 'annunciation',
    title: {
      en: 'The Annunciation',
      el: 'Ο Ευαγγελισμός της Θεοτόκου',
      ro: 'Buna Vestire',
      ru: 'Благовещение Пресвятой Богородицы',
      sr: 'Благовести',
    },
    lede:
      'The archangel Gabriel brings the Virgin Mary word that she will bear the Son of God, and she consents: "Behold the handmaid of the Lord." The Church keeps the day as the beginning of the Incarnation itself, nine months before the Nativity, which is why it falls inside Lent and is never moved out of it.',
    observance: inAllChurches(25, 3),
    image: {
      file: 'feasts/annunciation/icon.jpg',
      meta: 'feasts/annunciation/icon.meta.json',
      w: 1000,
      h: 1340,
    },
  },
  {
    id: 'transfiguration',
    title: {
      en: 'The Transfiguration',
      el: 'Η Μεταμόρφωσις του Σωτήρος',
      ro: 'Schimbarea la Față',
      ru: 'Преображение Господне',
      sr: 'Преображење Господње',
    },
    lede:
      'On a mountain before Peter, James and John, Christ is changed in appearance and shines, and Moses and Elijah stand with him. The three disciples are shown the glory that was always his before they are asked to watch him crucified, and the feast is kept for that: not a change in Christ, but a change in what the eyes of the disciples were allowed to see.',
    observance: inAllChurches(6, 8),
    image: {
      file: 'feasts/transfiguration/icon.jpg',
      meta: 'feasts/transfiguration/icon.meta.json',
      w: 1000,
      h: 1264,
    },
  },
  {
    id: 'dormition-of-the-theotokos',
    title: {
      en: 'The Dormition of the Theotokos',
      el: 'Η Κοίμησις της Θεοτόκου',
      ro: 'Adormirea Maicii Domnului',
      ru: 'Успение Пресвятой Богородицы',
      sr: 'Успење Пресвете Богородице',
    },
    lede:
      'The falling-asleep of the Mother of God, and her being taken up by her Son, who is shown in the icon receiving her soul as a child in his arms. The word is deliberate: the Church says she slept rather than that she died, and keeps the day as the last of the twelve Great Feasts of the church year. A fourteen-day fast leads up to it.',
    observance: inAllChurches(15, 8),
    image: {
      file: 'feasts/dormition-of-the-theotokos/icon.jpg',
      meta: 'feasts/dormition-of-the-theotokos/icon.meta.json',
      w: 1000,
      h: 1238,
    },
  },
  {
    id: 'nativity-of-the-theotokos',
    title: {
      en: 'The Nativity of the Theotokos',
      el: 'Το Γενέθλιον της Θεοτόκου',
      ro: 'Nașterea Maicii Domnului',
      ru: 'Рождество Пресвятой Богородицы',
      sr: 'Рођење Пресвете Богородице',
    },
    lede:
      'The birth of the Virgin Mary to Joachim and Anna, who were old and childless. It is the first Great Feast of the church year, which opens on the first of September, and the Church keeps it as the beginning of the Incarnation’s long preparation rather than as a family occasion.',
    observance: inAllChurches(8, 9),
    image: {
      file: 'feasts/nativity-of-the-theotokos/icon.jpg',
      meta: 'feasts/nativity-of-the-theotokos/icon.meta.json',
      w: 1000,
      h: 1419,
    },
  },
  {
    id: 'synaxis-of-the-archangels',
    title: {
      en: 'The Synaxis of the Archangels Michael and Gabriel',
      el: 'Η Σύναξις των Αρχαγγέλων Μιχαήλ και Γαβριήλ',
      ro: 'Soborul Sfinților Arhangheli Mihail și Gavriil',
      ru: 'Собор Архистратига Михаила и прочих Небесных Сил бесплотных',
      sr: 'Сабор Светог Архангела Михаила и Гаврила',
    },
    lede:
      'A common commemoration of the bodiless powers, led by the archangels Michael and Gabriel: the day the Church gathers to honour the angels as a whole rather than any one of them. It is not counted among the Twelve Great Feasts, but it is the principal commemoration of its day in all four churches, and its subject is not a person who ever lived on earth.',
    observance: inAllChurches(8, 11),
    image: {
      file: 'feasts/synaxis-of-the-archangels/icon.jpg',
      meta: 'feasts/synaxis-of-the-archangels/icon.meta.json',
      w: 1000,
      h: 1218,
    },
  },
  {
    id: 'entry-of-the-theotokos',
    title: {
      en: 'The Entry of the Theotokos into the Temple',
      el: 'Τα Εισόδια της Θεοτόκου',
      ro: 'Intrarea în Biserică a Maicii Domnului',
      ru: 'Введение во храм Пресвятой Богородицы',
      sr: 'Ваведење Пресвете Богородице',
    },
    lede:
      'Joachim and Anna bring their daughter, three years old, to the temple in Jerusalem and give her to God, and the high priest leads her into the Holy of Holies. The Church reads the child who is brought into the temple as the temple that is to come, and the feast opens the hymns of the Nativity: it is from this day that the Church begins to sing "Christ is born".',
    observance: inAllChurches(21, 11),
    image: {
      file: 'feasts/entry-of-the-theotokos/icon.jpg',
      meta: 'feasts/entry-of-the-theotokos/icon.meta.json',
      w: 1000,
      h: 1218,
    },
  },
  {
    id: 'nativity-of-christ',
    title: {
      en: 'The Nativity of Christ',
      el: 'Η Γέννησις του Χριστού',
      ro: 'Nașterea Domnului',
      ru: 'Рождество Христово',
      sr: 'Рођење Христово',
    },
    lede:
      'The birth of Christ at Bethlehem, which the Church calls the feast of feasts after Pascha alone. What is kept is the Incarnation: that God was born as a child of a particular mother in a particular place, and not that a teacher appeared. A forty-day fast leads up to it, and the twelve days after it are kept as one festal season.',
    observance: inAllChurches(25, 12),
    image: {
      file: 'feasts/nativity-of-christ/icon.jpg',
      meta: 'feasts/nativity-of-christ/icon.meta.json',
      w: 1000,
      h: 1440,
    },
  },
];

export const FIXED_FEASTS_BY_ID = new Map(FIXED_FEASTS.map((f) => [f.id, f]));
