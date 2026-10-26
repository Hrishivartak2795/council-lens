"""Council Lens API — FastAPI over the SQLite database built by etl.py."""
import os, re, sqlite3, uuid
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

DB_PATH = os.environ.get("CL_DB", os.path.join(os.path.dirname(__file__), "council.db"))
STATIC = os.environ.get("CL_STATIC", os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
CATEGORIES = ["Military/Security", "Administrative/Procedural", "Legal/Institutional",
              "Economic", "Humanitarian", "Diplomatic"]

app = FastAPI(title="Council Lens API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def rows(cur):
    return [dict(r) for r in cur.fetchall()]


def fts_query(q: str) -> str:
    """Turn free text into a safe FTS5 prefix query: 'binding sanct' -> "binding"* "sanct"*"""
    terms = re.findall(r"[\w']+", q.lower())
    return " ".join(f'"{t}"*' for t in terms)


# ------------------------------------------------------------------ filters
class Filters:
    """Shared resolution-level filter set, used by search, trends and compare."""

    def __init__(self, year_from=None, year_to=None, region=None, subject=None, topic=None, q=None):
        self.year_from, self.year_to = year_from, year_to
        self.region, self.subject, self.topic, self.q = region, subject, topic, q

    def where(self, alias="r"):
        w, p = [], []
        if self.year_from:
            w.append(f"{alias}.year >= ?"); p.append(self.year_from)
        if self.year_to:
            w.append(f"{alias}.year <= ?"); p.append(self.year_to)
        if self.region:
            w.append(f"{alias}.region = ?"); p.append(self.region)
        if self.subject:
            w.append(f"{alias}.subject = ?"); p.append(self.subject)
        if self.topic:
            w.append(f"{alias}.dominant_topic = ?"); p.append(self.topic)
        if self.q and fts_query(self.q):
            w.append(f"{alias}.number IN (SELECT rowid FROM resolutions_fts WHERE resolutions_fts MATCH ?)")
            p.append(fts_query(self.q))
        return (" AND ".join(w) or "1=1"), p


def stats(con, f: Filters):
    where, p = f.where("r")
    base = f"FROM clauses c JOIN resolutions r ON r.number = c.resolution_number WHERE {where}"
    tot = con.execute(f"SELECT COUNT(*) n, AVG(c.binding) b, AVG(c.intensity) i, COUNT(DISTINCT r.number) res {base}", p).fetchone()
    cats = {r["category"]: r["n"] for r in con.execute(f"SELECT c.category, COUNT(*) n {base} GROUP BY 1", p)}
    n = tot["n"] or 0
    top_verbs = rows(con.execute(f"SELECT c.verb, COUNT(*) n {base} GROUP BY 1 ORDER BY 2 DESC LIMIT 8", p))
    return {
        "resolutions": tot["res"], "clauses": n,
        "binding_rate": round(tot["b"] or 0, 4), "avg_intensity": round(tot["i"] or 0, 3),
        "categories": [{"category": c, "count": cats.get(c, 0), "share": round(cats.get(c, 0) / n, 4) if n else 0} for c in CATEGORIES],
        "top_verbs": top_verbs,
    }


# ------------------------------------------------------------------ reference data
@app.get("/api/meta")
def meta():
    con = db()
    return {
        "totals": dict(con.execute("SELECT COUNT(*) resolutions, SUM(n_clauses>0) with_clauses, MIN(year) first_year, MAX(year) last_year FROM resolutions").fetchone())
                  | {"clauses": con.execute("SELECT COUNT(*) FROM clauses").fetchone()[0]},
        "eras": rows(con.execute("SELECT * FROM eras ORDER BY start_year")),
        "topics": rows(con.execute("SELECT * FROM topics ORDER BY id")),
        "categories": CATEGORIES,
        "regions": rows(con.execute("SELECT region, COUNT(*) n FROM resolutions GROUP BY 1 ORDER BY 2 DESC")),
        "subjects": rows(con.execute("SELECT subject, region, COUNT(*) n FROM resolutions GROUP BY 1,2 ORDER BY 3 DESC")),
    }


# ------------------------------------------------------------------ resolutions
@app.get("/api/resolutions")
def list_resolutions(q: Optional[str] = None, year_from: Optional[int] = None, year_to: Optional[int] = None,
                     region: Optional[str] = None, subject: Optional[str] = None, topic: Optional[int] = None,
                     category: Optional[str] = None, binding_only: bool = False,
                     sort: str = Query("newest", pattern="^(newest|oldest|most_binding|most_clauses)$"),
                     page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100)):
    con = db()
    f = Filters(year_from, year_to, region, subject, topic, q)
    where, p = f.where("r")
    if category:
        where += " AND r.number IN (SELECT resolution_number FROM clauses WHERE category = ?)"; p.append(category)
    if binding_only:
        where += " AND r.number IN (SELECT resolution_number FROM clauses WHERE binding = 1)"
    order = {"newest": "r.number DESC", "oldest": "r.number ASC",
             "most_binding": "binding_rate DESC, r.number DESC", "most_clauses": "r.n_clauses DESC"}[sort]
    total = con.execute(f"SELECT COUNT(*) FROM resolutions r WHERE {where}", p).fetchone()[0]
    items = rows(con.execute(f"""
        SELECT r.number, r.symbol, r.year, r.adopted_on, r.era, r.subject, r.region, r.dominant_topic, r.n_clauses,
               (SELECT AVG(binding) FROM clauses WHERE resolution_number = r.number) AS binding_rate,
               (SELECT category FROM clauses WHERE resolution_number = r.number GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1) AS top_category,
               substr(r.full_text, 1, 0) AS _
        FROM resolutions r WHERE {where} ORDER BY {order} LIMIT ? OFFSET ?""", p + [size, (page - 1) * size]))
    for it in items:
        it.pop("_", None)
    return {"total": total, "page": page, "size": size, "items": items}


@app.get("/api/resolutions/{number}")
def get_resolution(number: int):
    con = db()
    r = con.execute("SELECT * FROM resolutions WHERE number = ?", (number,)).fetchone()
    if not r:
        raise HTTPException(404, f"Resolution {number} is not in this dataset (1990–2025, extracted PDFs only).")
    res = dict(r)
    res["clauses"] = rows(con.execute("SELECT id, verb, text, binding, intensity, category FROM clauses WHERE resolution_number = ? ORDER BY position", (number,)))
    res["related"] = rows(con.execute(
        "SELECT number, symbol, year, subject FROM resolutions WHERE subject = ? AND number != ? ORDER BY ABS(number - ?) LIMIT 6",
        (res["subject"], number, number)))
    neighbours = con.execute("SELECT MAX(number) FROM resolutions WHERE number < ?", (number,)).fetchone()[0], \
                 con.execute("SELECT MIN(number) FROM resolutions WHERE number > ?", (number,)).fetchone()[0]
    res["prev"], res["next"] = neighbours
    return res


# ------------------------------------------------------------------ clauses
@app.get("/api/clauses")
def search_clauses(q: Optional[str] = None, year_from: Optional[int] = None, year_to: Optional[int] = None,
                   region: Optional[str] = None, subject: Optional[str] = None, category: Optional[str] = None,
                   binding: Optional[bool] = None, min_intensity: int = 1,
                   page: int = Query(1, ge=1), size: int = Query(25, ge=1, le=100)):
    con = db()
    f = Filters(year_from, year_to, region, subject)
    where, p = f.where("r")
    if q and fts_query(q):
        where += " AND c.id IN (SELECT rowid FROM clauses_fts WHERE clauses_fts MATCH ?)"; p.append(fts_query(q))
    if category:
        where += " AND c.category = ?"; p.append(category)
    if binding is not None:
        where += " AND c.binding = ?"; p.append(1 if binding else 0)
    if min_intensity > 1:
        where += " AND c.intensity >= ?"; p.append(min_intensity)
    base = f"FROM clauses c JOIN resolutions r ON r.number = c.resolution_number WHERE {where}"
    total = con.execute(f"SELECT COUNT(*) {base}", p).fetchone()[0]
    items = rows(con.execute(f"SELECT c.id, c.resolution_number, r.symbol, c.year, r.subject, c.verb, c.text, c.binding, c.intensity, c.category {base} ORDER BY c.year DESC, c.id LIMIT ? OFFSET ?",
                             p + [size, (page - 1) * size]))
    return {"total": total, "page": page, "size": size, "items": items}


# ------------------------------------------------------------------ analytics
@app.get("/api/trends")
def trends(region: Optional[str] = None, subject: Optional[str] = None, year_from: Optional[int] = None, year_to: Optional[int] = None):
    con = db()
    f = Filters(year_from, year_to, region, subject)
    where, p = f.where("r")
    topics = rows(con.execute(f"""SELECT r.year, COUNT(*) resolutions, ROUND(AVG(topic_1),4) t1, ROUND(AVG(topic_2),4) t2,
                                ROUND(AVG(topic_3),4) t3, ROUND(AVG(topic_4),4) t4 FROM resolutions r WHERE {where} GROUP BY r.year ORDER BY r.year""", p))
    cl = {r["year"]: r for r in rows(con.execute(
        f"""SELECT c.year, COUNT(*) clauses, ROUND(AVG(c.binding),4) binding_rate, ROUND(AVG(c.intensity),3) avg_intensity
            FROM clauses c JOIN resolutions r ON r.number=c.resolution_number WHERE {where} GROUP BY c.year""", p))}
    cats = {}
    for r in con.execute(f"SELECT c.year, c.category, COUNT(*) n FROM clauses c JOIN resolutions r ON r.number=c.resolution_number WHERE {where} GROUP BY 1,2", p):
        cats.setdefault(r["year"], {})[r["category"]] = r["n"]
    out = []
    for t in topics:
        y = t["year"]; c = cl.get(y, {}); n = c.get("clauses", 0)
        out.append(t | {"clauses": n, "binding_rate": c.get("binding_rate"), "avg_intensity": c.get("avg_intensity"),
                        "categories": {k: round(cats.get(y, {}).get(k, 0) / n, 4) if n else 0 for k in CATEGORIES}})
    return {"filters": {"region": region, "subject": subject}, "years": out, "summary": stats(con, f)}


@app.get("/api/eras")
def eras():
    con = db()
    out = []
    for e in rows(con.execute("SELECT * FROM eras ORDER BY start_year")):
        out.append(e | stats(con, Filters(e["start_year"], e["end_year"])))
    return out


@app.get("/api/compare")
def compare(a_year_from: Optional[int] = None, a_year_to: Optional[int] = None, a_region: Optional[str] = None, a_subject: Optional[str] = None,
            b_year_from: Optional[int] = None, b_year_to: Optional[int] = None, b_region: Optional[str] = None, b_subject: Optional[str] = None):
    con = db()
    A = stats(con, Filters(a_year_from, a_year_to, a_region, a_subject))
    B = stats(con, Filters(b_year_from, b_year_to, b_region, b_subject))
    diff = {"binding_rate_pp": round((B["binding_rate"] - A["binding_rate"]) * 100, 1),
            "avg_intensity": round(B["avg_intensity"] - A["avg_intensity"], 2),
            "categories_pp": {c["category"]: round((c["share"] - a["share"]) * 100, 1) for a, c in zip(A["categories"], B["categories"])}}
    return {"a": A, "b": B, "diff": diff}


# ------------------------------------------------------------------ users, notebook, feedback
class NewUser(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)


class BookmarkIn(BaseModel):
    resolution_number: int
    note: str = Field("", max_length=2000)


class NoteIn(BaseModel):
    note: str = Field("", max_length=2000)


class FeedbackIn(BaseModel):
    clause_id: int
    suggested_category: Optional[str] = None
    suggested_binding: Optional[bool] = None
    comment: str = Field("", max_length=1000)


def require_user(con, user_id):
    if not user_id or not con.execute("SELECT 1 FROM users WHERE id = ?", (user_id,)).fetchone():
        raise HTTPException(401, "Unknown user — create a profile first.")


@app.post("/api/users")
def create_user(u: NewUser):
    con = db(); uid = uuid.uuid4().hex
    con.execute("INSERT INTO users(id, display_name) VALUES (?,?)", (uid, u.display_name.strip())); con.commit()
    return {"id": uid, "display_name": u.display_name.strip()}


@app.get("/api/bookmarks")
def list_bookmarks(x_user_id: str = Header(None)):
    con = db(); require_user(con, x_user_id)
    return rows(con.execute("""SELECT b.id, b.resolution_number, b.note, b.created_at, r.symbol, r.subject, r.year
                               FROM bookmarks b JOIN resolutions r ON r.number=b.resolution_number
                               WHERE b.user_id=? ORDER BY b.created_at DESC, b.id DESC""", (x_user_id,)))


@app.post("/api/bookmarks", status_code=201)
def add_bookmark(b: BookmarkIn, x_user_id: str = Header(None)):
    con = db(); require_user(con, x_user_id)
    if not con.execute("SELECT 1 FROM resolutions WHERE number=?", (b.resolution_number,)).fetchone():
        raise HTTPException(404, "No such resolution")
    con.execute("INSERT INTO bookmarks(user_id, resolution_number, note) VALUES (?,?,?) ON CONFLICT(user_id, resolution_number) DO UPDATE SET note=excluded.note",
                (x_user_id, b.resolution_number, b.note)); con.commit()
    return dict(con.execute("SELECT * FROM bookmarks WHERE user_id=? AND resolution_number=?", (x_user_id, b.resolution_number)).fetchone())


@app.patch("/api/bookmarks/{number}")
def edit_note(number: int, n: NoteIn, x_user_id: str = Header(None)):
    con = db(); require_user(con, x_user_id)
    cur = con.execute("UPDATE bookmarks SET note=? WHERE user_id=? AND resolution_number=?", (n.note, x_user_id, number)); con.commit()
    if not cur.rowcount:
        raise HTTPException(404, "Not bookmarked")
    return {"ok": True}


@app.delete("/api/bookmarks/{number}")
def remove_bookmark(number: int, x_user_id: str = Header(None)):
    con = db(); require_user(con, x_user_id)
    row = con.execute("SELECT * FROM bookmarks WHERE user_id=? AND resolution_number=?", (x_user_id, number)).fetchone()
    if not row:
        raise HTTPException(404, "Not bookmarked")
    con.execute("DELETE FROM bookmarks WHERE id=?", (row["id"],)); con.commit()
    return {"deleted": dict(row)}  # returned so the UI can offer Undo


@app.post("/api/feedback", status_code=201)
def add_feedback(fb: FeedbackIn, x_user_id: str = Header(None)):
    con = db(); require_user(con, x_user_id)
    if fb.suggested_category and fb.suggested_category not in CATEGORIES:
        raise HTTPException(422, "Unknown category")
    if not con.execute("SELECT 1 FROM clauses WHERE id=?", (fb.clause_id,)).fetchone():
        raise HTTPException(404, "No such clause")
    cur = con.execute("INSERT INTO clause_feedback(user_id, clause_id, suggested_category, suggested_binding, comment) VALUES (?,?,?,?,?)",
                      (x_user_id, fb.clause_id, fb.suggested_category,
                       None if fb.suggested_binding is None else int(fb.suggested_binding), fb.comment)); con.commit()
    return {"id": cur.lastrowid}


@app.get("/api/feedback/summary")
def feedback_summary():
    con = db()
    return {"total": con.execute("SELECT COUNT(*) FROM clause_feedback").fetchone()[0],
            "by_category": rows(con.execute("""SELECT c.category AS current, f.suggested_category AS suggested, COUNT(*) n
                                               FROM clause_feedback f JOIN clauses c ON c.id=f.clause_id GROUP BY 1,2 ORDER BY 3 DESC"""))}


# ------------------------------------------------------------------ serve the built frontend
if os.path.isdir(STATIC):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC, "assets")), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        fp = os.path.join(STATIC, path)
        if path and os.path.isfile(fp):
            return FileResponse(fp)
        return FileResponse(os.path.join(STATIC, "index.html"))
