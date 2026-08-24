/**
 * Română — the chrome in the Romanian church's own language (Amendment 36).
 * Partial, STRINGS-shaped; anything absent falls back to English. Comma-below
 * diacritics (ș, ț), as doxologia.ro prints them — Amendment 31's duplicate
 * kontakion was two orthographies of one text, so the house takes a side.
 * Names, lives and the data's own displays stay English (lib/i18n.js).
 */
export const ro = {
  site: {
    name: 'Ortodoxia Zilnică',
    tabName: 'Sfântul Ortodox',
    tagline: 'Sfinții Bisericii Ortodoxe, biserică după biserică — rusă, română, greacă și sârbă, fiecare pe calendarul ei.',
  },

  nav: {
    calendar: 'Astăzi',
    saints: 'Toți sfinții',
    map: 'Hartă',
    about: 'Despre',
  },

  theme: {
    light: 'luminoasă',
    dark: 'întunecată',
    switchTo: 'Treci la tema {next}',
  },

  loading: {
    manifestFailed: 'Lista sfinților nu a putut fi încărcată. Site-ul are nevoie de acest fișier ca să funcționeze, așa că deocamdată nu se poate arăta nimic.',
    retry: 'Încearcă din nou',
  },

  calendar: {
    title: 'Astăzi',
    today: 'Astăzi',
    goToday: 'Mergi la ziua de azi',
    prevDay: 'Ziua precedentă',
    nextDay: 'Ziua următoare',
    prevWeek: 'Săptămâna precedentă',
    nextWeek: 'Săptămâna următoare',
    prevMonth: 'Luna precedentă',
    nextMonth: 'Luna următoare',
    monthView: 'Luna',
    closeMonth: 'Închide luna',
    weekLabel: 'Alege o zi',
    commemorationsFor: 'Pomeniri pentru {date}',
    alsoToday: 'Se mai pomenesc',
    emptyDay: 'Pentru această zi nu sunt încă pomeniri înregistrate. Corpusul crește dosar cu dosar, iar o zi goală e o lipsă în sursele noastre, nu o afirmație despre calendar. Încearcă o zi vecină sau sfinții înșiși.',
    heroIn: 'Calendarul: {church}',
    densityLabel: '{count} pomeniri',
    openSaint: 'Citește despre {name}',
    liturgy: {
      tone: 'Glasul {tone}',
      fast: 'Post — {reason}',
      fish: 'Post, dezlegare la pește — {reason}',
      free: 'Fără post',
      freeBecause: 'Fără post — {reason}',
    },
    readings: {
      heading: 'Citiri',
      source: 'După cum tipărește {source}. Legăturile deschid {bible}.',
      bible: 'traducerea Cornilescu la Bible Gateway',
      epistle: 'Apostol',
      gospel: 'Evanghelie',
    },
    hymns: {
      heading: 'Cântări',
      troparion: 'Troparul',
      kontakion: 'Condacul',
      source: 'Text din {source}',
    },
    silence: {
      otherChurchOne:
        'Nimic în calendarul ales ({church}) astăzi. O pomenire cade azi în ' +
        'calendarul altei biserici — schimbă calendarul din antet ca să o vezi.',
      otherChurchMany:
        'Nimic în calendarul ales ({church}) astăzi. {count} pomeniri cad azi în ' +
        'calendarele altor biserici — schimbă calendarul din antet ca să le vezi.',
    },
  },

  church: {
    open: 'Alege un calendar',
    openLabel: 'Calendarul cărei biserici arată site-ul',
    showing: '{church}',
    showingLabel: 'Calendarul: {church} — schimbă calendarul cărei biserici îl arată site-ul',
    heading: 'Ce calendar ții?',
    groupLabel: 'Biserici',
    calendarOf: { julian: 'Calendarul iulian', 'revised-julian': 'Calendarul iulian îndreptat' },
    names: { russian: 'Rusă', romanian: 'Română', greek: 'Greacă', serbian: 'Sârbă' },
  },

  language: {
    open: 'Limbă',
    openLabel: 'Limba site-ului',
    showingLabel: '{name} — schimbă limba site-ului',
    heading: 'În ce limbă?',
    groupLabel: 'Limbi',
  },

  dates: {
    undated: 'fără dată',
    before: 'înainte de {y}',
    after: 'după {y}',
    reposeIn: 'Adormirea — {when}',
    reposeInThe: 'Adormirea — {when}',
    repose: 'Adormirea — {when}',
    undatedNote: 'Niciun capăt al acestei vieți nu are dată. „Fără dată” e o constatare, nu un gol: nimic din ce am găsit nu fixează o margine.',
  },

  saints: {
    title: 'Toți sfinții',
    lede: 'Întregul corpus, filtrabil.',
    search: 'Caută',
    searchHint: 'nume, tip, biserică, regiune',
    random: 'Un sfânt la întâmplare',
    clear: 'Șterge filtrele',
    countLabel: 'sfinți',
    countAnnounce: '{count} sfinți se potrivesc',
    noneMatch: 'Niciun sfânt din corpus nu se potrivește tuturor acestor filtre. E un fapt despre corpus, nu despre calendar — lărgește un filtru sau șterge-le și privește în jur.',
    undatedTray: '{count} fără dată, puși deoparte',
    undatedNote: 'Un interval de ani nu poate nici include, nici exclude un sfânt fără nicio margine datată, așa că aceștia sunt puși deoparte, nu aruncați. Tuturor celorlalte alegeri le corespund.',
    kept: '{shown}/{total} sfinți venerați în calendarul ales ({church}).',
    keptAll: '{total} de sfinți — întregul corpus.',
    keptTitle: 'Calendarul se schimbă din antet.',
    filters: {
      church: 'Biserica',
      month: 'Luna prăznuirii',
      type: 'Tip',
      sex: 'Sex',
      region: 'Regiune',
      historicity: 'Istoricitate',
      dates: 'Date',
      from: 'Din anul',
      to: 'Până în anul',
      rangeMode: 'Cum se aplică intervalul',
      overlaps: 'Se suprapune',
      within: 'În întregime înăuntru',
      rangeNote: '„Se suprapune” ia orice viață care a atins intervalul; „în întregime înăuntru” — doar viețile cuprinse în el. Anii negativi sunt î.Hr.',
      any: 'Oricare',
    },
    layout: {
      label: 'Afișare',
      cards: 'Cartele',
      rows: 'Rânduri',
      description: 'Cum sunt așezați sfinții',
      detailed: 'Detaliat',
      detailedDescription: 'Arată o scurtă descriere la fiecare sfânt',
    },
    sort: {
      label: 'Ordine',
      name: 'După nume',
      earliest: 'Cei mai timpurii întâi',
      latest: 'Cei mai târzii întâi',
      random: 'La întâmplare',
    },
  },

  contact: {
    heading: 'Contact',
    lede: 'Îndreptări, un sfânt care lipsește, o sursă care spune altfel — toate sunt binevenite.',
    open: 'Deschide o sesizare la proiect',
    note: 'Sesizările fac parte din depozitul public din care e construit acest site, așa că ce scrieți acolo poate fi citit de oricine. Vă rugăm să nu includeți nimic ce n-ați pune pe o pagină a lui.',
  },

  saint: {
    saveNamed: 'Salvează: {name}',
    savedNamed: '{name} e salvat. Apasă ca să-l scoți.',
    back: 'Înapoi la toți sfinții',
    backDaily: 'Înapoi la calendar',
    veneration: 'Cinstire',
    otherChurches: 'Arată celelalte biserici ({count})',
    hideOtherChurches: 'Ascunde celelalte biserici',
    life: 'Viața',
    noLife: 'Viața acestui sfânt nu a fost încă scrisă. Până atunci, articolul e un șir de mărturii.',
    sources: 'Surse',
    related: 'Înrudite',
    sourceFailed: 'Textul sursei nu a putut fi încărcat. E un fișier din dosarul sfântului, așa că de obicei o reîncărcare rezolvă.',
    creditUnrecorded: 'Licența acestei imagini nu e încă înregistrată sau cere o atribuire pe care nu o avem. Până se lămurește, e arătată aici cu înțelegerea că nu poate fi refolosită pe autoritatea acestei pagini.',
    credit: '{credit} · {licence}',
    statusVenerated: 'Cinstit',
    statusRefused: 'Necinstit ca sfânt',
    statusUndocumented: 'Nedocumentat',
    undocumentedNote: 'Fără surse în niciun sens. Lipsa datelor nu e lipsa cinstirii.',
    refusedNote: 'O constatare pozitivă: această biserică a stabilit că nu cinstește această figură.',
    feastThisYear: '{feast} — anul acesta cade pe {gregorian}',
    feastNoOccurrence: '{feast} — nu cade în {year}',
    noFeast: 'Zi de prăznuire neînregistrată.',
    citation: 'Sursa: {text}',
    notFoundTitle: 'Niciun asemenea sfânt',
    notFound: 'La această adresă nu e niciun sfânt. Corpusul e mic și crește dosar cu dosar, așa că o legătură care ieri mergea azi nu poate fi decât o greșeală de tipar.',
    failed: 'Articolul acestui sfânt nu a putut fi încărcat. Textul stă într-un fișier lângă restul site-ului, deci e mai degrabă o poticnire de rețea decât un sfânt lipsă.',
    retry: 'Încearcă din nou',
    historicity: {
      attested: 'Atestat — documentat de surse apropiate evenimentelor.',
      traditional: 'Din tradiție — transmis de tradiție, fără documentare independentă.',
      disputed: 'Disputat — sursele se contrazic sau cercetarea se împarte.',
      legendary: 'Legendar — relatarea e o legendă; persoana poate să nu fi existat.',
    },
    sexLabel: { male: 'Bărbat', female: 'Femeie', unknown: 'Sex neînregistrat' },
    factsLabel: 'Date și locuri',
    kinds: {
      birth: 'Nașterea',
      floruit: 'Perioada de înflorire',
      death: 'Adormirea',
      ministry: 'Slujirea',
      see: 'Scaunul',
      relics: 'Moaștele',
    },
    placeUnnamed: 'Locul e înregistrat doar prin coordonate.',
  },

  shelf: {
    continueReading: 'Continuă lectura',
    saved: 'Salvate',
    resume: 'Reia',
    remove: 'Scoate de pe acest raft',
    removeNamed: 'Scoate pe {name} din „Continuă lectura”',
  },

  map: {
    title: 'Hartă',
    placeholder: 'Globul sosește în sesiunea a 7-a. {located} din {count} sfinți au acum coordonate utilizabile; ceilalți vor aștepta în tava celor nelocalizați — nimeni nu e lăsat deoparte în tăcere.',
    setAside: 'Încă {count} nu sunt în calendarul ales ({church}).',
  },

  about: {
    title: 'Despre',
    placeholder: 'Această pagină va spune limpede politica editorială: criteriul de includere, modelul mărturiilor, regulile de convertire a calendarelor, statistica acoperirii, sursele, licența și cum se trimite o îndreptare. Va fi scrisă pe fond în sesiunea a 9-a, nu umplută cu șabloane acum.',
    privacy: {
      heading: 'Confidențialitate',
      lede:
        'Nu se colectează nimic despre tine și nu e niciun cont de făcut. ' +
        'Ce își amintește site-ul, își amintește pe dispozitivul tău — și doar ' +
        'atât cât îi trebuie ca să-ți dea înapoi pagina unde ai rămas.',
      keepsHeading: 'Ce se păstrează pe dispozitivul tău',
      keeps: [
        'Unde citeai și cât de jos ajunseseși pe pagină.',
        'Sfinții pe care i-ai salvat și sfinții pe care i-ai deschis de curând.',
        'Biserica al cărei calendar l-ai ales, limba și tema luminoasă sau întunecată.',
        'Cum ai lăsat pagina „Toți sfinții” — cartele sau rânduri, și dacă se arătau descrierile.',
      ],
      notHeading: 'Ce nu se face',
      not: [
        'Fără analitice, fără pixeli de urmărire, fără reclame și fără cookie-uri.',
        'Nimic din ce faci aici nu se trimite făcătorilor site-ului sau altcuiva.',
        'Nimic nu se dă mai departe și nu se vinde, pentru că nimic nu se adună de dat sau de vândut.',
      ],
      clearing:
        'Totul rămâne în acest browser, pe acest dispozitiv, iar ștergerea datelor ' +
        'site-ului din browser șterge orice urmă. Nicăieri altundeva nu se ține ' +
        'nimic, deci nu e nimic de cerut să ștergem.',
      hosting:
        'Două note cinstite. Fișierele sunt servite de GitHub Pages, și orice server ' +
        'web vede cererile care îi sunt făcute; e treaba gazdei, nu a site-ului, și ' +
        'așa e fiecare pagină de pe internet. Iar citirile zilei duc la Bible ' +
        'Gateway — urmând o legătură ajungi pe alt site, cu politica lui.',
    },
  },

  notFound: {
    title: 'Negăsit',
    body: 'La această adresă nu e nicio pagină.',
  },

  reasons: {
    'Holy Week': 'Săptămâna Patimilor',
    'Great Lent': 'Postul Mare',
    'Bright Week': 'Săptămâna Luminată',
    'Cheesefare Week': 'Săptămâna brânzei',
    'Cheesefare Week — no meat; dairy and eggs permitted': 'Săptămâna brânzei — fără carne; lactatele și ouăle sunt îngăduite',
    'Palm Sunday': 'Duminica Floriilor',
    'the Annunciation, in Great Lent': 'Buna Vestire, în Postul Mare',
    'the Apostles’ Fast': 'Postul Sfinților Apostoli',
    'the Beheading of the Forerunner': 'Tăierea capului Înaintemergătorului',
    'the Dormition Fast': 'Postul Adormirii Maicii Domnului',
    'the Dormition': 'Adormirea Maicii Domnului',
    'the Eve of Theophany': 'Ajunul Bobotezei',
    'the Exaltation of the Cross': 'Înălțarea Sfintei Cruci',
    'the Nativity Fast': 'Postul Crăciunului',
    'the Transfiguration, in the Dormition Fast': 'Schimbarea la Față, în Postul Adormirii',
    'the days of the Nativity': 'zilele Crăciunului',
    'the week after Pentecost': 'săptămâna de după Rusalii',
    'the week of the Publican and the Pharisee': 'săptămâna Vameșului și a Fariseului',
    'Nativity of the Lord': 'Nașterea Domnului',
    'Theophany': 'Boboteaza',
    'Wednesday': 'miercuri',
    'Friday': 'vineri',
    'a Great Feast on a Wednesday': 'praznic mare într-o miercuri',
    'a Great Feast on a Friday': 'praznic mare într-o vineri',
  },
};
