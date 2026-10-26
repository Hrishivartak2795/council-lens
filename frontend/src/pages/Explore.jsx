import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { CategoryChip, Empty, ErrorBox, Loading, Pager, pct, useApp, CAT_SHORT } from '../components/shared.jsx'

const YEARS = Array.from({ length: 36 }, (_, i) => 1990 + i)
const KEYS = ['q', 'year_from', 'year_to', 'region', 'subject', 'topic', 'category', 'binding_only', 'sort', 'page']

export default function Explore() {
  const { meta, bookmarks, withUser, toast, refreshBookmarks } = useApp()
  const [sp, setSp] = useSearchParams()
  const f = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, sp.get(k) || ''])), [sp])
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [qDraft, setQDraft] = useState(f.q)
  const [showFilters, setShowFilters] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => { setQDraft(f.q) }, [f.q])
  useEffect(() => { if (sp.get('focus')) { searchRef.current?.focus(); set({ focus: '' }, false) } }, []) // eslint-disable-line

  useEffect(() => {
    setData(null); setErr(null)
    api.resolutions({ ...f, page: f.page || 1, sort: f.sort || 'newest' }).then(setData).catch(setErr)
  }, [f])

  function set(patch, resetPage = true) {
    const next = new URLSearchParams(sp)
    Object.entries(patch).forEach(([k, v]) => (v === '' || v == null || v === false ? next.delete(k) : next.set(k, v)))
    if (resetPage) next.delete('page')
    setSp(next)
  }

  const subjects = meta.subjects.filter((s) => !f.region || s.region === f.region)
  const topicLabel = (id) => meta.topics.find((t) => String(t.id) === String(id))?.label
  const active = [
    f.q && ['q', `“${f.q}”`],
    (f.year_from || f.year_to) && ['years', `${f.year_from || 1990}–${f.year_to || 2025}`],
    f.region && ['region', f.region],
    f.subject && ['subject', f.subject],
    f.topic && ['topic', `Topic: ${topicLabel(f.topic)}`],
    f.category && ['category', `Has ${CAT_SHORT[f.category]} clauses`],
    f.binding_only && ['binding_only', 'Has binding clauses'],
  ].filter(Boolean)
  const clearOne = (k) => set(k === 'years' ? { year_from: '', year_to: '' } : { [k]: '' })
  const saved = new Set(bookmarks.map((b) => b.resolution_number))

  const toggleSave = (r) => withUser(async () => {
    if (saved.has(r.number)) {
      await api.removeBookmark(r.number); refreshBookmarks()
      toast(`Removed ${r.symbol} from your notebook`, { action: { label: 'Undo', fn: async () => { await api.addBookmark(r.number); refreshBookmarks() } } })
    } else {
      await api.addBookmark(r.number); refreshBookmarks()
      toast(`Saved ${r.symbol} to your notebook`)
    }
  })

  return (
    <div className="page">
      <header className="page-head">
        <h1>Resolutions</h1>
        <p className="lede">Filter the corpus, then open a resolution to read its operative clauses.</p>
      </header>

      <form className="searchbar" role="search" onSubmit={(e) => { e.preventDefault(); set({ q: qDraft.trim() }) }}>
        <Icon name="search" size={18} />
        <input ref={searchRef} value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Search full text — country, theme, phrase…" aria-label="Search resolutions" />
        {qDraft && <button type="button" className="btn btn-icon" aria-label="Clear search" onClick={() => { setQDraft(''); set({ q: '' }) }}><Icon name="close" size={16} /></button>}
        <button className="btn btn-primary">Search</button>
        <button type="button" className="btn btn-ghost filters-toggle" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
          <Icon name="filter" size={16} /> Filters {active.length > 0 && `(${active.length})`}
        </button>
      </form>

      <div className="explore">
        <aside className={`filters ${showFilters ? 'open' : ''}`} aria-label="Filters">
          <fieldset>
            <legend>Years</legend>
            <div className="row">
              <select value={f.year_from} onChange={(e) => set({ year_from: e.target.value })} aria-label="From year">
                <option value="">1990</option>{YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
              <span className="muted">to</span>
              <select value={f.year_to} onChange={(e) => set({ year_to: e.target.value })} aria-label="To year">
                <option value="">2025</option>{YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div className="era-pills">
              {meta.eras.map((e) => (
                <button type="button" key={e.name}
                  className={`pill ${String(e.start_year) === f.year_from && String(e.end_year) === f.year_to ? 'on' : ''}`}
                  onClick={() => set({ year_from: e.start_year, year_to: e.end_year })} title={e.name}>
                  {e.start_year}–{String(e.end_year).slice(2)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Region</legend>
            <div className="pill-wrap">
              {meta.regions.map((r) => (
                <button type="button" key={r.region} className={`pill ${f.region === r.region ? 'on' : ''}`}
                  onClick={() => set({ region: f.region === r.region ? '' : r.region, subject: '' })}>
                  {r.region} <small>{r.n}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Country or theme</legend>
            <select value={f.subject} onChange={(e) => set({ subject: e.target.value })} aria-label="Country or theme">
              <option value="">Any</option>
              {subjects.map((s) => <option key={s.subject} value={s.subject}>{s.subject} ({s.n})</option>)}
            </select>
          </fieldset>
          <fieldset>
            <legend>Dominant topic</legend>
            <select value={f.topic} onChange={(e) => set({ topic: e.target.value })} aria-label="Dominant topic">
              <option value="">Any</option>
              {meta.topics.map((t) => <option key={t.id} value={t.id}>T{t.id} · {t.label}</option>)}
            </select>
          </fieldset>
          <fieldset>
            <legend>Contains clauses of type</legend>
            <select value={f.category} onChange={(e) => set({ category: e.target.value })} aria-label="Clause category">
              <option value="">Any</option>
              {meta.categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <label className="check">
              <input type="checkbox" checked={!!f.binding_only} onChange={(e) => set({ binding_only: e.target.checked ? 'true' : '' })} />
              Only resolutions with binding clauses
            </label>
          </fieldset>
          {active.length > 0 && <button type="button" className="btn btn-ghost btn-block" onClick={() => setSp(new URLSearchParams())}>Clear all filters</button>}
        </aside>

        <section className="results" aria-live="polite">
          <div className="results-head">
            <div className="active-chips">
              {active.map(([k, label]) => (
                <button key={k} className="fchip" onClick={() => clearOne(k)} aria-label={`Remove filter ${label}`}>
                  {label} <Icon name="close" size={12} />
                </button>
              ))}
            </div>
            <div className="row">
              <span className="muted">{data ? `${data.total.toLocaleString()} resolutions` : '…'}</span>
              <select value={f.sort || 'newest'} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="most_binding">Most binding</option>
                <option value="most_clauses">Most clauses</option>
              </select>
            </div>
          </div>

          {err ? <ErrorBox error={err} onRetry={() => setSp(new URLSearchParams(sp))} />
            : !data ? <Loading label="Searching" />
            : data.items.length === 0 ? (
              <Empty title="No resolutions match these filters">
                Try removing a filter{active.length ? <> — e.g. <button className="btn btn-link" onClick={() => clearOne(active[active.length - 1][0])}>remove “{active[active.length - 1][1]}”</button></> : ''}.
              </Empty>
            ) : (
              <>
                <ul className="res-list">
                  {data.items.map((r) => (
                    <li key={r.number} className="res-card">
                      <Link to={`/resolution/${r.number}`} className="res-main">
                        <div className="res-top">
                          <span className="sym">{r.symbol}</span>
                          <span className="muted">{r.adopted_on || r.year} · {r.era}</span>
                        </div>
                        <h3>{r.subject}</h3>
                        <div className="res-meta">
                          <span className="region-tag">{r.region}</span>
                          {r.top_category && <CategoryChip category={r.top_category} size="sm" />}
                          <span className="muted">{r.n_clauses} clauses</span>
                          {r.binding_rate != null && (
                            <span className="bindmeter" title={`${pct(r.binding_rate)} of operative clauses are binding`}>
                              <span className="bm-track"><span style={{ width: `${r.binding_rate * 100}%` }} /></span> <small>{pct(r.binding_rate, 0)} binding</small>
                            </span>
                          )}
                          {r.n_clauses === 0 && <span className="muted">no operative clauses extracted</span>}
                        </div>
                      </Link>
                      <button className={`btn btn-icon save ${saved.has(r.number) ? 'on' : ''}`} onClick={() => toggleSave(r)}
                        aria-label={saved.has(r.number) ? `Remove ${r.symbol} from notebook` : `Save ${r.symbol} to notebook`}
                        title={saved.has(r.number) ? 'Saved — click to remove' : 'Save to notebook'}>
                        <Icon name="notebook" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
                <Pager page={data.page} size={data.size} total={data.total} onPage={(p) => set({ page: p }, false)} />
              </>
            )}
        </section>
      </div>
    </div>
  )
}
