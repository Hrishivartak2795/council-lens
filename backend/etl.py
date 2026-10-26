"""Build council.db (SQLite) from the resolution-analysis pipeline outputs.

Usage: python etl.py <path-to-un_sc_project> [out.db]

Inputs (from the analysis pipeline):
  topic_assignments.csv   per-resolution LDA topic mix (1,705 resolutions)
  solution_clauses.csv    19,582 classified operative clauses (1,644 resolutions)
  texts/SRES_xxxx_yyyy.txt extracted resolution text
Derived here (not in the original pipeline):
  adoption date  -> regex on "Adopted by the Security Council ... on DD Month YYYY"
  primary subject/region -> most-mentioned country in the text (gazetteer below);
                            P5 members are excluded because they appear as actors,
                            not subjects. Resolutions with no country mentioned
                            at least twice are labelled "Thematic".
"""
import csv, os, re, sqlite3, sys
from collections import Counter

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "council.db")

ERAS = [
    ("Post-Cold War", 1990, 2001),
    ("War on Terror", 2002, 2010),
    ("Arab Spring & Fragmentation", 2011, 2018),
    ("Recent Era", 2019, 2025),
]
TOPICS = {
    1: "Peacekeeping & Missions",
    2: "State Accountability & Tribunals",
    3: "Somalia & African Conflicts",
    4: "Humanitarian & Civilian Protection",
}

REGION = {
    "Africa": "Somalia, Sudan, South Sudan, Darfur, Libya, Liberia, Sierra Leone, Côte d'Ivoire, Cote d'Ivoire, Democratic Republic of the Congo, Congo, Central African Republic, Mali, Burundi, Rwanda, Angola, Mozambique, Ethiopia, Eritrea, Western Sahara, Guinea-Bissau, Chad, Nigeria, Uganda, Zimbabwe, Abyei, Burkina Faso, Niger, Cameroon, Kenya, Djibouti, Namibia, Sahel, Lake Chad, Guinea, Gabon, Mauritania, Togo, South Africa, Zaire, Comoros",
    "Middle East": "Iraq, Kuwait, Iran, Syria, Syrian Arab Republic, Lebanon, Israel, Palestine, Palestinian, Yemen, Golan, Gaza, Jordan, Bahrain, Qatar",
    "Europe": "Bosnia and Herzegovina, Croatia, Kosovo, Serbia, Yugoslavia, Former Yugoslav Republic of Macedonia, Georgia, Cyprus, Ukraine, Albania, Montenegro, Abkhazia, Azerbaijan, Armenia, Nagorny Karabakh, Moldova, Slovenia",
    "Asia-Pacific": "Afghanistan, Cambodia, Timor-Leste, East Timor, Democratic People's Republic of Korea, Myanmar, Tajikistan, Nepal, Pakistan, India, Sri Lanka, Papua New Guinea, Bougainville, Solomon Islands, Fiji, Kyrgyzstan",
    "Americas": "Haiti, Colombia, El Salvador, Guatemala, Nicaragua, Venezuela, Cuba, Panama, Honduras",
}
NAMES = [(n.strip(), r) for r, blob in REGION.items() for n in blob.split(",")]
NAMES = sorted(set(NAMES), key=lambda x: -len(x[0]))
CANON = {"Syrian Arab Republic": "Syria", "Cote d'Ivoire": "Côte d'Ivoire", "East Timor": "Timor-Leste",
         "Democratic People's Republic of Korea": "DPRK", "Palestinian": "Palestine", "Darfur": "Sudan",
         "Abyei": "Sudan / South Sudan", "Golan": "Israel–Syria (Golan)", "Former Yugoslav Republic of Macedonia": "North Macedonia",
         "Nagorny Karabakh": "Azerbaijan", "Abkhazia": "Georgia", "Bougainville": "Papua New Guinea", "Gaza": "Palestine",
         "Democratic Republic of the Congo": "DR Congo", "Zaire": "DR Congo", "Yugoslavia": "Former Yugoslavia"}
THEMES = [
    ("Non-proliferation", r"proliferation|weapons of mass destruction"),
    ("Women, peace & security", r"women and peace and security|role of women|sexual violence in conflict"),
    ("Children & armed conflict", r"children and armed conflict|children affected by armed conflict"),
    ("Counter-terrorism", r"terroris"),
    ("Tribunals & justice", r"tribunal|international residual mechanism"),
    ("Peacekeeping (general)", r"peacekeeping operations"),
    ("UN membership & appointments", r"recommends to the general assembly|admission|membership in the united nations|international court of justice"),
]

def norm(t):
    return t.replace("’", "'").replace(" ", " ")

def subject_of(text):
    t = norm(text)
    counts = Counter()
    masked = t
    for name, region in NAMES:
        pat = re.compile(r"\b" + re.escape(norm(name)) + r"\b")
        n = len(pat.findall(masked))
        if n:
            counts[(CANON.get(name, name), region)] += n
            masked = pat.sub(" ", masked)  # don't double count "Sudan" inside "South Sudan"
    if counts:
        (name, region), n = counts.most_common(1)[0]
        if n >= 2:
            return name, region
    low = t.lower()
    scores = [(len(re.findall(pat, low)), -i, theme) for i, (theme, pat) in enumerate(THEMES)]
    best = max(scores)
    if best[0] > 0:
        return best[2], "Thematic"
    return "Other / general", "Thematic"

MONTHS = "January February March April May June July August September October November December".split()
def date_of(text, year):
    m = re.search(r"on\s+(\d{1,2})\s+(" + "|".join(MONTHS) + r")\s+(\d{4})", text)
    if m and int(m.group(3)) == year:
        return f"{m.group(3)}-{MONTHS.index(m.group(2))+1:02d}-{int(m.group(1)):02d}"
    return None

def era_of(y):
    for name, a, b in ERAS:
        if a <= y <= b:
            return name
    return None

def main():
    if os.path.exists(OUT):
        os.remove(OUT)
    db = sqlite3.connect(OUT)
    db.executescript(open(os.path.join(os.path.dirname(__file__), "schema.sql")).read())

    topics = {}
    with open(os.path.join(SRC, "topic_assignments.csv")) as f:
        for r in csv.DictReader(f):
            topics[int(r["resolution_number"])] = r

    clauses_by_res = Counter()
    with open(os.path.join(SRC, "solution_clauses.csv")) as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        clauses_by_res[int(r["resolution_number"])] += 1

    res_numbers = sorted(set(topics) | set(clauses_by_res))
    texts_dir = os.path.join(SRC, "texts")
    for n in res_numbers:
        t = topics.get(n)
        year = int(t["year"]) if t else int(next(r["year"] for r in rows if int(r["resolution_number"]) == n))
        fn = os.path.join(texts_dir, f"SRES_{n:04d}_{year}.txt")
        text = open(fn, encoding="utf-8", errors="replace").read() if os.path.exists(fn) else ""
        subj, region = subject_of(text[:6000]) if text else ("Other / general", "Thematic")
        db.execute(
            "INSERT INTO resolutions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (n, f"S/RES/{n} ({year})", year, date_of(text[:600], year), era_of(year), subj, region,
             int(t["dominant_topic"]) if t else None,
             float(t["topic_1"]) if t else None, float(t["topic_2"]) if t else None,
             float(t["topic_3"]) if t else None, float(t["topic_4"]) if t else None,
             clauses_by_res.get(n, 0), text, f"https://undocs.org/en/S/RES/{n}({year})"),
        )
    for i, r in enumerate(rows):
        db.execute("INSERT INTO clauses VALUES (?,?,?,?,?,?,?,?,?)",
                   (i + 1, int(r["resolution_number"]), int(r["year"]), r["verb"], r["clause"],
                    1 if r["binding"] == "True" else 0, int(r["intensity"]), r["category"], i + 1))
    db.execute("INSERT INTO clauses_fts(clauses_fts) VALUES('rebuild')")
    db.execute("INSERT INTO resolutions_fts(rowid, subject, body) SELECT number, subject, full_text FROM resolutions")
    for k, v in TOPICS.items():
        db.execute("INSERT INTO topics VALUES (?,?)", (k, v))
    for name, a, b in ERAS:
        db.execute("INSERT INTO eras VALUES (?,?,?)", (name, a, b))
    db.commit()
    c = db.execute("SELECT COUNT(*), SUM(n_clauses>0) FROM resolutions").fetchone()
    print(f"resolutions={c[0]} with_clauses={c[1]} clauses={len(rows)} -> {OUT}")
    for row in db.execute("SELECT region, COUNT(*) FROM resolutions GROUP BY region ORDER BY 2 DESC"):
        print(row)

if __name__ == "__main__":
    main()
