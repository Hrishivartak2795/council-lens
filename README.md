# Council Lens

Interactive explorer for 35 years of UN Security Council resolutions (1990–2025).
HCI course project — Hrishikesh Vartak (70362300041), B.Tech CSBS Sem VII, Batch B2.

* **Front end:** React 18 + Vite, React Router, Recharts (`frontend/`)
* **Back end:** FastAPI + SQLite with FTS5 full-text search (`backend/`)
* **Data:** 1,713 resolutions and 19,582 classified operative clauses, text-extracted from the UN Official Document System (`topic_assignments.csv`, `solution_clauses.csv`, `texts/`)

## Screens
Overview · Resolutions (search + filters) · Resolution detail (clauses with category / binding / intensity, flag a misclassification, save with note) ·
Clause language (search all clauses) · Trends (binding rate, LDA topics, solution mix by year) · Compare (any two eras / regions / countries) · Notebook (notes, undo, CSV export).

## Run locally
```bash
# 1. back end
cd backend
pip install -r requirements.txt
# (re)build the database from the pipeline output folder — council.db is already included
python etl.py /path/to/un_sc_project
uvicorn main:app --port 8000

# 2. front end (dev mode, proxies /api to :8000)
cd ../frontend
npm install
npm run dev            # http://localhost:5173
# or build once and let FastAPI serve it at http://localhost:8000
npm run build
```

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/meta` | totals, eras, topics, categories, regions, subjects |
| GET | `/api/resolutions` | search + filter (`q, year_from, year_to, region, subject, topic, category, binding_only, sort, page`) |
| GET | `/api/resolutions/{n}` | one resolution with clauses, related, prev/next |
| GET | `/api/clauses` | clause search (`q, category, binding, min_intensity, region, year_from, year_to`) |
| GET | `/api/trends` | per-year topic / binding / category series |
| GET | `/api/eras`, `/api/compare` | era stats; A-vs-B comparison |
| POST | `/api/users` | create a name-only profile (returns id; send as `X-User-Id`) |
| GET/POST/PATCH/DELETE | `/api/bookmarks` | notebook |
| POST | `/api/feedback` | flag a clause classification |

## Deploying (e.g. explorer.hrishivartak.in)
Any host that runs Python works (Render, Railway, a VPS): `npm run build` in `frontend/`, then run
`uvicorn main:app --host 0.0.0.0 --port $PORT` from `backend/`. FastAPI serves the built front end and the API from one process.

## Known limitations 
* Primary subject / region is auto-detected from the text (country-name counts) and can be wrong for multi-country resolutions.
* The source dataset stores the first 300 characters of each clause; longer clauses are marked with "…".
* "Only resolutions with binding clauses" barely narrows results (96% of resolutions qualify).
* The notebook is tied to one browser (name-only profile, no login).
