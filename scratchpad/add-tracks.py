"""Eight tracks read off the lives in their own folders (2026-09-07).

Each waypoint's `note` says which of its years the life states and which the
track infers, the same rule Chrysostom's and Moses's carry. Run once; it
refuses a folder that already has a track.
"""
import json, io, sys
from collections import OrderedDict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CONSTANTINOPLE = dict(lat=41.0082, lon=28.9784)
ALEXANDRIA = dict(lat=31.2, lon=29.92)
ROME = dict(lat=41.9, lon=12.5)
CARTHAGE = dict(lat=36.85, lon=10.32)
ATHENS = dict(lat=37.98, lon=23.73)

TRACKS = {
    'maximus-the-confessor': [
        dict(place='Constantinople', **CONSTANTINOPLE, uncertainty_km=15, to=633,
             note='Born here about 580, first secretary to Heraclius, then a monk at Chrysopolis across the Bosphorus — the same coordinate at this map\'s scale. 633 is the year the life gives for his leaving for Alexandria.'),
        dict(place='Alexandria', **ALEXANDRIA, uncertainty_km=25, **{'from': 633}, to=639,
             note='"Some six years in and around Alexandria" from 633, so 639 is arithmetic on the life\'s own phrase rather than a year it states; the 25 km is the "around".'),
        dict(place='Carthage', **CARTHAGE, uncertainty_km=15, **{'from': 640}, to=645,
             note='The life dates only the dispute with Pyrrhus, June 645. The arrival is drawn at 640, the year after the Alexandrian six ran out; nothing read here says when he crossed.'),
        dict(place='Rome', **ROME, uncertainty_km=15, **{'from': 646}, to=653,
             note='He went with Pyrrhus to Rome after the dispute and sat at the Lateran council of October 649; Constans had him and the pope seized in 654. 646 and 653 are the edges of what the life places at Rome, not years it prints.'),
        dict(place='Constantinople', **CONSTANTINOPLE, uncertainty_km=15, **{'from': 654}, to=661,
             note='Prison, trial and torture. The exile to Thrace in 656 and the return to a Constantinople prison are too short a journey to draw honestly and are in the life in words; the stay runs to the year before the last exile.'),
        dict(place='Lazica', lat=42.65, lon=42.77, uncertainty_km=150, **{'from': 662},
             note='"He died in exile in 662" is all the life read here says. The place is the standard account\'s — the fortress of Schemaris in Lazica, on the Black Sea\'s eastern shore — and the corpus does not otherwise record it, which is what the 150 km is: a region named by a source outside this folder, not a doubt about the exile.'),
    ],
    'tikhon-of-zadonsk': [
        dict(place='Korotsk', lat=57.98, lon=33.28, uncertainty_km=10, to=1737,
             note='Born here in 1724; sent to the diocesan school at thirteen, which is the 1737.'),
        dict(place='Novgorod', lat=58.5215, lon=31.2755, uncertainty_km=10, **{'from': 1737}, to=1759,
             note='The archbishop\'s school, then the seminary from 1740, kept on to teach from 1754, tonsured and made prefect in 1758.'),
        dict(place='Tver', lat=56.8587, lon=35.9176, uncertainty_km=10, **{'from': 1759}, to=1761,
             note='Archimandrite of the Zheltikov monastery and rector of the seminary. The lots for his consecration were drawn at Petersburg at Pascha 1761 — a visit, not a stay, and not drawn.'),
        dict(place='Novgorod', lat=58.5215, lon=31.2755, uncertainty_km=10, **{'from': 1761}, to=1763,
             note='Bishop of Keksholm and Ladoga, vicar of Novgorod, from 13 May 1761.'),
        dict(place='Voronezh', lat=51.672, lon=39.1843, uncertainty_km=15, **{'from': 1763}, to=1767,
             note='The see, "four and a half years"; given up for his health in 1767.'),
        dict(place='Tolshevo', lat=51.93, lon=39.55, uncertainty_km=15, **{'from': 1767}, to=1769,
             note='The Tolshevo monastery in the forest north-east of Voronezh, his first retreat.'),
        dict(place='Zadonsk', lat=52.3903, lon=38.9236, uncertainty_km=8, **{'from': 1769},
             note='The monastery of the Mother of God, from 1769 to his death in 1783; his relics lie here.'),
    ],
    'nektarios-of-aegina': [
        dict(place='Selymbria', lat=41.07, lon=28.25, uncertainty_km=10, to=1860,
             note='Born 1 October 1846; "at fourteen" to Constantinople, which is 1860.'),
        dict(place='Constantinople', **CONSTANTINOPLE, uncertainty_km=15, **{'from': 1860}, to=1866,
             note='"After seven years there, at twenty" he left for Chios.'),
        dict(place='Chios', lat=38.34, lon=25.98, uncertainty_km=15, **{'from': 1866}, to=1881,
             note='Teaching at Lithi, then the New Monastery — tonsured 7 November 1876, deacon 15 January 1877 — until the earthquake of 1881 sent him to Athens. The 15 km spans the village and the monastery.'),
        dict(place='Athens', **ATHENS, uncertainty_km=10, **{'from': 1881}, to=1885,
             note='The Varvakeion, then the theological faculty. The life has him go to Alexandria in 1881 and be sent straight back by Sophronius to study; a voyage inside one year is not drawn.'),
        dict(place='Alexandria', **ALEXANDRIA, uncertainty_km=25, **{'from': 1885}, to=1890,
             note='Priest, archimandrite, patriarchal commissioner; bishop of Pentapolis 15 January 1889; dismissed without a hearing. The life dates the charges by "1891, two years after", so 1890 for the leaving is inferred.'),
        dict(place='Athens', **ATHENS, uncertainty_km=10, **{'from': 1890}, to=1891,
             note='"A small room on the edge of Athens", unpaid and unemployed.'),
        dict(place='Chalcis', lat=38.4636, lon=23.5997, uncertainty_km=10, **{'from': 1891}, to=1893,
             note='Preacher at Chalcis, cleared in 1891; the preaching tours of Laconia, Phthiotis and Boeotia in 1892 and 1893 went out from here and are not drawn as stays.'),
        dict(place='Athens', **ATHENS, uncertainty_km=10, **{'from': 1894}, to=1908,
             note='Director of the Rizarios school from March 1894, "fourteen years, to 1908". The visit to Athos in 1898 is a journey, not a stay.'),
        dict(place='Aegina', lat=37.75, lon=23.44, uncertainty_km=8, **{'from': 1908},
             note='The monastery at Xantos, from his retirement in 1908. He died in the Aretaieion hospital in Athens on 9 November 1920 and his body was back on the island the same day; the track ends where he was buried.'),
    ],
    'paisios-the-athonite': [
        dict(place='Pharasa', lat=38.08, lon=35.6, uncertainty_km=20, to=1924,
             note='Born 25 July 1924, "a few days before the people of Pharasa left their ancestral ground for Greece" — a stay of days, which is why it opens and closes in one year.'),
        dict(place='Konitsa', lat=40.05, lon=20.75, uncertainty_km=10, **{'from': 1924}, to=1953,
             note='Childhood and youth; the army from 1945 to 1949 and a first look at the Holy Mountain after it are in the life and are not drawn; back as a carpenter for three years, "in 1953, at twenty-nine" he left for good.'),
        dict(place='Esphigmenou', lat=40.35, lon=24.15, uncertainty_km=10, **{'from': 1953}, to=1958,
             note='Rasophore 27 March 1954; Philotheou, a few kilometres down the same peninsula, from about 1956, small schema 12 March 1956.'),
        dict(place='Stomio', lat=40.06, lon=20.72, uncertainty_km=10, **{'from': 1958}, to=1962,
             note='The ruined monastery of the Panagia of Stomio near Konitsa, from August 1958, "four years".'),
        dict(place='Sinai', lat=28.5559, lon=33.9757, uncertainty_km=15, **{'from': 1962}, to=1964,
             note='The cell of Galaction and Episteme, until the climate sent him home.'),
        dict(place='Mount Athos', lat=40.24, lon=24.2, uncertainty_km=15, **{'from': 1964}, to=1993,
             note='Iviron, then Katounakia (1967), Stavronikita (1968) and the Panagouda (1979) — four cells on one peninsula, which the 15 km covers. The operation of 1966 and the convalescence at Souroti are a journey inside this stay and are not drawn.'),
        dict(place='Souroti', lat=40.46, lon=23.1, uncertainty_km=10, **{'from': 1993},
             note='He left the Mountain for the last time in November 1993 for the feast of St Arsenius here, fell ill, and died in the Theagenio hospital in Thessaloniki on 12 July 1994; buried at the hesychasterion.'),
    ],
    'hosius-of-cordoba': [
        dict(place='Córdoba', lat=37.8882, lon=-4.7794, uncertainty_km=10, to=324,
             note='Bishop here "for more than sixty years"; the year he left for Nicaea is the council\'s own.'),
        dict(place='Nicaea', lat=40.43, lon=29.72, uncertainty_km=10, **{'from': 325}, to=325,
             note='The First Ecumenical Council, which the life has him press Constantine to summon and sign first.'),
        dict(place='Córdoba', lat=37.8882, lon=-4.7794, uncertainty_km=10, **{'from': 326}, to=346,
             note='Between the two councils. The life places nothing else in these years.'),
        dict(place='Sardica', lat=42.6977, lon=23.3219, uncertainty_km=10, **{'from': 347}, to=347,
             note='Presided at the council of Sardica in 347 — the life\'s year, kept as printed.'),
        dict(place='Córdoba', lat=37.8882, lon=-4.7794, uncertainty_km=10, **{'from': 348}, to=354,
             note='Home again until the exile; 354 is the standard account\'s edge, not the life\'s.'),
        dict(place='Sirmium', lat=44.97, lon=19.61, uncertainty_km=15, **{'from': 355}, to=357,
             note='"Exiled to Sirmium" for defending Athanasius — the life gives the place and no years; 355 to 357 are the standard account\'s.'),
        dict(place='Córdoba', lat=37.8882, lon=-4.7794, uncertainty_km=10, **{'from': 358},
             note='"Returning to Córdoba he died in 359."'),
    ],
    'augustine-of-hippo': [
        dict(place='Thagaste', lat=36.2864, lon=7.9514, uncertainty_km=15, to=370,
             note='Born 13 November 354. The life read here dates only the baptism and the see; every other year on this track is the Confessions\' own chronology, as the standard accounts read it.'),
        dict(place='Carthage', **CARTHAGE, uncertainty_km=15, **{'from': 371}, to=383,
             note='"Educated in rhetoric at Carthage", and teaching there after; the Manichaean years.'),
        dict(place='Rome', **ROME, uncertainty_km=15, **{'from': 383}, to=384,
             note='"Taught in Rome" — one year, before the Milan chair.'),
        dict(place='Milan', lat=45.4642, lon=9.19, uncertainty_km=15, **{'from': 384}, to=387,
             note='The chair of rhetoric, Ambrose, and the baptism of 387 at thirty-two, which the life dates.'),
        dict(place='Thagaste', lat=36.2864, lon=7.9514, uncertainty_km=15, **{'from': 388}, to=390,
             note='Home, and the first community.'),
        dict(place='Hippo Regius', lat=36.8833, lon=7.75, uncertainty_km=15, **{'from': 391},
             note='Priest from 391, "bishop of the small port of Hippo Regius in 395", "thirty-five years"; died with the Vandals at the walls, 28 August 430.'),
    ],
    'gorazd-of-bohemia': [
        dict(place='Hrubá Vrbka', lat=48.87, lon=17.47, uncertainty_km=5, to=1898,
             note='Born here 26 May 1879. The gymnasium years at Kroměříž are inside this stay and not drawn as one.'),
        dict(place='Olomouc', lat=49.5938, lon=17.2509, uncertainty_km=5, **{'from': 1898}, to=1902,
             note='The Catholic theological faculty, 1898 to 1902; ordained in St Wenceslas\' cathedral on 5 July 1902. The journey to the Kiev Caves Lavra in 1900 is in the life and not drawn.'),
        dict(place='Kroměříž', lat=49.2979, lon=17.3931, uncertainty_km=10, **{'from': 1902}, to=1920,
             note='The parishes of Karlovice and Brumovice from 1902, then chaplain of the psychiatric hospital from 15 September 1906 to 1 May 1920; the 10 km takes in the two parishes.'),
        dict(place='Belgrade', lat=44.8125, lon=20.4612, uncertainty_km=40, **{'from': 1921}, to=1921,
             note='Tonsured at Krušedol on Fruška Gora on 21 September 1921 and consecrated in the cathedral of St Michael on the 25th; the 40 km spans the lavra and the city.'),
        dict(place='Olomouc', lat=49.5938, lon=17.2509, uncertainty_km=5, **{'from': 1921}, to=1941,
             note='Bishop of Moravia and Silesia, and from 1926 of the Czech diocese too, with his seat here — the missions to America (1922) and Germany (1942) and the years of building a church a year across the parishes are journeys out of it, not drawn.'),
        dict(place='Prague', lat=50.0755, lon=14.4378, uncertainty_km=5, **{'from': 1942},
             note='The cathedral of Cyril and Methodius, the parachutists, the arrest of 25 June 1942 and the execution on 4 September; the body was burned.'),
    ],
    'damascene-of-starodub': [
        dict(place='Mayaki', lat=46.42, lon=30.27, uncertainty_km=10, to=1918,
             note='Born here in 1877. Vladivostok, Kazan, the Peking mission and the Caucasus front of 1914 are in the life without years and are not drawn; the stay runs to the death sentence in Orel province in 1918, which he escaped.'),
        dict(place='Kyiv', lat=50.4501, lon=30.5234, uncertainty_km=10, **{'from': 1919}, to=1919,
             note='The St Michael monastery and the academy; hieromonk in 1919.'),
        dict(place='Balaklava', lat=44.5, lon=33.6, uncertainty_km=10, **{'from': 1920}, to=1920,
             note='Archimandrite and superior of the St George monastery; arrested with Dimitri (Abashidze) the same year and banished from the Crimea.'),
        dict(place='Starodub', lat=52.5847, lon=32.7636, uncertainty_km=10, **{'from': 1923}, to=1924,
             note='Consecrated bishop of Starodub by Patriarch Tikhon on 14 September 1923. Where the years 1921 and 1922 were spent the life does not say, and the leg before this stay is drawn across them.'),
        dict(place='Kharkiv', lat=49.9935, lon=36.2304, uncertainty_km=10, **{'from': 1924}, to=1925,
             note='"Banished to Kharkiv in 1924."'),
        dict(place='Moscow', lat=55.7104, lon=37.6323, uncertainty_km=10, **{'from': 1925}, to=1925,
             note='Confined to the Danilov monastery from September 1925; arrested that November, the Butyrka.'),
        dict(place='Poloy', lat=66.0, lon=88.0, uncertainty_km=250, **{'from': 1926}, to=1928,
             note='Three years\' exile in the Turukhansk region — Krasnoyarsk and then Poloy beyond the Arctic Circle, where Kirill (Smirnov) was brought past him in the winter of 1928. The 250 km is that region, not a village.'),
        dict(place='Starodub', lat=52.5847, lon=32.7636, uncertainty_km=10, **{'from': 1929}, to=1929,
             note='Freed in November 1928 and received by Sergius in Moscow on the way; "he settled at Starodub" and was arrested there that November.'),
        dict(place='Solovki', lat=65.0246, lon=35.7099, uncertainty_km=10, **{'from': 1930}, to=1933,
             note='Ten years in the camps, sent here in June 1930, freed in 1933.'),
        dict(place='Kherson', lat=46.6354, lon=32.6169, uncertainty_km=100, **{'from': 1933}, to=1934,
             note='The underground communities of Ukraine and Russia, arrested at Kherson in September 1934; the 100 km is a year of travelling between them, drawn from the one place the life names.'),
        dict(place='Arkhangelsk', lat=64.5401, lon=40.5433, uncertainty_km=200, **{'from': 1934}, to=1936,
             note='"Three years in the Northern region", arrested at Arkhangelsk at the beginning of 1936.'),
        dict(place='Karaganda', lat=49.8047, lon=73.1094, uncertainty_km=30, **{'from': 1936},
             note='The Karaganda camp, and the shooting of 15 September 1937.'),
    ],
}

for slug, track in TRACKS.items():
    path = f'saints/{slug}/saint.json'
    with open(path, encoding='utf-8') as f:
        d = json.load(f, object_pairs_hook=OrderedDict)
    if d.get('track'):
        print(f'{slug}: already has a track, skipped')
        continue
    # Waypoint key order as the schema lists it: place, from, to, lat, lon, uncertainty_km, note.
    ordered = []
    for w in track:
        o = OrderedDict()
        o['place'] = w['place']
        o['from'] = w.get('from', None)
        o['to'] = w.get('to', None)
        o['lat'] = w['lat']
        o['lon'] = w['lon']
        o['uncertainty_km'] = w['uncertainty_km']
        o['note'] = w['note']
        ordered.append(o)
    out = OrderedDict()
    placed = False
    for k, v in d.items():
        out[k] = v
        if k == 'locations':
            out['track'] = ordered
            placed = True
    if not placed:
        # No locations: after the historicity/attestations block, before text.
        out = OrderedDict()
        for k, v in d.items():
            if k == 'text' and 'track' not in out:
                out['track'] = ordered
            out[k] = v
        if 'track' not in out:
            out['track'] = ordered
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{slug}: {len(ordered)} stays, {track[0]["place"]} → {track[-1]["place"]}')
